"use client";

import { motion } from "motion/react";
import { cx, GlassLink, spring } from "@/components/glass/Glass";
import { IconChevronRight } from "@/components/glass/Icons";
import { gameGradient, getSystem, type Game, type System } from "@/lib/catalog";

export function SystemCard({ system }: { system: System }) {
  const soon = system.gameCount === 0;
  const [a, b] = system.accent;
  return (
    <GlassLink
      href={`/system/${system.id}`}
      className={cx("group relative block w-[150px] shrink-0 snap-start", soon && "opacity-70")}
      aria-label={`${system.name}${soon ? " (coming soon)" : `, ${system.gameCount} games`}`}
    >
      <div
        className="relative h-[104px] overflow-hidden rounded-[24px] shadow-[0_12px_30px_-12px_rgb(0_0_0/0.45)]"
        style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,rgb(255_255_255/0.45),transparent_55%)]" />
        <span className="absolute bottom-2 left-3 text-[26px] font-black tracking-tight text-white/95 drop-shadow-sm">
          {system.shortName}
        </span>
        <span className="glass absolute top-2 right-2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white">
          {soon ? "Soon" : system.gameCount}
        </span>
      </div>
      <div className="mt-2 px-1">
        <p className="truncate text-[13px] font-semibold">{system.name}</p>
        <p className="text-[12px] text-fg-2">
          {system.maker} · {system.year}
        </p>
      </div>
    </GlassLink>
  );
}

export function GameArt({ game, className, compact }: { game: Game; className?: string; compact?: boolean }) {
  const sys = getSystem(game.system);
  return (
    <div
      className={cx("relative overflow-hidden rounded-[22px]", className)}
      style={{ background: gameGradient(game) }}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_25%_10%,rgb(255_255_255/0.5),transparent_60%)]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgb(0_0_0/0.06)_0_2px,transparent_2px_4px)] mix-blend-overlay" />
      {compact ? (
        <span className="absolute inset-0 grid place-items-center text-[13px] font-black text-white/90">
          {sys?.shortName}
        </span>
      ) : (
        <>
          <span className="absolute -right-2 -bottom-4 text-[64px] leading-none font-black tracking-tighter text-white/25 select-none">
            {sys?.shortName}
          </span>
          <span className="absolute top-3 left-3 right-3 line-clamp-3 text-[19px] leading-[1.1] font-extrabold tracking-tight text-white drop-shadow">
            {game.title}
          </span>
        </>
      )}
    </div>
  );
}

export function GameCard({ game, onOpen }: { game: Game; onOpen: (g: Game) => void }) {
  const sys = getSystem(game.system);
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={spring}
      onClick={() => onOpen(game)}
      className="text-left outline-none focus-visible:ring-2 focus-visible:ring-tint/70 rounded-[22px]"
    >
      <GameArt game={game} className="aspect-[4/5] w-full shadow-[0_14px_34px_-14px_rgb(0_0_0/0.5)]" />
      <div className="mt-2 px-1">
        <p className="truncate text-[14px] font-semibold">{game.title}</p>
        <p className="truncate text-[12px] text-fg-2">
          {sys?.shortName} · {game.genre ?? "Homebrew"}
        </p>
      </div>
    </motion.button>
  );
}

export function GameRow({ game, onOpen, detail }: { game: Game; onOpen: (g: Game) => void; detail?: string }) {
  const sys = getSystem(game.system);
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={spring}
      onClick={() => onOpen(game)}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
    >
      <GameArt game={game} compact className="size-14 shrink-0 rounded-[14px]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold">{game.title}</p>
        <p className="truncate text-[13px] text-fg-2">{detail ?? `${sys?.name} · ${game.author}`}</p>
      </div>
      <IconChevronRight width={18} height={18} className="text-fg-3" />
    </motion.button>
  );
}
