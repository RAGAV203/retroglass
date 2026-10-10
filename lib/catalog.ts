import data from "./generated/catalog.json";

export type System = {
  id: string;
  name: string;
  shortName: string;
  maker: string;
  year: number;
  ejsSystem: string;
  threads?: boolean;
  accent: [string, string];
  gameCount: number;
};

export type Game = {
  slug: string;
  title: string;
  system: string;
  author: string;
  genre?: string;
  description: string;
  license: string;
  licenseNote?: string;
  nonCommercial?: boolean;
  sourceUrl: string;
  upstream: string;
  sha256: string;
  rom: string;
  bytes: number;
};

export const catalog = data as unknown as {
  packsVersion: string;
  totalBytes: number;
  ejsVersion: string;
  systems: System[];
  games: Game[];
};

export const systems = catalog.systems;
export const games = catalog.games;

export const getSystem = (id: string) => systems.find((s) => s.id === id);
export const getGame = (slug: string) => games.find((g) => g.slug === slug);
export const gamesFor = (systemId: string) => games.filter((g) => g.system === systemId);

/** Systems that have games, by maker order of appearance. */
export const playableSystems = systems.filter((s) => s.gameCount > 0);
export const comingSoonSystems = systems.filter((s) => s.gameCount === 0);

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

export function gameGradient(game: Game) {
  const sys = getSystem(game.system);
  const [a, b] = sys?.accent ?? ["#5e5ce6", "#64d2ff"];
  // Rotate the gradient per game so cards in one system don't look identical.
  let h = 0;
  for (const c of game.slug) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `linear-gradient(${h}deg, ${a}, ${b})`;
}
