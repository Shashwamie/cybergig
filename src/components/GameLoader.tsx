"use client";

import dynamic from "next/dynamic";

// Game state lives in localStorage, so render the game on the client only.
export const GameLoader = dynamic(() => import("@/components/Game"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center font-display text-xs tracking-[0.4em] text-neon-cyan uppercase">
      Jacking in…
    </div>
  ),
});
