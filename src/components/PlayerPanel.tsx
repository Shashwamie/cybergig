"use client";

import { useState } from "react";
import {
  NEON_COLORS,
  canActOnGigs,
  canEndTurn,
  canRoll,
  fixerDice,
  gigDice,
  mustRoll,
  pairInfo,
  rival,
  streetCred,
  type Die,
  type GameState,
  type PlayerId,
} from "@/lib/game";
import { DieButton, NeonButton, cx } from "@/components/ui";

export type Mode =
  | { kind: "steal"; actor: PlayerId; ids: string[] }
  | { kind: "swap"; actor: PlayerId; mine: string | null; theirs: string | null }
  | null;

export interface Rolling {
  id: string;
  face: number;
}

interface PlayerPanelProps {
  state: GameState;
  id: PlayerId;
  flipped: boolean;
  mode: Mode;
  rolling: Rolling | null;
  onDieTap: (die: Die) => void;
  onEndTurn: () => void;
  onStartMode: (kind: "steal" | "swap", actor: PlayerId) => void;
  onConfirmMode: () => void;
  onCancelMode: () => void;
  onColor: (hex: string) => void;
  onSetValue: (die: Die, value: number) => void;
}

export function PlayerPanel({
  state,
  id,
  flipped,
  mode,
  rolling,
  onDieTap,
  onEndTurn,
  onStartMode,
  onConfirmMode,
  onCancelMode,
  onColor,
  onSetValue,
}: PlayerPanelProps) {
  const [pickingColor, setPickingColor] = useState(false);
  const player = state.players[id];
  const other = state.players[rival(id)];
  const active = state.status === "playing" && state.active === id;
  const gigs = gigDice(state, id);
  const fixer = fixerDice(state, id);
  const { pairs, paired } = pairInfo(gigs);
  const cred = streetCred(state, id);
  const needsRoll = active && mustRoll(state);
  const rivalGigs = gigDice(state, rival(id)).length;
  const gigsLocked = !canActOnGigs(state);

  const isSelected = (d: Die) =>
    mode?.kind === "steal"
      ? mode.ids.includes(d.id)
      : mode?.kind === "swap"
        ? mode.mine === d.id || mode.theirs === d.id
        : false;

  // While choosing dice for a steal, only the victim's dice are pickable.
  const isDimmed = (d: Die) => mode?.kind === "steal" && d.controller === mode.actor;

  return (
    <section
      aria-label={`${player.name}'s side`}
      style={{ color: player.color }}
      className={cx(
        "relative flex min-h-0 min-w-0 flex-1 flex-col gap-2 border p-3 transition-colors duration-300 sm:p-4 lg:gap-3 lg:p-6",
        active ? "glow-box border-current" : "border-current/25",
        flipped && "tabletop:rotate-180",
      )}
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="@container min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setPickingColor((v) => !v)}
            className="flex max-w-full items-center gap-2 text-left"
            aria-expanded={pickingColor}
            aria-label={`${player.name}: change color`}
          >
            <span className="glow size-3 shrink-0 rotate-45 border-2 border-current lg:size-4" />
            <span className="glow-text truncate font-display text-base font-bold tracking-wider uppercase sm:text-lg lg:text-3xl">
              {player.name}
            </span>
          </button>
          <p
            className={cx(
              "mt-0.5 truncate text-[10px] font-semibold tracking-[0.06em] whitespace-nowrap uppercase @[7rem]:tracking-[0.2em] lg:mt-1 lg:text-sm lg:tracking-[0.25em]",
              active ? "animate-flicker text-current" : "text-steel/50",
            )}
          >
            {active ? (
              <>
                ▶ <span className="hidden @[13.5rem]:inline">Your turn · </span>
                {needsRoll ? "Roll in" : "Main phase"}
              </>
            ) : (
              "Standby"
            )}
          </p>
        </div>
        <dl className="flex shrink-0 gap-3 text-right sm:gap-5 lg:gap-8">
          <Stat label="Gigs" value={`${gigs.length}`} strong />
          <Stat label="Cred" value={cred == null ? "—" : String(cred)} />
          <Stat label="Pairs" value={String(pairs)} />
        </dl>
      </header>

      {pickingColor && (
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Dice color">
          {NEON_COLORS.map((c) => {
            const taken = c.hex === other.color;
            const current = c.hex === player.color;
            return (
              <button
                key={c.hex}
                type="button"
                role="radio"
                aria-checked={current}
                aria-label={c.name}
                disabled={taken}
                onClick={() => {
                  onColor(c.hex);
                  setPickingColor(false);
                }}
                style={{ color: c.hex }}
                className={cx(
                  "size-8 border-2 border-current transition disabled:opacity-20",
                  current ? "glow-box bg-current/40" : "bg-current/10",
                )}
              />
            );
          })}
        </div>
      )}

      {/* Gig area */}
      <div className="relative flex min-h-0 flex-1 flex-wrap content-center items-center justify-center gap-x-2 gap-y-2 overflow-y-auto py-1 sm:gap-x-4 lg:gap-x-6 lg:gap-y-4">
        {gigs.length === 0 ? (
          <p className="text-[11px] tracking-[0.3em] text-steel/40 uppercase lg:text-sm">No Gigs · Null Cred</p>
        ) : (
          gigs.map((d) => (
            <DieButton
              key={d.id}
              die={d}
              // Dice keep their owner's color even after being stolen or swapped.
              color={state.players[d.owner].color}
              variant="gig"
              paired={paired.has(d.id)}
              selected={isSelected(d)}
              dimmed={isDimmed(d)}
              pop={state.lastRolledId === d.id}
              disabled={gigsLocked}
              onClick={() => onDieTap(d)}
              onNudge={mode || rolling ? undefined : (value) => onSetValue(d, value)}
            />
          ))
        )}
      </div>

      {/* Fixer area */}
      {fixer.length > 0 && (
        <div className="flex items-center gap-3 border-t border-current/20 pt-2">
          <div className="w-14 shrink-0 text-[9px] leading-tight tracking-[0.2em] text-steel/60 uppercase lg:w-24 lg:text-xs">
            Fixer
            <br />
            {needsRoll ? <span className="text-current">Tap to roll</span> : `${fixer.length} left`}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {fixer.map((d) => {
              const rollable = canRoll(state, d);
              const isRolling = rolling?.id === d.id;
              return (
                <DieButton
                  key={d.id}
                  die={d}
                  color={player.color}
                  variant="fixer"
                  face={isRolling ? rolling.face : undefined}
                  rolling={isRolling}
                  ready={rollable && !rolling}
                  disabled={!rollable || !!rolling || !!mode}
                  onClick={() => onDieTap(d)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Footer: actions or selection-mode banner */}
      {mode && mode.actor === id ? (
        <ModeBar mode={mode} onConfirm={onConfirmMode} onCancel={onCancelMode} />
      ) : (
        <footer className="flex items-center gap-2">
          <NeonButton
            size="sm"
            disabled={gigsLocked || rivalGigs === 0 || !!mode}
            onClick={() => onStartMode("steal", id)}
          >
            Steal
          </NeonButton>
          <NeonButton
            size="sm"
            disabled={gigsLocked || rivalGigs === 0 || gigs.length === 0 || !!mode}
            onClick={() => onStartMode("swap", id)}
          >
            Swap
          </NeonButton>
          {active && (
            <NeonButton
              solid
              size="sm"
              className="ml-auto"
              disabled={!canEndTurn(state) || !!mode || !!rolling}
              onClick={onEndTurn}
            >
              {needsRoll ? "Roll first" : "End turn"}
            </NeonButton>
          )}
        </footer>
      )}
    </section>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-[9px] tracking-[0.25em] text-steel/60 uppercase lg:text-xs">{label}</dt>
      <dd
        className={cx(
          "font-display leading-none font-bold tabular-nums",
          strong ? "glow-text text-2xl sm:text-3xl lg:text-5xl" : "text-lg text-white sm:text-xl lg:text-4xl",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function ModeBar({ mode, onConfirm, onCancel }: { mode: NonNullable<Mode>; onConfirm: () => void; onCancel: () => void }) {
  const steal = mode.kind === "steal";
  const ready = steal ? mode.ids.length > 0 : !!(mode.mine && mode.theirs);
  const hint = steal
    ? mode.ids.length
      ? `${mode.ids.length} selected`
      : "Pick rival Gigs to steal"
    : !mode.mine
      ? "Pick one of your Gigs"
      : !mode.theirs
        ? "Pick a rival Gig"
        : "Ready to swap";
  return (
    <footer className="flex items-center gap-2">
      <p className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-[0.2em] uppercase lg:text-sm">{hint}</p>
      <NeonButton size="sm" color="#b9c2d0" onClick={onCancel}>
        Cancel
      </NeonButton>
      <NeonButton size="sm" solid disabled={!ready} onClick={onConfirm}>
        {steal ? "Steal" : "Swap"}
      </NeonButton>
    </footer>
  );
}
