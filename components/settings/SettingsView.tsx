"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { cx, GlassButton, GlassToggle, spring } from "@/components/glass/Glass";
import { LargeTitle } from "@/components/library/Library";
import { OfflinePill } from "@/components/offline/OfflinePill";
import { useOffline } from "@/components/offline/OfflineProvider";
import { catalog, formatBytes, games, getSystem } from "@/lib/catalog";
import { db, defaultSettings, getSettings, setSetting, type Settings } from "@/lib/db";
import { clearPacks, requestPersistence, storageEstimate } from "@/lib/offline";
import { repoUrl } from "@/lib/site";

function Group({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="mt-7 px-safe">
      <h2 className="mb-2 px-4 text-[13px] font-semibold tracking-wide text-fg-2 uppercase">{title}</h2>
      <div className="glass divide-y divide-fg-3/15 overflow-hidden rounded-[24px]">{children}</div>
      {footer && <p className="mt-2 px-4 text-[13px] text-fg-2">{footer}</p>}
    </section>
  );
}

function Row({ label, children, detail }: { label: string; children?: ReactNode; detail?: string }) {
  return (
    <div className="flex min-h-[50px] items-center justify-between gap-4 px-4 py-2.5 text-[16px]">
      <div className="min-w-0">
        <p>{label}</p>
        {detail && <p className="text-[13px] text-fg-2">{detail}</p>}
      </div>
      {children}
    </div>
  );
}

type Theme = "system" | "light" | "dark";

function ThemePicker() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    try {
      const t = localStorage.getItem("retroglass:theme");
      if (t === "light" || t === "dark") setTheme(t);
    } catch {}
  }, []);
  const choose = (t: Theme) => {
    setTheme(t);
    const el = document.documentElement;
    if (t === "system") delete el.dataset.theme;
    else el.dataset.theme = t;
    try {
      if (t === "system") localStorage.removeItem("retroglass:theme");
      else localStorage.setItem("retroglass:theme", t);
    } catch {}
  };
  return (
    <div className="relative flex rounded-full bg-fg/8 p-0.5" role="radiogroup" aria-label="Theme">
      {(["system", "light", "dark"] as Theme[]).map((t) => (
        <button
          key={t}
          role="radio"
          aria-checked={theme === t}
          onClick={() => choose(t)}
          className="relative h-8 px-3 text-[13px] font-semibold capitalize"
        >
          {theme === t && (
            <motion.span layoutId="theme-pill" transition={spring} className="glass glass-strong absolute inset-0 rounded-full" />
          )}
          <span className="relative">{t}</span>
        </button>
      ))}
    </div>
  );
}

