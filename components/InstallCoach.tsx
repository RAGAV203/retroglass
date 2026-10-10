"use client";

import { useEffect, useState } from "react";
import { GlassButton } from "./glass/Glass";
import { GlassSheet } from "./glass/GlassSheet";
import { IconShare } from "./glass/Icons";

const KEY = "retroglass:install-coach";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Explains "Add to Home Screen" on iOS Safari; uses the native prompt elsewhere. */
export function InstallCoach() {
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent>();

  useEffect(() => {
    if (isStandalone()) return;
    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(KEY) ?? 0);
    } catch {}
    const recentlyDismissed = Date.now() - dismissedAt < 7 * 24 * 3600 * 1000;

    if (isIOS()) {
      setIos(true);
      if (!recentlyDismissed) {
        const t = setTimeout(() => setOpen(true), 2500);
        return () => clearTimeout(t);
      }
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (!recentlyDismissed) setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {}
  };

  return (
    <GlassSheet open={open} onClose={close} title="Install RetroGlass">
      <div className="mx-auto mb-4 grid size-20 place-items-center rounded-[22px] bg-[linear-gradient(135deg,#0a84ff,#bf5af2)] text-4xl shadow-lg">
        🎮
      </div>
      <p className="mb-5 text-center text-[15px] text-fg-2">
        Add RetroGlass to your Home Screen for full-screen play, controller support and a library that works in Airplane
        Mode.
      </p>
      {ios ? (
        <ol className="mb-5 space-y-3 rounded-2xl bg-fg/5 p-4 text-[15px]">
          <li className="flex items-center gap-3">
            <span className="grid size-7 place-items-center rounded-full bg-tint text-[13px] font-bold text-white">1</span>
            Tap <IconShare width={20} height={20} className="text-tint" /> Share in Safari
          </li>
          <li className="flex items-center gap-3">
            <span className="grid size-7 place-items-center rounded-full bg-tint text-[13px] font-bold text-white">2</span>
            Choose <b>Add to Home Screen</b>
          </li>
          <li className="flex items-center gap-3">
            <span className="grid size-7 place-items-center rounded-full bg-tint text-[13px] font-bold text-white">3</span>
            Open RetroGlass from your Home Screen
          </li>
        </ol>
      ) : (
        <GlassButton
          variant="tint"
          className="mb-3 w-full"
          onClick={async () => {
            await deferred?.prompt();
            close();
          }}
        >
          Install app
        </GlassButton>
      )}
      <GlassButton variant="plain" className="w-full" onClick={close}>
        Not now
      </GlassButton>
    </GlassSheet>
  );
}
