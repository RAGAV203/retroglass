"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
import { IconSearch } from "@/components/glass/Icons";
import { OfflinePill } from "@/components/offline/OfflinePill";
import { comingSoonSystems, games, getGame, getSystem, playableSystems, type Game } from "@/lib/catalog";
import { db } from "@/lib/db";
import { GameCard, GameRow, SystemCard } from "./Cards";
import { GameSheet } from "./GameSheet";

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-end justify-between px-safe">
        <h2 className="text-[22px] font-bold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LargeTitle({ title, subtitle, trailing }: { title: string; subtitle?: string; trailing?: ReactNode }) {
  return (
    <header className="pt-safe px-safe">
      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-[13px] font-semibold tracking-wide text-fg-2 uppercase">{subtitle}</p>
        {trailing}
      </div>
      <h1 className="mt-1 text-[34px] leading-tight font-bold tracking-tight">{title}</h1>
    </header>
  );
}

export function Library() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Game>();
  const recents = useLiveQuery(() => db.recents.orderBy("playedAt").reverse().limit(10).toArray(), []);
  const favorites = useLiveQuery(() => db.favorites.orderBy("addedAt").reverse().toArray(), []);

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      games.filter((g) => {
        if (!q) return true;
        const sys = getSystem(g.system);
        return [g.title, g.author, g.genre, sys?.name, sys?.shortName].some((s) => s?.toLowerCase().includes(q));
      }),
    [q],
  );

  const recentGames = (recents ?? []).map((r) => getGame(r.slug)).filter(Boolean) as Game[];
  const favGames = (favorites ?? []).map((f) => getGame(f.slug)).filter(Boolean) as Game[];

  return (
    <main className="pb-36">
      <LargeTitle title="Library" subtitle={`${games.length} games · ${playableSystems.length} consoles`} trailing={<OfflinePill />} />

      <div className="mt-4 px-safe">
        <label className="glass flex h-11 items-center gap-2 rounded-full px-4">
          <IconSearch width={18} height={18} className="text-fg-2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Games, consoles, authors"
            className="h-full flex-1 bg-transparent text-[17px] outline-none placeholder:text-fg-3"
            aria-label="Search games"
            enterKeyHint="search"
          />
        </label>
      </div>

      <AnimatePresence initial={false}>
        {!q && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}>
            {recentGames.length > 0 && (
              <Section title="Continue Playing">
                <div className="mx-safe glass overflow-hidden rounded-[24px] divide-y divide-fg-3/15">
                  {recentGames.slice(0, 3).map((g) => (
                    <GameRow key={g.slug} game={g} onOpen={setOpen} />
                  ))}
                </div>
              </Section>
            )}

            <Section title="Consoles">
              <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-safe pb-2 scroll-px-4">
                {[...playableSystems, ...comingSoonSystems].map((s) => (
                  <SystemCard key={s.id} system={s} />
                ))}
              </div>
            </Section>

            {favGames.length > 0 && (
              <Section title="Favorites">
                <div className="no-scrollbar flex gap-4 overflow-x-auto px-safe pb-2">
                  {favGames.map((g) => (
                    <div key={g.slug} className="w-[132px] shrink-0">
                      <GameCard game={g} onOpen={setOpen} />
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Section title={q ? `Results (${results.length})` : "All Games"}>
        {results.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 px-safe sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {results.map((g) => (
              <GameCard key={g.slug} game={g} onOpen={setOpen} />
            ))}
          </div>
        ) : (
          <p className="px-safe py-10 text-center text-fg-2">No games match “{query}”.</p>
        )}
      </Section>

      <GameSheet game={open} onClose={() => setOpen(undefined)} />
    </main>
  );
}
