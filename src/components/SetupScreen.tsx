"use client";

import { useEffect, useState } from "react";
import { DieIcon } from "@/components/DieIcon";
import { Modal, NeonButton, cx } from "@/components/ui";
import { NEON_COLORS, SIDES, randInt, rival, type Player, type PlayerId } from "@/lib/game";

const nameOf = (p: Player, id: PlayerId) => p.name.trim() || `Player ${id + 1}`;

interface SetupScreenProps {
  initialPlayers: [Player, Player];
  onStart: (players: [Player, Player], first: PlayerId) => void;
}

export function SetupScreen({ initialPlayers, onStart }: SetupScreenProps) {
  const [players, setPlayers] = useState(initialPlayers);
  const [first, setFirst] = useState<PlayerId>(0);
  const [rollingOff, setRollingOff] = useState(false);

  const update = (id: PlayerId, patch: Partial<Player>) =>
    setPlayers((ps) => {
      const next = [...ps] as [Player, Player];
      next[id] = { ...next[id], ...patch };
      return next;
    });

  const start = (firstPlayer: PlayerId) =>
    onStart(players.map((p, i) => ({ ...p, name: nameOf(p, i as PlayerId) })) as [Player, Player], firstPlayer);

  return (
    // Pad by the safe-area insets so the notch/Dynamic Island and home bar never cover content
    // when running as a home-screen app, and center vertically when there's spare room.
    <main className="flex h-dvh flex-col overflow-y-auto pt-[calc(env(safe-area-inset-top)_+_2rem)] pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(env(safe-area-inset-bottom)_+_2rem)] pl-[max(1rem,env(safe-area-inset-left))] sm:pt-[calc(env(safe-area-inset-top)_+_3rem)] sm:pb-[calc(env(safe-area-inset-bottom)_+_3rem)]">
      <div className="mx-auto my-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="text-center text-neon-yellow">
          <h1 className="glow-text font-display text-4xl font-black tracking-widest uppercase sm:text-6xl">
            CyberGig
          </h1>
          {/* Describes what the app is for; it's a fan tool, not an official product. */}
          <p className="mt-2 text-[11px] tracking-[0.3em] text-steel/70 uppercase sm:text-xs">
            Dice tracker for Cyberpunk TCG
          </p>
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
                onClick={() => setFirst(id)}
                className="truncate"
              >
                <span className="truncate">{nameOf(players[id], id)}</span>
              </NeonButton>
            ))}
            <NeonButton color="#fcee0a" onClick={() => setRollingOff(true)}>
              Roll off
            </NeonButton>
          </div>
        </section>

        <NeonButton size="lg" solid color="#fcee0a" onClick={() => start(first)} className="mx-auto w-full max-w-sm">
          Jack in
        </NeonButton>
      </div>

      {rollingOff && <RollOff players={players} onBack={() => setRollingOff(false)} onJackIn={start} />}
    </main>
  );
}

interface RollOffProps {
  players: [Player, Player];
  onBack: () => void;
  onJackIn: (first: PlayerId) => void;
}

/** Both players roll a d20; the higher roll chooses to go first or second. Ties re-roll. */
function RollOff({ players, onBack, onJackIn }: RollOffProps) {
  const [faces, setFaces] = useState<[number, number]>(() => [randInt(20), randInt(20)]);
  const [rolling, setRolling] = useState(true);
  const [choice, setChoice] = useState<"first" | "second" | null>(null);

  useEffect(() => {
    let ticks = 0;
    const timer = window.setInterval(() => {
      ticks += 1;
      if (ticks < 12) return setFaces([randInt(20), randInt(20)]);
      window.clearInterval(timer);
      let a: number, b: number;
      do {
        a = randInt(20);
        b = randInt(20);
      } while (a === b);
      setFaces([a, b]);
      setRolling(false);
    }, 70);
    return () => window.clearInterval(timer);
  }, []);

  const winner: PlayerId = faces[0] > faces[1] ? 0 : 1;
  const winnerColor = rolling ? "#b9c2d0" : players[winner].color;
  const first = choice === "second" ? rival(winner) : winner;

  return (
    <Modal label="Roll off" color="#fcee0a" onClose={onBack}>
      <h2 className="glow-text text-center font-display text-xl font-bold tracking-[0.3em] uppercase">Roll off</h2>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {([0, 1] as PlayerId[]).map((id) => (
          <div
            key={id}
            style={{ color: players[id].color, order: id === 0 ? 0 : 2 }}
            className={cx(
              "flex min-w-0 flex-col items-center gap-2 transition-opacity duration-300",
              !rolling && winner !== id && "opacity-35",
            )}
          >
            <span className={cx("block size-20 sm:size-24", rolling && "animate-die-roll")}>
              <DieIcon
                sides={20}
                value={faces[id]}
                fillOpacity={!rolling && winner === id ? 0.15 : 0.06}
                className="glow size-full"
              />
            </span>
            <span className="max-w-full truncate font-display text-xs font-bold tracking-wider uppercase">
              {nameOf(players[id], id)}
            </span>
          </div>
        ))}
        <span className="order-1 text-[10px] tracking-[0.3em] text-steel/50 uppercase">vs</span>
      </div>

      <div className="mt-6 text-center" aria-live="polite">
        <p
          style={{ color: winnerColor }}
          className="glow-text truncate font-display text-lg font-bold tracking-wider uppercase"
        >
          {rolling ? "Rolling…" : `${nameOf(players[winner], winner)} wins`}
        </p>
        <p className="mt-1 text-[10px] tracking-[0.25em] text-steel/70 uppercase">
          {rolling ? "\u00a0" : choice ? `${nameOf(players[first], first)} goes first` : "Choose your turn order"}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {(["first", "second"] as const).map((c) => (
          <NeonButton
            key={c}
            color={winnerColor}
            solid={choice === c}
            aria-pressed={choice === c}
            disabled={rolling}
            onClick={() => setChoice(c)}
          >
            Go {c}
          </NeonButton>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <NeonButton color="#b9c2d0" onClick={onBack}>
          Back
        </NeonButton>
        <NeonButton solid color="#fcee0a" disabled={rolling || !choice} onClick={() => onJackIn(first)}>
          Jack in
        </NeonButton>
      </div>
    </Modal>
  );
}
