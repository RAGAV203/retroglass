"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { cx, GlassButton, GlassToggle } from "@/components/glass/Glass";
import { GlassSheet } from "@/components/glass/GlassSheet";
import { IconExit, IconForward, IconPlay, IconRestart } from "@/components/glass/Icons";
import type { Game } from "@/lib/catalog";
import { db, putSave, setSetting, type SaveState, type Settings } from "@/lib/db";
import { captureScreenshot, getEmulator, setFastForward } from "@/lib/emulator";

const SLOTS = [1, 2, 3, 4];

function Thumb({ save }: { save?: SaveState }) {
  const url = useMemo(() => (save?.screenshot ? URL.createObjectURL(save.screenshot) : undefined), [save?.screenshot]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  if (!save) return <div className="grid aspect-[4/3] place-items-center rounded-xl bg-fg/8 text-[12px] text-fg-3">Empty</div>;
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="aspect-[4/3] w-full rounded-xl bg-black object-cover [image-rendering:pixelated]" />
  ) : (
    <div className="grid aspect-[4/3] place-items-center rounded-xl bg-fg/15 text-[12px]">Saved</div>
  );
}

export function PauseSheet({
  open,
  game,
  onResume,
  onQuit,
  onToast,
  settings,
  onSettings,
}: {
  open: boolean;
  game: Game;
  onResume: () => void;
  onQuit: () => void;
  onToast: (m: string) => void;
  settings?: Settings;
  onSettings: (s: Settings) => void;
}) {
  const [ff, setFf] = useState(false);
  const saves = useLiveQuery(() => db.saves.where("slug").equals(game.slug).toArray(), [game.slug]);
  const bySlot = new Map((saves ?? []).map((s) => [s.slot, s]));

  const save = async (slot: number) => {
    const gm = getEmulator()?.gameManager;
    if (!gm) return;
    try {
      const state = gm.getState();
      const screenshot = await captureScreenshot();
      await putSave({ slug: game.slug, slot, createdAt: Date.now(), state, screenshot });
      onToast(`Saved to slot ${slot}`);
      onResume();
    } catch {
      onToast("This game can't be saved right now");
    }
  };

  const load = (slot: number) => {
    const s = bySlot.get(slot);
    const gm = getEmulator()?.gameManager;
    if (!s || !gm) return;
    try {
      gm.loadState(s.state);
      onToast(`Loaded slot ${slot}`);
      onResume();
    } catch {
      onToast("Couldn't load that save");
    }
  };

  const update = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    if (!settings) return;
    onSettings({ ...settings, [k]: v });
    setSetting(k, v);
  };

  return (
    <GlassSheet open={open} onClose={onResume} title={game.title}>
      <GlassButton variant="tint" size="lg" className="mb-4 w-full" onClick={onResume}>
        <IconPlay width={20} height={20} /> Resume
      </GlassButton>

      <div className="mb-5 grid grid-cols-2 gap-2">
        <GlassButton
          className={cx("w-full", ff && "text-tint")}
          onClick={() => {
            setFastForward(!ff);
            setFf(!ff);
            onToast(ff ? "Normal speed" : "Fast-forward on");
          }}
        >
          <IconForward width={18} height={18} /> {ff ? "1× speed" : "Fast-forward"}
        </GlassButton>
        <GlassButton
          className="w-full"
          onClick={() => {
            getEmulator()?.gameManager?.restart();
            onToast("Restarted");
            onResume();
          }}
        >
          <IconRestart width={18} height={18} /> Restart
        </GlassButton>
      </div>

      <h3 className="mb-2 px-1 text-[13px] font-semibold tracking-wide text-fg-2 uppercase">Save states</h3>
      <div className="mb-5 grid grid-cols-2 gap-3">
        {SLOTS.map((slot) => {
          const s = bySlot.get(slot);
          return (
            <div key={slot} className="rounded-2xl bg-fg/5 p-2">
              <Thumb save={s} />
              <p className="mt-1 px-1 text-[12px] font-semibold">Slot {slot}</p>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <button className="h-8 rounded-full bg-fg/10 text-[13px] font-semibold" onClick={() => save(slot)}>
                  Save
                </button>
                <button
                  className="h-8 rounded-full bg-fg/10 text-[13px] font-semibold disabled:opacity-35"
                  disabled={!s}
                  onClick={() => load(slot)}
                >
                  Load
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {settings && (
        <div className="mb-5 divide-y divide-fg-3/15 overflow-hidden rounded-2xl bg-fg/5">
          <label className="flex items-center justify-between gap-4 px-4 py-3 text-[15px]">
            <span>Touch controls</span>
            <input
              type="range"
              min={0.15}
              max={1}
              step={0.05}
              value={settings.controlsOpacity}
              onChange={(e) => update("controlsOpacity", Number(e.target.value))}
              className="w-40 accent-tint"
              aria-label="Touch controls opacity"
            />
          </label>
          <div className="flex items-center justify-between px-4 py-3 text-[15px]">
            <span>Resume where I left off</span>
            <GlassToggle label="Auto-resume" checked={settings.autoResume} onChange={(v) => update("autoResume", v)} />
          </div>
        </div>
      )}

      <GlassButton className="mb-2 w-full text-[#ff453a]" onClick={onQuit}>
        <IconExit width={18} height={18} /> Quit to Library
      </GlassButton>
    </GlassSheet>
  );
}
