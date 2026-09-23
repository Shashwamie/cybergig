"use client";

import { useState } from "react";
import { DieIcon } from "@/components/DieIcon";
import { NeonButton, cx } from "@/components/ui";
import { NEON_COLORS, SIDES, randInt, type Player, type PlayerId } from "@/lib/game";

interface SetupScreenProps {
  initialPlayers: [Player, Player];
  onStart: (players: [Player, Player], first: PlayerId) => void;
}

export function SetupScreen({ initialPlayers, onStart }: SetupScreenProps) {
  const [players, setPlayers] = useState(initialPlayers);
  const [first, setFirst] = useState<PlayerId>(0);
  const [rollOff, setRollOff] = useState<[number, number] | null>(null);

  const update = (id: PlayerId, patch: Partial<Player>) =>
    setPlayers((ps) => {
      const next = [...ps] as [Player, Player];
      next[id] = { ...next[id], ...patch };
      return next;
    });

  // The rules suggest both players roll a d20; higher goes first, ties re-roll.
  const doRollOff = () => {
    let a: number, b: number;
    do {
      a = randInt(20);
      b = randInt(20);
    } while (a === b);
    setRollOff([a, b]);
    setFirst(a > b ? 0 : 1);
  };

  const start = () =>
    onStart(
      players.map((p, i) => ({ ...p, name: p.name.trim() || `Player ${i + 1}` })) as [Player, Player],
      first,
    );

  return (
    <main className="h-dvh overflow-y-auto px-4 py-8 sm:py-12">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="text-center text-neon-yellow">
          <p className="text-[11px] tracking-[0.5em] text-neon-cyan uppercase">Cyberpunk TCG</p>
          <h1 className="glow-text mt-2 font-display text-4xl font-black tracking-widest uppercase sm:text-6xl">
            CyberGig
          </h1>
          <div className="mt-5 flex justify-center gap-2 sm:gap-3" aria-hidden>
            {SIDES.map((s) => (
              <DieIcon key={s} sides={s} value={null} className="glow size-9 sm:size-11" />
            ))}
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {([0, 1] as PlayerId[]).map((id) => {
            const p = players[id];
            const otherColor = players[id === 0 ? 1 : 0].color;
            return (
              <fieldset key={id} style={{ color: p.color }} className="glow-box border border-current p-4">
                <legend className="px-2 text-[10px] tracking-[0.3em] uppercase">Player {id + 1}</legend>
                <label className="block text-[10px] tracking-[0.25em] text-steel/70 uppercase">
                  Handle
                  <input
                    value={p.name}
                    maxLength={16}
                    onChange={(e) => update(id, { name: e.target.value })}
                    style={{ color: p.color }}
                    className="mt-1 block w-full border-b border-current bg-transparent py-1 font-display text-xl font-bold tracking-wider uppercase outline-none placeholder:text-current/30"
                    placeholder={`Player ${id + 1}`}
                  />
                </label>
                <p className="mt-4 text-[10px] tracking-[0.25em] text-steel/70 uppercase">Dice color</p>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={`Player ${id + 1} color`}>
                  {NEON_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      role="radio"
                      aria-checked={c.hex === p.color}
                      aria-label={c.name}
                      disabled={c.hex === otherColor}
                      onClick={() => update(id, { color: c.hex })}
                      style={{ color: c.hex }}
                      className={cx(
                        "size-9 border-2 border-current transition disabled:opacity-15",
                        c.hex === p.color ? "glow-box bg-current/40" : "bg-current/10",
                      )}
                    />
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>

        <section className="text-neon-cyan">
          <p className="text-center text-[10px] tracking-[0.3em] text-steel/70 uppercase">Who goes first?</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {([0, 1] as PlayerId[]).map((id) => (
              <NeonButton
                key={id}
                color={players[id].color}
                solid={first === id}
                onClick={() => {
                  setFirst(id);
                  setRollOff(null);
                }}
                className="truncate"
              >
                <span className="truncate">{players[id].name || `Player ${id + 1}`}</span>
              </NeonButton>
            ))}
            <NeonButton color="#fcee0a" onClick={doRollOff}>
              Roll off
            </NeonButton>
          </div>
          {rollOff && (
            <p className="mt-3 text-center font-display text-sm tracking-wider text-white">
              <span style={{ color: players[0].color }}>{rollOff[0]}</span>
              <span className="mx-3 text-steel/50">vs</span>
              <span style={{ color: players[1].color }}>{rollOff[1]}</span>
              <span className="ml-3 text-steel/70">
                · {players[first].name || `Player ${first + 1}`} goes first
              </span>
            </p>
          )}
        </section>

        <NeonButton size="lg" solid color="#fcee0a" onClick={start} className="mx-auto w-full max-w-sm">
          Jack in
        </NeonButton>
      </div>
    </main>
  );
}
