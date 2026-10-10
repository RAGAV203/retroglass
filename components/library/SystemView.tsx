"use client";

import { useState } from "react";
import { GlassLink } from "@/components/glass/Glass";
import { IconChevronLeft } from "@/components/glass/Icons";
import { gamesFor, getSystem, type Game } from "@/lib/catalog";
import { repoUrl } from "@/lib/site";
import { GameCard } from "./Cards";
import { GameSheet } from "./GameSheet";

export function SystemView({ id }: { id: string }) {
  const system = getSystem(id)!;
  const list = gamesFor(id);
  const [open, setOpen] = useState<Game>();
  const [a, b] = system.accent;

  return (
    <main className="pb-36">
      <div
        className="relative overflow-hidden pb-8"
        style={{ background: `linear-gradient(160deg, ${a}cc, ${b}99 60%, transparent)` }}
      >
        <div className="pt-safe px-safe">
          <GlassLink
            href="/"
            className="glass mt-1 inline-flex h-10 items-center gap-1 rounded-full pr-4 pl-2 text-[16px] font-semibold text-white"
          >
            <IconChevronLeft width={20} height={20} /> Library
          </GlassLink>
          <p className="mt-6 text-[13px] font-semibold tracking-wide text-white/80 uppercase">
            {system.maker} · {system.year}
          </p>
          <h1 className="text-[34px] leading-tight font-bold tracking-tight text-white drop-shadow">{system.name}</h1>
          <p className="mt-1 text-[15px] text-white/85">
            {list.length ? `${list.length} game${list.length > 1 ? "s" : ""}` : "Coming soon"}
          </p>
        </div>
        <span className="pointer-events-none absolute -right-4 -bottom-8 text-[120px] leading-none font-black tracking-tighter text-white/15 select-none">
          {system.shortName}
        </span>
      </div>

      {list.length ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 px-safe sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {list.map((g) => (
            <GameCard key={g.slug} game={g} onOpen={setOpen} />
          ))}
        </div>
      ) : (
        <div className="glass mx-safe mt-6 rounded-[28px] p-6 text-center">
          <p className="text-[17px] font-semibold">No games yet</p>
          <p className="mt-2 text-[15px] text-fg-2">
            RetroGlass only ships games whose authors allow free redistribution. We haven&apos;t found a verified,
            openly licensed {system.shortName} title yet.
          </p>
          {repoUrl && (
            <a
              href={`${repoUrl}/blob/main/CONTRIBUTING.md`}
              className="mt-4 inline-block text-[15px] font-semibold text-tint"
              target="_blank"
              rel="noreferrer"
            >
              Know one? Suggest it ↗
            </a>
          )}
        </div>
      )}

      <GameSheet game={open} onClose={() => setOpen(undefined)} />
    </main>
  );
}
