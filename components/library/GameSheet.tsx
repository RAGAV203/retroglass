"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { GlassAnchor, GlassIconButton } from "@/components/glass/Glass";
import { GlassSheet } from "@/components/glass/GlassSheet";
import { IconHeart, IconPlay } from "@/components/glass/Icons";
import { useOffline } from "@/components/offline/OfflineProvider";
import { formatBytes, getSystem, type Game } from "@/lib/catalog";
import { db, toggleFavorite, type SaveState } from "@/lib/db";
import { GameArt } from "./Cards";

const timeAgo = (t: number) => {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString();
};

function SaveThumb({ save }: { save: SaveState }) {
  const url = useMemo(() => (save.screenshot ? URL.createObjectURL(save.screenshot) : undefined), [save.screenshot]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="aspect-[4/3] w-full rounded-xl bg-black object-cover [image-rendering:pixelated]" />
  ) : (
    <div className="aspect-[4/3] w-full rounded-xl bg-fg/10" />
  );
}

/** Full-page navigation into the player: EmulatorJS wants a fresh document. */
const playHref = (game: Game, slot?: number) => `/play/${game.slug}${slot !== undefined ? `?slot=${slot}` : ""}`;

export function GameSheet({ game, onClose }: { game?: Game; onClose: () => void }) {
  const [shown, setShown] = useState(game);
  useEffect(() => {
    if (game) setShown(game);
  }, [game]);

  const g = game ?? shown;
  const fav = useLiveQuery(() => (g ? db.favorites.get(g.slug) : undefined), [g?.slug]);
  const saves = useLiveQuery(
    () => (g ? db.saves.where("slug").equals(g.slug).sortBy("slot") : Promise.resolve([] as SaveState[])),
    [g?.slug],
  );
  const { status } = useOffline();
  if (!g) return null;
  const sys = getSystem(g.system);
  const auto = saves?.find((s) => s.slot === 0);
  const manual = saves?.filter((s) => s.slot > 0) ?? [];
  const romCached = status ? !status.missing.some((f) => f.url === g.rom) : undefined;

  return (
    <GlassSheet open={!!game} onClose={onClose}>
      <div className="flex gap-4 pb-4">
        <GameArt game={g} className="aspect-[4/5] w-28 shrink-0 shadow-[0_14px_34px_-14px_rgb(0_0_0/0.5)]" />
        <div className="min-w-0 flex-1 pt-1">
          <p className="text-[13px] font-semibold tracking-wide text-fg-2 uppercase">{sys?.name}</p>
          <h2 className="text-[24px] leading-tight font-bold tracking-tight">{g.title}</h2>
          <p className="mt-0.5 text-[14px] text-fg-2">{g.author}</p>
          <div className="mt-3 flex items-center gap-2">
            <GlassIconButton
              label={fav ? "Remove from favorites" : "Add to favorites"}
              onClick={() => toggleFavorite(g.slug)}
              className={fav ? "text-[#ff375f]" : ""}
            >
              <IconHeart filled={!!fav} width={20} height={20} />
            </GlassIconButton>
            {romCached !== undefined && (
              <span className="text-[12px] text-fg-2">
                {romCached ? "✓ Available offline" : "Not downloaded yet"} · {formatBytes(g.bytes)}
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="mb-4 text-[15px] leading-snug">{g.description}</p>

      <div className="mb-5 flex gap-2">
        {auto ? (
          <>
            <GlassAnchor href={playHref(g, 0)} variant="tint" className="flex-1">
                <IconPlay width={18} height={18} /> Resume
            </GlassAnchor>
            <GlassAnchor href={playHref(g)} className="flex-1">
                Start over
            </GlassAnchor>
          </>
        ) : (
          <GlassAnchor href={playHref(g)} variant="tint" className="flex-1">
              <IconPlay width={18} height={18} /> Play
            </GlassAnchor>
        )}
      </div>

      {manual.length > 0 && (
        <section className="mb-5">
          <h3 className="mb-2 px-1 text-[13px] font-semibold tracking-wide text-fg-2 uppercase">Save states</h3>
          <div className="grid grid-cols-2 gap-3">
            {manual.map((s) => (
              <div key={s.id} className="rounded-2xl bg-fg/5 p-2">
                <a href={playHref(g, s.slot)} aria-label={`Load slot ${s.slot}`}>
                  <SaveThumb save={s} />
                </a>
                <div className="mt-1.5 flex items-center justify-between px-1 text-[12px]">
                  <span className="font-semibold">Slot {s.slot}</span>
                  <button className="text-[#ff453a]" onClick={() => s.id && db.saves.delete(s.id)}>
                    Delete
                  </button>
                </div>
                <p className="px-1 text-[11px] text-fg-2">{timeAgo(s.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-2 rounded-2xl bg-fg/5 p-4 text-[13px]">
        <h3 className="mb-1 font-semibold">License</h3>
        <p className="font-mono text-[12px]">{g.license}</p>
        {g.licenseNote && <p className="mt-1 text-fg-2">{g.licenseNote}</p>}
        <a href={g.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-tint">
          Source code ↗
        </a>
      </section>
    </GlassSheet>
  );
}
