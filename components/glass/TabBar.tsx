"use client";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cx, spring } from "./Glass";
import { IconGames, IconSettings } from "./Icons";

const tabs = [
  { href: "/", label: "Library", Icon: IconGames, match: (p: string) => p === "/" || p.startsWith("/system") },
  { href: "/settings", label: "Settings", Icon: IconSettings, match: (p: string) => p.startsWith("/settings") },
];

/** Floating iOS 26-style tab bar that minimizes while scrolling down. */
export function TabBar() {
  const pathname = usePathname() ?? "/";
  const { scrollY } = useScroll();
  const [compact, setCompact] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (y > prev + 4 && y > 80) setCompact(true);
    else if (y < prev - 4) setCompact(false);
  });

  if (pathname.startsWith("/play")) return null;

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe" aria-label="Main">
      <motion.div
        layout
        transition={spring}
        className="glass glass-refract pointer-events-auto flex items-center gap-1 rounded-full p-1.5"
      >
        {tabs.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "relative flex items-center justify-center rounded-full transition-colors",
                compact ? "h-11 w-14" : "h-[54px] w-[88px] flex-col gap-0.5",
                active ? "text-tint" : "text-fg",
              )}
            >
              {active && (
                <motion.span
                  layoutId="tab-lens"
                  transition={spring}
                  className="absolute inset-0 rounded-full bg-fg/8 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]"
                />
              )}
              <Icon className="relative" width={compact ? 22 : 24} height={compact ? 22 : 24} />
              {!compact && <span className="relative text-[10.5px] font-semibold">{label}</span>}
            </Link>
          );
        })}
      </motion.div>
    </nav>
  );
}
