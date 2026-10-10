"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  downloadPacks,
  getPackStatus,
  offlineSupported,
  requestPersistence,
  type PackStatus,
  type Progress,
} from "@/lib/offline";

type OfflineState = {
  status?: PackStatus;
  progress?: Progress;
  downloading: boolean;
  error?: string;
  online: boolean;
  start: () => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<OfflineState | null>(null);

export function useOffline() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOffline outside OfflineProvider");
  return v;
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PackStatus>();
  const [progress, setProgress] = useState<Progress>();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string>();
  const [online, setOnline] = useState(true);
  const running = useRef(false);

  const refresh = useCallback(async () => {
    if (!offlineSupported()) return;
    try {
      setStatus(await getPackStatus());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const start = useCallback(async () => {
    if (running.current || !offlineSupported()) return;
    running.current = true;
    setDownloading(true);
    setError(undefined);
    requestPersistence();
    try {
      let last = 0;
      await downloadPacks((p) => {
        // Throttle React updates to ~10/s.
        const now = performance.now();
        if (now - last > 100 || p.loaded >= p.total) {
          last = now;
          setProgress(p);
        }
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      running.current = false;
      setDownloading(false);
    }
  }, [refresh]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // First launch (or a new pack version): pre-load everything automatically.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!offlineSupported()) return;
      try {
        const s = await getPackStatus();
        if (cancelled) return;
        setStatus(s);
        if (!s.ready && navigator.onLine) start();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [start]);

  return (
    <Ctx.Provider value={{ status, progress, downloading, error, online, start, refresh }}>{children}</Ctx.Provider>
  );
}
