// Offline "packs": emulator runtime, cores and ROMs, downloaded into Cache
// Storage with visible progress. The service worker (app/sw.ts) serves them
// back from any cache whose name starts with PACK_CACHE_PREFIX.

export const PACK_CACHE_PREFIX = "retroglass-packs-";

export type PackFile = { url: string; bytes: number };
export type Pack = { id: string; label: string; files: PackFile[] };
export type PackManifest = { version: string; ejsVersion: string; totalBytes: number; packs: Pack[] };

export type PackStatus = {
  manifest: PackManifest;
  cachedBytes: number;
  totalBytes: number;
  missing: PackFile[];
  perPack: Record<string, { cached: number; total: number }>;
  ready: boolean;
};

export type Progress = { loaded: number; total: number; current?: string };

const cacheName = (version: string) => `${PACK_CACHE_PREFIX}${version}`;

export const offlineSupported = () => typeof window !== "undefined" && "caches" in window;

export async function loadManifest(): Promise<PackManifest> {
  try {
    const res = await fetch("/packs.json", { cache: "no-cache" });
    if (res.ok) return res.json();
  } catch {
    // offline - fall through to the precached copy
  }
  const cached = await caches.match("/packs.json", { ignoreSearch: true });
  if (!cached) throw new Error("Pack manifest unavailable offline");
  return cached.json();
}

export async function getPackStatus(manifest?: PackManifest): Promise<PackStatus> {
  const m = manifest ?? (await loadManifest());
  const cache = await caches.open(cacheName(m.version));
  const missing: PackFile[] = [];
  const perPack: PackStatus["perPack"] = {};
  let cachedBytes = 0;
  for (const p of m.packs) {
    const stat = { cached: 0, total: 0 };
    for (const f of p.files) {
      stat.total += f.bytes;
      if (await cache.match(f.url)) {
        stat.cached += f.bytes;
        cachedBytes += f.bytes;
      } else missing.push(f);
    }
    perPack[p.id] = stat;
  }
  return { manifest: m, cachedBytes, totalBytes: m.totalBytes, missing, perPack, ready: missing.length === 0 };
}

const CONTENT_TYPES: Record<string, string> = {
  js: "text/javascript",
  css: "text/css",
  json: "application/json",
  wasm: "application/wasm",
};

async function fetchInto(cache: Cache, file: PackFile, onBytes: (n: number) => void, signal?: AbortSignal) {
  const res = await fetch(file.url, { cache: "no-cache", signal });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${file.url}`);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
    onBytes(value.length);
  }
  const blob = new Blob(chunks as BlobPart[]);
  const ext = file.url.split(".").pop() ?? "";
  // Rebuild headers: the body is already decoded, so any content-encoding
  // from the network would be wrong. EmulatorJS reads content-length.
  await cache.put(
    file.url,
    new Response(blob, {
      status: 200,
      headers: {
        "content-type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "content-length": String(size),
      },
    }),
  );
}

/** Download every missing file, a few at a time, reporting byte progress. */
export async function downloadPacks(onProgress: (p: Progress) => void, signal?: AbortSignal) {
  const status = await getPackStatus();
  const { manifest } = status;
  const cache = await caches.open(cacheName(manifest.version));
  let loaded = status.cachedBytes;
  const total = status.totalBytes;
  onProgress({ loaded, total });

  const queue = [...status.missing];
  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      const file = f;
      let got = 0;
      try {
        await fetchInto(
          cache,
          file,
          (n) => {
            got += n;
            loaded += n;
            onProgress({ loaded, total, current: file.url });
          },
          signal,
        );
        // Compressed transfer sizes differ from the manifest; snap to it.
        loaded += file.bytes - got;
      } catch (e) {
        loaded -= got;
        throw e;
      }
      onProgress({ loaded, total, current: file.url });
    }
  };
  await Promise.all([worker(), worker(), worker()]);

  // Drop caches from older pack versions (and the SW's on-demand cache).
  for (const key of await caches.keys()) {
    if (key.startsWith(PACK_CACHE_PREFIX) && key !== cacheName(manifest.version)) await caches.delete(key);
  }
  try {
    localStorage.setItem("retroglass:packs", manifest.version);
  } catch {}
  return manifest;
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function storageEstimate() {
  try {
    const est = await navigator.storage?.estimate?.();
    return { usage: est?.usage ?? 0, quota: est?.quota ?? 0 };
  } catch {
    return { usage: 0, quota: 0 };
  }
}

export async function clearPacks() {
  for (const key of await caches.keys()) {
    if (key.startsWith(PACK_CACHE_PREFIX)) await caches.delete(key);
  }
  try {
    localStorage.removeItem("retroglass:packs");
  } catch {}
}
