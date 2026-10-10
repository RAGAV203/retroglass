"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { GlassButton, spring } from "@/components/glass/Glass";
import { GlassSheet } from "@/components/glass/GlassSheet";
import { IconCloudCheck, IconDownload } from "@/components/glass/Icons";
import { formatBytes } from "@/lib/catalog";
import { useOffline } from "./OfflineProvider";

function Ring({ value }: { value: number }) {
  const r = 8;
  const c = 2 * Math.PI * r;
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90" aria-hidden>
      <circle cx="10" cy="10" r={r} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <motion.circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={c}
        animate={{ strokeDashoffset: c * (1 - value) }}
        transition={spring}
      />
    </svg>
  );
}

/** Header status: "Offline ready" or live download progress; tap for details. */
export function OfflinePill() {
  const { status, progress, downloading, error, online, start } = useOffline();
  const [open, setOpen] = useState(false);
  if (!status) return null;

  const total = status.totalBytes;
  const loaded = downloading && progress ? progress.loaded : status.cachedBytes;
  const pct = total ? loaded / total : 0;

  let label: string;
  if (status.ready && !downloading) label = "Offline ready";
  else if (downloading) label = `${Math.floor(pct * 100)}%`;
  else if (error) label = "Retry download";
  else label = online ? "Download games" : "Offline";

  return (
    <>
      <GlassButton size="sm" onClick={() => setOpen(true)} aria-label={`Offline status: ${label}`}>
        {status.ready && !downloading ? (
          <IconCloudCheck width={18} height={18} className="text-[#30d158]" />
        ) : downloading ? (
          <span className="text-tint">
            <Ring value={pct} />
          </span>
        ) : (
          <IconDownload width={18} height={18} />
        )}
        <span className="tabular-nums">{label}</span>
      </GlassButton>

      <GlassSheet open={open} onClose={() => setOpen(false)} title="Offline Library">
        <p className="mb-4 text-center text-[15px] text-fg-2">
          Every game, emulator core and the app itself is stored on this device, so RetroGlass works with no
          connection at all.
        </p>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-fg-3/25">
          <motion.div className="h-full rounded-full bg-tint" animate={{ width: `${pct * 100}%` }} transition={spring} />
        </div>
        <p className="mb-5 text-center text-[13px] tabular-nums text-fg-2">
          {formatBytes(loaded)} of {formatBytes(total)}
        </p>
        <ul className="mb-5 divide-y divide-fg-3/20 overflow-hidden rounded-2xl bg-fg/5">
          {status.manifest.packs.map((p) => {
            const s = status.perPack[p.id];
            const done = s && s.cached >= s.total;
            return (
              <li key={p.id} className="flex items-center justify-between px-4 py-2.5 text-[15px]">
                <span>{p.label}</span>
                <span className={done ? "text-[#30d158]" : "text-fg-3"}>
                  {done ? "✓" : formatBytes(s?.total ?? 0)}
                </span>
              </li>
            );
          })}
        </ul>
        {error && <p className="mb-3 text-center text-[13px] text-[#ff453a]">{error}</p>}
        {!status.ready && (
          <GlassButton variant="tint" className="w-full" disabled={downloading || !online} onClick={start}>
            {downloading ? "Downloading…" : online ? "Download everything" : "Connect to download"}
          </GlassButton>
        )}
      </GlassSheet>
    </>
  );
}
