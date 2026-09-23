"use client";

import { useEffect } from "react";

export const wakeLockSupported = () => typeof navigator !== "undefined" && "wakeLock" in navigator;

/**
 * Keeps the screen on while `enabled`, using the Screen Wake Lock API.
 * Browsers drop the lock whenever the page is hidden (app switch, screen lock), so it's
 * re-requested when the page becomes visible again, and on taps for browsers that want a gesture.
 */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !wakeLockSupported()) return;
    let lock: WakeLockSentinel | null = null;
    let pending = false;
    let cancelled = false;

    const request = async () => {
      if (lock || pending || document.visibilityState !== "visible") return;
      pending = true;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void sentinel.release();
          return;
        }
        lock = sentinel;
        sentinel.addEventListener("release", () => {
          if (lock === sentinel) lock = null;
        });
      } catch {
        // Denied (e.g. battery saver or no user gesture yet); a later visibility change or tap retries.
      } finally {
        pending = false;
      }
    };

    void request();
    document.addEventListener("visibilitychange", request);
    document.addEventListener("pointerdown", request);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", request);
      document.removeEventListener("pointerdown", request);
      void lock?.release().catch(() => {});
      lock = null;
    };
  }, [enabled]);
}
