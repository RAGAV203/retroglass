"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");
export { cx };

export const spring = { type: "spring", stiffness: 520, damping: 32, mass: 0.7 } as const;

type PanelProps = HTMLMotionProps<"div"> & { strong?: boolean; refract?: boolean };

export function GlassPanel({ className, strong, refract, ...rest }: PanelProps) {
  return (
    <motion.div
      className={cx("glass rounded-[28px]", strong && "glass-strong", refract && "glass-refract", className)}
      {...rest}
    />
  );
}

type ButtonProps = HTMLMotionProps<"button"> & { variant?: Variant; size?: "sm" | "md" | "lg" };

const sizes = {
  sm: "h-9 px-3.5 text-[15px] gap-1.5",
  md: "h-11 px-5 text-[17px] gap-2",
  lg: "h-14 px-7 text-[19px] gap-2.5",
};

type Variant = "glass" | "tint" | "plain";

const buttonClass = (variant: Variant, size: keyof typeof sizes, className?: string) =>
  cx(
    "inline-flex select-none items-center justify-center rounded-full font-semibold tracking-tight outline-none",
    "focus-visible:ring-2 focus-visible:ring-tint/70 disabled:opacity-40",
    sizes[size],
    variant === "glass" && "glass text-fg",
    variant === "tint" && "glass bg-tint/85! text-white",
    variant === "plain" && "text-tint",
    className,
  );

export function GlassButton({ className, variant = "glass", size = "md", ...rest }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.02 }}
      transition={spring}
      className={buttonClass(variant, size, className)}
      {...rest}
    />
  );
}

/** Button-styled plain <a> (full page load - used to enter the player). */
export function GlassAnchor({
  className,
  variant = "glass",
  size = "md",
  ...rest
}: HTMLMotionProps<"a"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return (
    <motion.a
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.02 }}
      transition={spring}
      className={buttonClass(variant, size, className)}
      {...rest}
    />
  );
}

export function GlassIconButton({ className, label, children, ...rest }: HTMLMotionProps<"button"> & { label: string }) {
  return (
    <motion.button
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.88 }}
      transition={spring}
      className={cx(
        "glass inline-flex size-11 items-center justify-center rounded-full text-fg outline-none",
        "focus-visible:ring-2 focus-visible:ring-tint/70",
        className,
      )}
      {...rest}
    >
      {children as ReactNode}
    </motion.button>
  );
}

const MotionLink = motion.create(Link);

export function GlassLink({ className, ...rest }: ComponentProps<typeof MotionLink>) {
  return <MotionLink whileTap={{ scale: 0.96 }} transition={spring} className={className} {...rest} />;
}

export function GlassToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-[#34c759]" : "bg-fg-3/40",
      )}
    >
      <motion.span
        layout
        transition={spring}
        className="absolute top-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_3px_1px_rgb(0_0_0/0.06)]"
        style={{ left: checked ? 22 : 2 }}
      />
    </button>
  );
}

/** SVG displacement filter used by .glass-refract on Chromium. */
export function RefractionFilter() {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
      <filter id="lg-refract" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
        <feDisplacementMap in="SourceGraphic" in2="soft" scale="38" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
