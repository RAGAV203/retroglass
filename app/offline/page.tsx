import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-safe">
      <div className="glass max-w-sm rounded-[32px] p-8 text-center">
        <p className="text-5xl">📡</p>
        <h1 className="mt-4 text-[24px] font-bold tracking-tight">You&apos;re offline</h1>
        <p className="mt-2 text-[15px] text-fg-2">
          This page hasn&apos;t been saved to your device yet. Your downloaded games still work.
        </p>
        <Link href="/" className="mt-6 inline-block font-semibold text-tint">
          Go to Library
        </Link>
      </div>
    </main>
  );
}
