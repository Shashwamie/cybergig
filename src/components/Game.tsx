"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { DieIcon } from "@/components/DieIcon";
import { PlayerPanel, type Mode, type Rolling } from "@/components/PlayerPanel";
import { SetupScreen } from "@/components/SetupScreen";
import { Modal, NeonButton, cx } from "@/components/ui";
import {
  MAX_COLOR,
  MIN_COLOR,
  initialState,
  randInt,
  storeReducer,
  type Die,
  type PlayerId,
  type Store,
} from "@/lib/game";

const STORE_KEY = "cptcg-gig-tracker:v1";
const PREFS_KEY = "cptcg-gig-tracker:prefs:v1";

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Store;
      if (parsed?.present?.status && Array.isArray(parsed.past)) return parsed;
    }
  } catch {}
  return { present: initialState(), past: [] };
}

function loadFlip(): boolean {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}").flipTop ?? true;
  } catch {
    return true;
  }
}

const vibrate = (ms: number) => {
  try {
    navigator.vibrate?.(ms);
  } catch {}
};

export default function Game() {
  const [store, dispatch] = useReducer(storeReducer, undefined, loadStore);
  const [flipTop, setFlipTop] = useState(loadFlip);
  const [mode, setMode] = useState<Mode>(null);
  const [rolling, setRolling] = useState<Rolling | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const rollTimer = useRef<number | null>(null);

  const s = store.present;
  const editing = s.dice.find((d) => d.id === editingId && d.zone === "gig") ?? null;

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {}
  }, [store]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ flipTop }));
    } catch {}
  }, [flipTop]);

  useEffect(() => () => {
    if (rollTimer.current) window.clearInterval(rollTimer.current);
  }, []);

  const clearUi = () => {
    setMode(null);
    setEditingId(null);
  };

  const startRoll = (die: Die) => {
    if (rolling) return;
    vibrate(15);
    let ticks = 0;
    setRolling({ id: die.id, face: randInt(die.sides) });
    rollTimer.current = window.setInterval(() => {
      ticks += 1;
      if (ticks < 10) {
        setRolling({ id: die.id, face: randInt(die.sides) });
        return;
      }
      window.clearInterval(rollTimer.current!);
      rollTimer.current = null;
      setRolling(null);
      vibrate(30);
      dispatch({ type: "roll", dieId: die.id, value: randInt(die.sides) });
    }, 65);
  };

  const onDieTap = (die: Die) => {
    if (rolling) return;
    if (die.zone === "fixer") return startRoll(die);
    if (mode?.kind === "steal") {
      if (die.controller === mode.actor) return;
      const ids = mode.ids.includes(die.id) ? mode.ids.filter((i) => i !== die.id) : [...mode.ids, die.id];
      return setMode({ ...mode, ids });
    }
    if (mode?.kind === "swap") {
      if (die.controller === mode.actor) return setMode({ ...mode, mine: mode.mine === die.id ? null : die.id });
      return setMode({ ...mode, theirs: mode.theirs === die.id ? null : die.id });
    }
    setEditingId(die.id);
  };

  const confirmMode = () => {
    if (mode?.kind === "steal") dispatch({ type: "steal", thief: mode.actor, dieIds: mode.ids });
    if (mode?.kind === "swap" && mode.mine && mode.theirs) dispatch({ type: "swap", a: mode.mine, b: mode.theirs });
    setMode(null);
  };

  if (s.status === "setup") {
    return <SetupScreen initialPlayers={s.players} onStart={(players, first) => dispatch({ type: "start", players, first })} />;
  }

  // Dialogs face whoever is most likely using them: the active player.
  const flipDialogs = flipTop && s.active === 1;
  const activePlayer = s.players[s.active];

  const panel = (id: PlayerId) => (
    <PlayerPanel
      state={s}
      id={id}
      flipped={flipTop && id === 1}
      mode={mode}
      rolling={rolling}
      onDieTap={onDieTap}
      onEndTurn={() => {
        clearUi();
        dispatch({ type: "endTurn" });
      }}
      onStartMode={(kind, actor) =>
        setMode(kind === "steal" ? { kind, actor, ids: [] } : { kind, actor, mine: null, theirs: null })
      }
      onConfirmMode={confirmMode}
      onCancelMode={() => setMode(null)}
      onColor={(color) => dispatch({ type: "updatePlayer", id, patch: { color } })}
    />
  );

  return (
    <main className="flex h-dvh flex-col-reverse gap-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] pr-[max(0.375rem,env(safe-area-inset-right))] pb-[max(0.375rem,env(safe-area-inset-bottom))] pl-[max(0.375rem,env(safe-area-inset-left))] landscape:flex-row">
      {panel(0)}

      {/* Center console */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-1 landscape:w-24 lg:landscape:w-36 landscape:flex-col landscape:justify-center landscape:gap-4 landscape:px-0 landscape:py-2">
        <NeonButton
          size="sm"
          color="#00f0ff"
          aria-label="Undo"
          disabled={store.past.length === 0 || !!rolling}
          onClick={() => {
            clearUi();
            dispatch({ type: "undo" });
          }}
        >
          <UndoIcon /> <span className="hidden sm:inline">Undo</span>
        </NeonButton>

        <div
          className={cx(
            "min-w-0 flex-1 text-center transition-transform duration-500 landscape:w-full landscape:flex-none",
            flipDialogs && "tabletop:rotate-180",
          )}
        >
          <p className="font-display text-[10px] tracking-[0.3em] text-steel/60 uppercase lg:text-sm">
            Turn <span className="text-white">{s.turn}</span>
          </p>
          {s.overtime ? (
            <p className="glow-text animate-flicker truncate font-display text-xs font-bold tracking-[0.25em] text-neon-red uppercase max-lg:landscape:text-[10px] max-lg:landscape:tracking-[0.12em] lg:text-base">
              Overtime
            </p>
          ) : (
            <p
              className="truncate font-display text-xs font-bold tracking-[0.15em] uppercase max-lg:landscape:text-[10px] max-lg:landscape:tracking-[0.08em] lg:text-base"
              style={{ color: activePlayer.color }}
              title={activePlayer.name}
            >
              {activePlayer.name}
            </p>
          )}
          {s.lastEvent && (
            <p className="truncate text-[10px] text-steel/60 landscape:hidden" aria-live="polite">
              {s.lastEvent}
            </p>
          )}
        </div>

        <NeonButton size="sm" color="#fcee0a" aria-label="Menu" onClick={() => setMenuOpen(true)}>
          <MenuIcon /> <span className="hidden sm:inline">Menu</span>
        </NeonButton>
      </div>

      {panel(1)}

      {editing && (
        <DieEditor
          die={editing}
          color={s.players[editing.owner].color}
          owner={s.players[editing.controller].name}
          flipped={flipDialogs}
          onSet={(value) => dispatch({ type: "set", dieId: editing.id, value })}
          onClose={() => setEditingId(null)}
        />
      )}

      {menuOpen && (
        <Modal label="Menu" color="#fcee0a" onClose={() => setMenuOpen(false)}>
          <h2 className="glow-text font-display text-xl font-bold tracking-[0.2em] uppercase">Menu</h2>
          {confirmReset ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-white">Restart with the same players? Every die goes back to the fixer area.</p>
              <div className="grid grid-cols-2 gap-2">
                <NeonButton color="#b9c2d0" onClick={() => setConfirmReset(false)}>
                  Cancel
                </NeonButton>
                <NeonButton
                  solid
                  color={MIN_COLOR}
                  onClick={() => {
                    clearUi();
                    dispatch({ type: "restart" });
                    setConfirmReset(false);
                    setMenuOpen(false);
                  }}
                >
                  Restart
                </NeonButton>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-2">
              <NeonButton onClick={() => setConfirmReset(true)}>Restart game</NeonButton>
              <NeonButton
                onClick={() => {
                  clearUi();
                  setMenuOpen(false);
                  dispatch({ type: "setup" });
                }}
              >
                New game setup
              </NeonButton>
              <NeonButton color="#00f0ff" onClick={() => setFlipTop((v) => !v)}>
                Flip Player 2: {flipTop ? "On" : "Off"}
              </NeonButton>
              <NeonButton color="#b9c2d0" onClick={() => setMenuOpen(false)}>
                Close
              </NeonButton>
              <p className="mt-2 text-[11px] leading-relaxed text-steel/60">
                Tap a player&apos;s name to change their dice color. Tap any rolled Gig to change its value.
                Undo reverses any mistake, including ending a turn.
              </p>
            </div>
          )}
        </Modal>
      )}

      {s.status === "over" && (
        <Modal label="Game over" color={s.winner === "tie" ? "#fcee0a" : s.players[s.winner ?? 0].color}>
          <div className="text-center">
            <p className="text-[10px] tracking-[0.4em] text-steel/70 uppercase">Game over</p>
            <h2 className="glow-text mt-2 font-display text-3xl font-black tracking-wider uppercase sm:text-4xl">
              {s.winner === "tie" ? "Tie game" : `${s.players[s.winner ?? 0].name} wins`}
            </h2>
            {s.winReason && <p className="mt-3 text-sm text-steel">{s.winReason}</p>}
            <div className="mt-6 grid gap-2">
              <NeonButton solid onClick={() => dispatch({ type: "restart" })}>
                Rematch
              </NeonButton>
              <NeonButton onClick={() => dispatch({ type: "setup" })}>New game setup</NeonButton>
              <NeonButton color="#b9c2d0" onClick={() => dispatch({ type: "undo" })}>
                Undo last action
              </NeonButton>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}

interface DieEditorProps {
  die: Die;
  color: string;
  owner: string;
  flipped: boolean;
  onSet: (value: number) => void;
  onClose: () => void;
}

function DieEditor({ die, color, owner, flipped, onSet, onClose }: DieEditorProps) {
  const value = die.value ?? 1;
  const tone = value === die.sides ? MAX_COLOR : value === 1 ? MIN_COLOR : color;
  const values = Array.from({ length: die.sides }, (_, i) => i + 1);

  return (
    <Modal label={`Adjust D${die.sides}`} color={color} flipped={flipped} onClose={onClose}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-steel/70 uppercase">{owner}&apos;s Gig</p>
          <h2 className="font-display text-lg font-bold tracking-[0.2em] uppercase">Adjust D{die.sides}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="p-2 text-steel hover:text-white">
          <CloseIcon />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-5">
        <NeonButton size="lg" aria-label="Decrease" disabled={value <= 1} onClick={() => onSet(value - 1)}>
          <span className="text-2xl leading-none">−</span>
        </NeonButton>
        <span className="block size-24">
          <DieIcon sides={die.sides} value={value} textColor={tone} className="glow size-full" fillOpacity={0.1} />
        </span>
        <NeonButton size="lg" aria-label="Increase" disabled={value >= die.sides} onClick={() => onSet(value + 1)}>
          <span className="text-2xl leading-none">+</span>
        </NeonButton>
      </div>

      <p className="mt-5 text-[10px] tracking-[0.3em] text-steel/70 uppercase">Set value</p>
      <div className={cx("mt-2 grid gap-1.5", die.sides > 12 ? "grid-cols-5" : die.sides > 6 ? "grid-cols-4" : "grid-cols-3")}>
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              onSet(v);
              onClose();
            }}
            disabled={v === value}
            style={{ color: v === die.sides ? MAX_COLOR : v === 1 ? MIN_COLOR : color }}
            className={cx(
              "min-h-11 border font-display text-base font-bold tabular-nums transition active:scale-95",
              v === value ? "glow-box border-current bg-current/20" : "border-current/40 hover:bg-current/10",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      <NeonButton className="mt-4 w-full" color="#fcee0a" onClick={() => onSet(randInt(die.sides))}>
        Reroll
      </NeonButton>
    </Modal>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "square" as const,
  className: "size-4",
  "aria-hidden": true,
};

const UndoIcon = () => (
  <svg {...iconProps}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
  </svg>
);
const MenuIcon = () => (
  <svg {...iconProps}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
const CloseIcon = () => (
  <svg {...iconProps}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