export function SettingsView() {
  const { status, downloading, start, refresh } = useOffline();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [est, setEst] = useState<{ usage: number; quota: number }>();
  const [persisted, setPersisted] = useState<boolean>();
  const saveCount = useLiveQuery(() => db.saves.count(), []);

  useEffect(() => {
    getSettings().then(setSettings);
    storageEstimate().then(setEst);
    navigator.storage?.persisted?.().then(setPersisted).catch(() => {});
  }, [status]);

  const update = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setSettings((s) => ({ ...s, [k]: v }));
    setSetting(k, v);
  };

  return (
    <main className="pb-36">
      <LargeTitle title="Settings" subtitle="RetroGlass" trailing={<OfflinePill />} />

      <Group
        title="Offline library"
        footer="Games and emulator cores are stored in this browser's cache. Persistent storage asks the browser not to evict them when space runs low."
      >
        <Row
          label="Downloaded"
          detail={status ? `${formatBytes(status.cachedBytes)} of ${formatBytes(status.totalBytes)}` : "Checking…"}
        >
          <span className={cx("text-[15px] font-semibold", status?.ready ? "text-[#30d158]" : "text-fg-2")}>
            {status?.ready ? "Ready" : downloading ? "Downloading" : "Incomplete"}
          </span>
        </Row>
        {est && est.quota > 0 && (
          <Row label="Storage used" detail={`${formatBytes(est.usage)} of ${formatBytes(est.quota)} available to this app`} />
        )}
        <Row label="Persistent storage" detail={persisted ? "Protected from automatic cleanup" : "Browser may evict data"}>
          {!persisted && (
            <GlassButton size="sm" onClick={async () => setPersisted(await requestPersistence())}>
              Request
            </GlassButton>
          )}
        </Row>
        <div className="flex gap-2 px-4 py-3">
          <GlassButton size="sm" variant="tint" disabled={downloading || status?.ready} onClick={start}>
            {status?.ready ? "Up to date" : "Download all"}
          </GlassButton>
          <GlassButton
            size="sm"
            className="text-[#ff453a]"
            disabled={downloading}
            onClick={async () => {
              if (!confirm("Remove all downloaded games and cores? Save states are kept.")) return;
              await clearPacks();
              await refresh();
            }}
          >
            Remove downloads
          </GlassButton>
        </div>
      </Group>

      <Group title="Controls">
        <Row label="Touch controls opacity">
          <input
            type="range"
            min={0.15}
            max={1}
            step={0.05}
            value={settings.controlsOpacity}
            onChange={(e) => update("controlsOpacity", Number(e.target.value))}
            className="w-36 accent-tint"
            aria-label="Touch controls opacity"
          />
        </Row>
        <Row label="Volume">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => update("volume", Number(e.target.value))}
            className="w-36 accent-tint"
            aria-label="Volume"
          />
        </Row>
        <Row label="Haptic feedback" detail="Where the device supports vibration">
          <GlassToggle label="Haptic feedback" checked={settings.haptics} onChange={(v) => update("haptics", v)} />
        </Row>
        <Row label="Resume where I left off" detail="Auto-save when you quit or leave the app">
          <GlassToggle label="Auto-resume" checked={settings.autoResume} onChange={(v) => update("autoResume", v)} />
        </Row>
      </Group>

      <Group title="Appearance">
        <Row label="Theme">
          <ThemePicker />
        </Row>
      </Group>

      <Group title="Saves">
        <Row label="Save states" detail="Stored only on this device">
          <span className="text-fg-2 tabular-nums">{saveCount ?? "–"}</span>
        </Row>
        <div className="px-4 py-3">
          <GlassButton
            size="sm"
            className="text-[#ff453a]"
            disabled={!saveCount}
            onClick={async () => {
              if (confirm("Delete every save state? In-game battery saves are not affected.")) await db.saves.clear();
            }}
          >
            Delete all save states
          </GlassButton>
        </div>
      </Group>

      <Group
        title="Games & licenses"
        footer="Every bundled game is homebrew whose license allows redistribution. Titles marked NC may not be used commercially."
      >
        {games.map((g) => (
          <a
            key={g.slug}
            href={g.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{g.title}</p>
              <p className="truncate text-[12px] text-fg-2">
                {getSystem(g.system)?.shortName} · {g.author}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-fg/8 px-2 py-0.5 font-mono text-[11px]">
              {g.license.split(" ")[0]}
              {g.nonCommercial ? " · NC" : ""}
            </span>
          </a>
        ))}
      </Group>

      <Group title="About">
        <Row label="Emulation" detail={`EmulatorJS ${catalog.ejsVersion} · libretro cores · GPL-3.0`}>
          <a href="https://github.com/EmulatorJS/EmulatorJS" target="_blank" rel="noreferrer" className="text-tint">
            ↗
          </a>
        </Row>
        <Row label="RetroGlass" detail={`Free software · GPL-3.0-or-later · packs ${catalog.packsVersion}`}>
          {repoUrl && (
            <a href={repoUrl} target="_blank" rel="noreferrer" className="text-[15px] font-semibold text-tint">
              Source ↗
            </a>
          )}
        </Row>
        <Row
          label="Not affiliated"
          detail="Nintendo, Sega, Sony, Atari and NEC are trademarks of their owners. RetroGlass ships no commercial games or BIOS files."
        />
      </Group>
    </main>
  );
}
