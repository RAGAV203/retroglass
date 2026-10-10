# RetroGlass

An installable, **fully offline** retro game emulator for the web. The interface follows Apple's Liquid Glass style, it runs on [EmulatorJS](https://github.com/EmulatorJS/EmulatorJS) (libretro cores compiled to WebAssembly), and it's built as a static Next.js site that deploys to Vercel.

- **Pre-loaded games.** RetroGlass ships with 12 openly licensed homebrew games across 8 consoles. On first launch it downloads everything (about 37 MB) into the device's cache, with progress shown.
- **Works in Airplane Mode.** The app shell, every page, the emulator runtime, the cores and the ROMs are all served by a service worker.
- **iOS-first.** Add it to the Home Screen and it runs full screen with safe-area aware layout, splash screens, glass touch controls and MFi/Xbox/PlayStation controller support.
- **Saves.** Four save-state slots per game with screenshots, plus auto-resume and in-game battery saves. All saves stay on the device in IndexedDB.
- **Trusted.** No ads, analytics, accounts or third-party requests. Every ROM is pinned by SHA-256 and every license is checked at build time.

## Consoles

| Ready | Coming soon (no verified legal games yet) |
| --- | --- |
| NES · Game Boy · Game Boy Color · GBA · N64 · Master System · Genesis · Atari 2600 | SNES · Nintendo DS · Game Gear · Atari 7800 · PC Engine · PlayStation · Arcade |

See **Settings → Games & licenses** in the app, or [`content/games.json`](content/games.json), for each game's author, license and source.

> RetroGlass will never bundle commercial ROMs or BIOS files. To suggest a game, see [CONTRIBUTING.md](CONTRIBUTING.md).

## How it works

```
content/games.json ──► scripts/prepare-assets.mjs ──► public/roms/**            (verified ROMs)
content/systems.json                              ├─► public/emulatorjs/data/** (pinned EmulatorJS + only the cores used)
                                                  ├─► public/packs.json         (offline pack manifest)
                                                  └─► lib/generated/catalog.json
```

- **`lib/offline.ts`** downloads every pack into a versioned Cache Storage bucket and reports byte progress. **`app/sw.ts`** (Serwist) serves packs and precached pages.
- **`lib/emulator.ts`** configures EmulatorJS through its `EJS_*` globals and hides its toolbar. The glass pause sheet in **`components/player/`** calls `gameManager.getState()` and `loadState()` for save slots.
- **`components/glass/`** holds the Liquid Glass primitives: layered backdrop blur, a specular sheen, a rim light, and an SVG displacement "refraction" filter on Chromium. Safari falls back to blur, and the effects respect reduced transparency and reduced motion.

## Development

```bash
npm install
npm run dev          # http://localhost:3000 (service worker disabled in dev)
npm run build        # static export to out/
npm start            # serve out/ with the service worker
```

Requires Node 20 or later. The first `npm run assets` downloads the ROMs from their upstream releases and caches them in `node_modules/.cache`.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel. The framework preset is detected from `vercel.json`.
2. Optional: set `NEXT_PUBLIC_REPO_URL` (for example `https://github.com/you/retroglass`) to show a source link in the app.
3. Deploy. The build fetches and verifies the ROMs, then exports static files. No server functions are used.

## License

RetroGlass is free software under the **GNU GPL v3.0 or later** (see [LICENSE](LICENSE)), the same license as EmulatorJS.

The bundled games keep their own licenses, listed in `content/games.json` with links to their source code. *Nova the Squirrel* and *Blind Jump* carry non-commercial asset terms; remove them before any commercial use.

Nintendo, Sega, Sony, Atari and NEC are trademarks of their respective owners. This project is not affiliated with or endorsed by them.
