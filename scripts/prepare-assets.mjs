#!/usr/bin/env node
// Builds everything the app serves offline:
//   1. validates content/games.json (every game must carry a license + source)
//   2. downloads each ROM from its upstream release, verifies sha256, extracts
//   3. vendors the pinned EmulatorJS runtime + only the cores we actually need
//   4. writes lib/generated/catalog.json and public/packs.json
//
// Run with `npm run assets` (also runs automatically before dev/build).

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, unzipSync, zipSync } from "fflate";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = (...p) => path.join(root, ...p);

const CACHE_DIR = r("node_modules", ".cache", "retroglass-roms");
const EJS_PKG = r("node_modules", "@emulatorjs", "emulatorjs");
const PUBLIC_EJS = r("public", "emulatorjs");
const PUBLIC_ROMS = r("public", "roms");
const GENERATED = r("lib", "generated");

// Same order as EmulatorJS's loader.js debug path.
const EJS_SCRIPTS = [
  "emulator.js",
  "nipplejs.js",
  "shaders.js",
  "storage.js",
  "gamepad.js",
  "GameManager.js",
  "socket.io.min.js",
  "compression.js",
];

const SPDX_OK = /^[A-Za-z0-9.+-]+( (AND|OR) [A-Za-z0-9.+-]+)*$/;

// Core file names EmulatorJS requests: <core>[-thread][-legacy]-wasm.data
const VARIANT_SUFFIX = { webgl2: "", legacy: "-legacy", thread: "-thread" };
const coreFileNames = (c) => [
  ...c.variants.map((v) => `${c.name}${VARIANT_SUFFIX[v]}-wasm.data`),
  ...(c.files ?? []), // extra per-core assets, e.g. ppsspp-assets.zip
];

