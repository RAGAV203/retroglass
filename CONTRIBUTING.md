# Contributing

## Adding a game

RetroGlass only ships games that can **legally be redistributed by anyone**. This rule doesn't bend: no commercial ROMs, no BIOS dumps, and no "free on our site only" collections such as MAME's free ROM page or retrobrews.

A game can be added when all of these are true:

1. It's homebrew or otherwise original work, not a hack of a commercial game, and it doesn't use another company's characters or assets.
2. Its license lets anyone redistribute the ROM, for example MIT, Zlib, Apache-2.0, BSD, GPL, CC0, CC-BY or CC-BY-SA. Non-commercial licenses (CC-BY-NC-*) are accepted only with `"nonCommercial": true`.
3. The license covers the **assets** as well as the code. Check the README for art and music terms.
4. The ROM is downloadable from a stable upstream URL, ideally a tagged GitHub release.

Then add an entry to [`content/games.json`](content/games.json):

```jsonc
{
  "slug": "my-game",                  // kebab-case, unique
  "title": "My Game",
  "system": "nes",                    // id from content/systems.json
  "author": "Jane Doe",
  "genre": "Puzzle",
  "description": "One sentence.",
  "license": "MIT",                   // SPDX expression
  "licenseNote": "Optional detail, e.g. asset terms.",
  "nonCommercial": false,
  "sourceUrl": "https://github.com/jane/my-game/tree/v1.0",
  "download": {
    "url": "https://github.com/jane/my-game/releases/download/v1.0/my-game.nes",
    "sha256": "<sha256 of the downloaded file>",
    "extract": "my-game.nes",         // only if the download is a .zip holding one ROM
    "repack": "zip"                   // PSP: "zip" or "tar.gz" - normalized to <slug>/EBOOT.PBP
  },
  "file": "my-game.nes"               // name served under /roms/<system>/
}
```

Get the hash with `curl -sL <url> | sha256sum`, then run `npm run assets`. The script fails if any field is missing, the license isn't an SPDX expression, or the hash doesn't match.

In the pull request, link to the place where the license (code **and** assets) is stated.

## Enabling a "coming soon" console

Systems with an empty `cores` array in `content/systems.json` ship no emulator. To enable one:

1. `npm i -D -E @emulatorjs/core-<name>@<emulatorjs version>`
2. Add `{ "name": "<core>", "variants": ["legacy"] }` to the system. Use `["webgl2", "legacy"]` if the core's `reports/<core>.json` has `defaultWebGL2: true`, or `["thread"]` plus `"threads": true` on the system if it has `requireThreads: true` (as PPSSPP does). List any extra files the core ships, such as `ppsspp-assets.zip`, under `"files"`.
3. Add at least one legal game.

## Development

```bash
npm install
npm run dev        # runs `npm run assets` first
npm run build      # static export to out/
npm start          # serve out/ locally (service worker enabled)
```
