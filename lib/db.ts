import Dexie, { type EntityTable } from "dexie";

export type SaveState = {
  id?: number;
  slug: string;
  slot: number; // 0 = auto-save on quit, 1-4 = manual slots
  createdAt: number;
  state: Uint8Array;
  screenshot?: Blob;
};

export type Recent = { slug: string; playedAt: number };
export type Favorite = { slug: string; addedAt: number };
export type Setting = { key: string; value: unknown };

class RetroGlassDB extends Dexie {
  saves!: EntityTable<SaveState, "id">;
  recents!: EntityTable<Recent, "slug">;
  favorites!: EntityTable<Favorite, "slug">;
  settings!: EntityTable<Setting, "key">;

  constructor() {
    super("retroglass");
    this.version(1).stores({
      saves: "++id, slug, [slug+slot], createdAt",
      recents: "slug, playedAt",
      favorites: "slug, addedAt",
      settings: "key",
    });
  }
}

export const db = new RetroGlassDB();

export async function putSave(save: Omit<SaveState, "id">) {
  await db.transaction("rw", db.saves, async () => {
    await db.saves.where({ slug: save.slug, slot: save.slot }).delete();
    await db.saves.add(save);
  });
}

export async function markPlayed(slug: string) {
  await db.recents.put({ slug, playedAt: Date.now() });
}

export async function toggleFavorite(slug: string) {
  if (await db.favorites.get(slug)) await db.favorites.delete(slug);
  else await db.favorites.put({ slug, addedAt: Date.now() });
}

export type Settings = {
  controlsOpacity: number; // 0.2 - 1
  haptics: boolean;
  autoResume: boolean;
  volume: number; // 0 - 1
};

export const defaultSettings: Settings = {
  controlsOpacity: 0.7,
  haptics: true,
  autoResume: true,
  volume: 0.8,
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const out = { ...defaultSettings } as Record<string, unknown>;
  for (const r of rows) out[r.key] = r.value;
  return out as Settings;
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.settings.put({ key, value });
}