/** Minimal ustar reader: returns { path: Uint8Array } for regular files. */
function untar(buf) {
  const files = {};
  let off = 0;
  const str = (a, b) => new TextDecoder().decode(buf.subarray(a, b)).split("\u0000")[0];
  while (off + 512 <= buf.length) {
    const name = str(off, off + 100);
    if (!name) break;
    const size = parseInt(str(off + 124, off + 136).trim() || "0", 8);
    const type = str(off + 156, off + 157);
    const prefix = str(off + 345, off + 500);
    const full = prefix ? `${prefix}/${name}` : name;
    if (type === "0" || type === "") files[full] = buf.slice(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

async function readJson(p) {
  return JSON.parse(await readFile(p, "utf8"));
}

function validate(systems, games) {
  const systemIds = new Set(systems.map((s) => s.id));
  const slugs = new Set();
  const required = ["slug", "title", "system", "author", "description", "license", "sourceUrl", "download", "file"];
  for (const g of games) {
    for (const k of required) {
      if (!g[k]) fail(`games.json: "${g.slug ?? "?"}" is missing required field "${k}"`);
    }
    if (!SPDX_OK.test(g.license)) fail(`games.json: "${g.slug}" has a non-SPDX license "${g.license}"`);
    if (!/^https:\/\//.test(g.sourceUrl)) fail(`games.json: "${g.slug}" sourceUrl must be https`);
    if (!/^[a-f0-9]{64}$/.test(g.download.sha256 ?? "")) fail(`games.json: "${g.slug}" needs a pinned sha256`);
    if (!/^[a-z0-9-]+$/.test(g.slug)) fail(`games.json: slug "${g.slug}" must be kebab-case`);
    if (slugs.has(g.slug)) fail(`games.json: duplicate slug "${g.slug}"`);
    if (!systemIds.has(g.system)) fail(`games.json: "${g.slug}" references unknown system "${g.system}"`);
    const sys = systems.find((s) => s.id === g.system);
    if (!sys.cores.length) fail(`games.json: "${g.slug}" targets "${g.system}" which ships no cores`);
    slugs.add(g.slug);
  }
}

async function fetchVerified(url, expected) {
  const cached = path.join(CACHE_DIR, expected);
  if (existsSync(cached)) {
    const buf = await readFile(cached);
    if (sha256(buf) === expected) return buf;
  }
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) fail(`download failed (${res.status}) ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const got = sha256(buf);
  if (got !== expected) fail(`sha256 mismatch for ${url}\n  expected ${expected}\n  got      ${got}`);
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cached, buf);
  return buf;
}

async function buildRoms(games) {
  await rm(PUBLIC_ROMS, { recursive: true, force: true });
  const out = [];
  for (const g of games) {
    let buf = await fetchVerified(g.download.url, g.download.sha256);
    if (g.download.extract) {
      const entries = unzipSync(new Uint8Array(buf));
      const entry = entries[g.download.extract];
      if (!entry) fail(`"${g.slug}": "${g.download.extract}" not found in archive`);
      buf = Buffer.from(entry);
    } else if (g.download.repack) {
      // PSP homebrew is a folder (EBOOT.PBP + data). Normalize any archive
      // layout to "<slug>/EBOOT.PBP ..." in a zip, which is
      // what PPSSPP boots reliably (nested PSP/GAME/... paths don't).
      const all =
        g.download.repack === "tar.gz" ? untar(gunzipSync(new Uint8Array(buf))) : unzipSync(new Uint8Array(buf));
      const eboot = Object.keys(all).find((p) => /(^|\/)EBOOT\.PBP$/i.test(p));
      if (!eboot) fail(`"${g.slug}": no EBOOT.PBP in archive`);
      const base = eboot.slice(0, eboot.length - "EBOOT.PBP".length);
      const files = {};
      for (const [p, data] of Object.entries(all)) {
        if (p.startsWith(base) && !p.endsWith("/")) files[`${g.slug}/${p.slice(base.length)}`] = data;
      }
      buf = Buffer.from(zipSync(files, { level: 6 }));
    }
    const rel = `roms/${g.system}/${g.file}`;
    await mkdir(path.dirname(r("public", rel)), { recursive: true });
    await writeFile(r("public", rel), buf);
    out.push({ ...g, rom: `/${rel}`, bytes: buf.length });
    console.log(`  ✓ ${g.system.padEnd(9)} ${g.title}`);
  }
  return out;
}

async function listFiles(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(full, base)));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

async function vendorEmulatorJS(systems) {
  const pkg = await readJson(path.join(EJS_PKG, "package.json"));
  await rm(PUBLIC_EJS, { recursive: true, force: true });
  const dataOut = path.join(PUBLIC_EJS, "data");
  await mkdir(path.join(dataOut, "cores", "reports"), { recursive: true });

  const src = path.join(EJS_PKG, "data");
  await cp(path.join(src, "loader.js"), path.join(dataOut, "loader.js"));
  await cp(path.join(src, "version.json"), path.join(dataOut, "version.json"));
  await cp(path.join(src, "compression"), path.join(dataOut, "compression"), {
    recursive: true,
    filter: (f) => !f.endsWith(".md"),
  });
  // The npm package ships no minified bundle; concatenating the sources in
  // loader order gives the same globals without EJS's debug mode.
  const bundle = await Promise.all(EJS_SCRIPTS.map((f) => readFile(path.join(src, "src", f), "utf8")));
  await writeFile(path.join(dataOut, "emulator.min.js"), bundle.join("\n;\n"));
  await cp(path.join(src, "emulator.css"), path.join(dataOut, "emulator.min.css"));

  const coreFiles = new Map(); // core name -> { variants, files }
  for (const s of systems) {
    for (const c of s.cores) {
      const entry = coreFiles.get(c.name) ?? { variants: [], files: [] };
      entry.variants = [...new Set([...entry.variants, ...c.variants])];
      entry.files = [...new Set([...entry.files, ...(c.files ?? [])])];
      coreFiles.set(c.name, entry);
    }
  }
  for (const [core, spec] of coreFiles) {
    const corePkg = r("node_modules", "@emulatorjs", `core-${core}`);
    if (!existsSync(corePkg)) fail(`missing core package @emulatorjs/core-${core} (add it to devDependencies)`);
    const v = (await readJson(path.join(corePkg, "package.json"))).version;
    if (v !== pkg.version) fail(`@emulatorjs/core-${core}@${v} does not match emulatorjs@${pkg.version}`);
    for (const name of coreFileNames({ name: core, ...spec })) {
      if (!existsSync(path.join(corePkg, name))) fail(`@emulatorjs/core-${core} has no ${name}`);
      await cp(path.join(corePkg, name), path.join(dataOut, "cores", name));
    }
    await cp(path.join(corePkg, "reports", `${core}.json`), path.join(dataOut, "cores", "reports", `${core}.json`));
  }
  console.log(`  ✓ EmulatorJS ${pkg.version} + ${coreFiles.size} cores`);
  return pkg.version;
}

async function sizeOf(urlPath) {
  return (await stat(r("public", urlPath.slice(1)))).size;
}

async function buildPacks(systems, games, ejsVersion) {
  const runtimeFiles = (await listFiles(path.join(PUBLIC_EJS, "data")))
    .filter((f) => !f.startsWith("cores/"))
    .map((f) => `/emulatorjs/data/${f}`);

  const packs = [];
  const runtime = [];
  for (const url of runtimeFiles) runtime.push({ url, bytes: await sizeOf(url) });
  packs.push({ id: "runtime", label: "Emulator runtime", files: runtime });

  const seen = new Set(); // systems can share a core (GB/GBC) - download it once
  for (const s of systems) {
    const sysGames = games.filter((g) => g.system === s.id);
    if (!sysGames.length) continue;
    const urls = [];
    for (const c of s.cores) {
      urls.push(`/emulatorjs/data/cores/reports/${c.name}.json`);
      for (const name of coreFileNames(c)) urls.push(`/emulatorjs/data/cores/${name}`);
    }
    for (const g of sysGames) urls.push(g.rom);
    const files = [];
    for (const url of urls.filter((u) => !seen.has(u))) {
      seen.add(url);
      files.push({ url, bytes: await sizeOf(url) });
    }
    packs.push({ id: s.id, label: s.name, files });
  }

  // Version = hash of every file's content, so any change re-downloads.
  const h = createHash("sha256");
  for (const p of packs) {
    for (const f of p.files) h.update(f.url).update(await readFile(r("public", f.url.slice(1))));
  }
  const version = h.digest("hex").slice(0, 12);
  const totalBytes = packs.reduce((n, p) => n + p.files.reduce((m, f) => m + f.bytes, 0), 0);
  await writeFile(r("public", "packs.json"), JSON.stringify({ version, ejsVersion, totalBytes, packs }, null, 2));
  console.log(`  ✓ packs.json v${version} (${(totalBytes / 1048576).toFixed(1)} MB)`);
  return { version, totalBytes };
}

async function main() {
  console.log("RetroGlass · preparing offline assets");
  const systems = await readJson(r("content", "systems.json"));
  const games = await readJson(r("content", "games.json"));
  validate(systems, games);
  console.log(`  ✓ ${games.length} games validated (license + source + sha256)`);

  const built = await buildRoms(games);
  const ejsVersion = await vendorEmulatorJS(systems);
  const packs = await buildPacks(systems, built, ejsVersion);

  await mkdir(GENERATED, { recursive: true });
  const catalog = {
    packsVersion: packs.version,
    totalBytes: packs.totalBytes,
    ejsVersion,
    systems: systems.map((s) => {
      const out = { ...s, gameCount: built.filter((g) => g.system === s.id).length };
      delete out.cores; // build-time only
      return out;
    }),
    games: built.map((g) => {
      const out = { ...g, upstream: g.download.url, sha256: g.download.sha256 };
      delete out.download;
      delete out.file;
      return out;
    }),
  };
  await writeFile(path.join(GENERATED, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
  console.log("  ✓ lib/generated/catalog.json");
}

main().catch((e) => fail(e.stack ?? String(e)));
