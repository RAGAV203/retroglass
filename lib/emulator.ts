// Thin, typed wrapper around EmulatorJS's global-variable configuration.
// EmulatorJS is a classic script that reads `window.EJS_*` and creates
// `window.EJS_emulator`; it is designed for one emulator per document.

import type { Game, System } from "./catalog";

export const EJS_DATA_PATH = "/emulatorjs/data/";

type EJSGameManager = {
  getState(): Uint8Array;
  loadState(state: Uint8Array): void;
  saveSaveFiles(): void;
  restart(): void;
  toggleFastForward?(on: 0 | 1): void;
  functions: { toggleFastForward(on: number): void };
};

export type EJSInstance = {
  started: boolean;
  paused: boolean;
  gameManager?: EJSGameManager;
  canvas?: HTMLCanvasElement;
  play(dontUpdate?: boolean): void;
  pause(dontUpdate?: boolean): void;
  setVolume?(v: number): void;
  callEvent(name: string, data?: unknown): number;
  on(name: string, cb: (...args: unknown[]) => void): void;
  displayMessage?(msg: string, ms?: number): void;
  takeScreenshot?(source: string, format: string, upscale: number): Promise<{ blob: Blob; format: string }>;
};

declare global {
  interface Window {
    EmulatorJS?: unknown;
    EJS_emulator?: EJSInstance;
    [key: `EJS_${string}`]: unknown;
  }
}

// Every built-in EmulatorJS toolbar button is hidden; RetroGlass provides
// its own glass pause sheet instead.
const HIDDEN_BUTTONS = [
  "playPause", "play", "pause", "restart", "mute", "unmute", "settings", "fullscreen",
  "enterFullscreen", "exitFullscreen", "saveState", "loadState", "screenRecord", "gamepad",
  "cheat", "volumeSlider", "saveSavFiles", "loadSavFiles", "quickSave", "quickLoad",
  "screenshot", "cacheManager", "exitEmulation", "netplay", "diskButton", "contextMenu", "volume",
];

export type BootOptions = {
  game: Game;
  system: System;
  container: string; // CSS selector
  volume: number;
  onReady?: () => void;
  onStart?: () => void;
};

/** True when this document already ran EmulatorJS (needs a fresh page load). */
export const emulatorAlreadyLoaded = () => typeof window !== "undefined" && !!window.EJS_emulator;

export function bootEmulator(opts: BootOptions) {
  const { game, system } = opts;
  const w = window;
  w.EJS_player = opts.container;
  w.EJS_core = system.ejsSystem;
  w.EJS_gameUrl = game.rom;
  w.EJS_gameName = game.slug;
  w.EJS_gameID = game.slug;
  w.EJS_pathtodata = EJS_DATA_PATH;
  w.EJS_language = "en-US";
  w.EJS_disableAutoLang = false;
  w.EJS_startOnLoaded = false; // the start tap doubles as the iOS audio unlock
  w.EJS_color = "#0a84ff";
  w.EJS_backgroundColor = "#000000";
  w.EJS_volume = opts.volume;
  w.EJS_Buttons = Object.fromEntries(HIDDEN_BUTTONS.map((b) => [b, false]));
  w.EJS_CacheLimit = 0; // ROMs already live in our pack cache; don't duplicate into EJS's IndexedDB
  w.EJS_defaultOptions = { "save-save-interval": "30" }; // flush in-game SRAM every 30s
  w.EJS_ready = () => opts.onReady?.();
  w.EJS_onGameStart = () => opts.onStart?.();

  const script = document.createElement("script");
  script.src = `${EJS_DATA_PATH}loader.js`;
  script.async = true;
  document.body.appendChild(script);
}

export const getEmulator = () => (typeof window === "undefined" ? undefined : window.EJS_emulator);

export async function captureScreenshot(): Promise<Blob | undefined> {
  const ejs = getEmulator();
  if (!ejs?.takeScreenshot) return undefined;
  try {
    const shot = await Promise.race([
      ejs.takeScreenshot("canvas", "jpeg", 1),
      new Promise<undefined>((r) => setTimeout(() => r(undefined), 1500)),
    ]);
    return shot?.blob;
  } catch {
    return undefined;
  }
}

/** Persist battery saves (SRAM) to EmulatorJS's IDBFS mount. */
export function flushSram() {
  try {
    getEmulator()?.gameManager?.saveSaveFiles();
  } catch {
    // core not running yet
  }
}

export function setFastForward(on: boolean) {
  try {
    getEmulator()?.gameManager?.functions.toggleFastForward(on ? 1 : 0);
  } catch {
    // ignore
  }
}
