/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Must match PACK_CACHE_PREFIX in lib/offline.ts.
const PACK_CACHE_PREFIX = "retroglass-packs-";

/**
 * ROMs and emulator cores live in versioned "pack" caches filled by the
 * client (lib/offline.ts) so the user sees download progress. Here we only
 * need to read them back from whichever pack cache holds them.
 */
const packStrategy = new CacheFirst({
  cacheName: `${PACK_CACHE_PREFIX}runtime`,
  matchOptions: { ignoreSearch: true },
});

const isPackPath = (p: string) => p.startsWith("/emulatorjs/") || p.startsWith("/roms/");

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    // Next's static-export client navigation fetches `/route.txt?_rsc=<hash>`.
    ignoreURLParametersMatching: [/^_rsc$/, /^utm_/],
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      // EmulatorJS probes ROM size with HEAD; Cache API only matches GET.
      matcher: ({ url, sameOrigin }) => sameOrigin && isPackPath(url.pathname),
      method: "HEAD",
      handler: async ({ request }) => {
        const hit = await caches.match(request.url, { ignoreSearch: true });
        if (hit) return new Response(null, { status: 200, headers: hit.headers });
        return fetch(request);
      },
    },
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && isPackPath(url.pathname),
      handler: async ({ request, event }) => {
        const hit = await caches.match(request, { ignoreSearch: true });
        if (hit) return hit;
        return packStrategy.handle({ request, event });
      },
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline.html",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
