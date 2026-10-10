"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { spring } from "@/components/glass/Glass";
import { IconPause } from "@/components/glass/Icons";
import { getGame, getSystem } from "@/lib/catalog";
import { db, getSettings, markPlayed, putSave, type Settings } from "@/lib/db";
import { bootEmulator, captureScreenshot, emulatorAlreadyLoaded, flushSram, getEmulator } from "@/lib/emulator";
import { PauseSheet } from "./PauseSheet";

const AUTO_SLOT = 0;

export function Player({ slug }: { slug: string }) {
  const game = getGame(slug)!;
  const system = getSystem(game.system)!;
  const [settings, setSettings] = useState<Settings>();
  const [started, setStarted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string>();
  const booted = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? undefined : t)), 1800);
  }, []);

  // Boot once per document. EmulatorJS can't be torn down cleanly, so a
  // second game in the same document gets a fresh page load instead.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    if (emulatorAlreadyLoaded()) {
      window.location.reload();
      return;
    }
    let cancelled = false;
    (async () => {
      const s = await getSettings();
      if (cancelled) return;
      setSettings(s);
      const slotParam = new URLSearchParams(window.location.search).get("slot");
      bootEmulator({
        game,
        system,
        container: "#game",
        volume: s.volume,
        onStart: async () => {
          setStarted(true);
          markPlayed(game.slug);
          if (slotParam !== null) {
            const save = await db.saves.where({ slug: game.slug, slot: Number(slotParam) }).first();
            if (save) {
              // Give the core a few frames before restoring.
              setTimeout(() => {
                try {
                  getEmulator()?.gameManager?.loadState(save.state);
                  flash(Number(slotParam) === AUTO_SLOT ? "Resumed" : `Loaded slot ${slotParam}`);
                } catch {
                  flash("Couldn't load save");
                }
              }, 400);
            }
          }
        },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [game, system, flash]);

  const autoSave = useCallback(async () => {
    const ejs = getEmulator();
    if (!ejs?.started || !ejs.gameManager) return;
    flushSram();
    if (!(settings ?? (await getSettings())).autoResume) return;
    try {
      const state = ejs.gameManager.getState();
      const screenshot = await captureScreenshot();
      await putSave({ slug: game.slug, slot: AUTO_SLOT, createdAt: Date.now(), state, screenshot });
    } catch {
      // some cores can't snapshot - SRAM was still flushed
    }
  }, [game.slug, settings]);

  const openMenu = useCallback(() => {
    const ejs = getEmulator();
    if (!ejs?.started) return;
    ejs.pause();
    setMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    getEmulator()?.play();
  }, []);

  const quit = useCallback(async () => {
    await autoSave();
    // Full navigation frees the WASM heap (important on iOS).
    window.location.assign(`/`);
  }, [autoSave]);

  // Background/close: persist progress. iOS may kill a backgrounded PWA.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") autoSave();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", autoSave);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", autoSave);
    };
  }, [autoSave]);

  // Escape / gamepad Home button opens the menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !menuOpen) openMenu();
    };
    window.addEventListener("keydown", onKey);
    let wasDown = false;
    const id = window.setInterval(() => {
      const pads = navigator.getGamepads?.() ?? [];
      const down = pads.some((p) => p?.buttons[16]?.pressed);
      if (down && !wasDown && !menuOpen) openMenu();
      wasDown = down;
    }, 120);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearInterval(id);
    };
  }, [menuOpen, openMenu]);

  // Light haptic tick on virtual buttons (Android; iOS Safari has no vibrate API).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !settings?.haptics || !("vibrate" in navigator)) return;
    const onTouch = (e: TouchEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(".ejs_virtualGamepad_button, .ejs_dpad_main")) navigator.vibrate(8);
    };
    el.addEventListener("touchstart", onTouch, { passive: true });
    return () => el.removeEventListener("touchstart", onTouch);
  }, [settings?.haptics]);

  return (
    <div
      ref={rootRef}
      className="player-root"
      style={{ ["--controls-opacity" as string]: settings?.controlsOpacity ?? 0.7 }}
    >
      <div id="game" className="absolute inset-0" />

      <AnimatePresence>
        {started && !menuOpen && (
          <motion.button
            key="menu"
            aria-label="Pause menu"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileTap={{ scale: 0.85 }}
            transition={spring}
            onClick={openMenu}
            className="absolute z-20 grid size-11 place-items-center rounded-full bg-white/12 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_8px_24px_-8px_rgb(0_0_0/0.6)] backdrop-blur-xl"
            style={{
              top: "max(env(safe-area-inset-top), 12px)",
              left: "max(env(safe-area-inset-left), 12px)",
            }}
          >
            <IconPause width={18} height={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {!started && (
        <div className="pointer-events-none absolute inset-x-0 z-10 text-center text-white" style={{ top: "max(env(safe-area-inset-top), 24px)" }}>
          <p className="text-[13px] font-semibold tracking-wide text-white/60 uppercase">{system.name}</p>
          <p className="text-[22px] font-bold tracking-tight">{game.title}</p>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-[14px] font-semibold text-white backdrop-blur-xl"
            style={{ top: "max(env(safe-area-inset-top), 14px)" }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <PauseSheet
        open={menuOpen}
        game={game}
        onResume={closeMenu}
        onQuit={quit}
        onToast={flash}
        settings={settings}
        onSettings={setSettings}
      />
    </div>
  );
}
