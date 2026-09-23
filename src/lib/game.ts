// Game engine for the Cyberpunk TCG Gig dice tracker.
// Rule references (e.g. "CR 8.6.5") point at https://cyberpunktcg.com/comprehensive-rules

export type PlayerId = 0 | 1;

export const SIDES = [4, 6, 8, 10, 12, 20] as const;
export type Sides = (typeof SIDES)[number];

/** "fixer" = not yet rolled in, "gig" = in a player's Gig area. */
export type Zone = "fixer" | "gig";

export interface Die {
  id: string;
  sides: Sides;
  /** Player who brought the die (whose fixer area it starts in). */
  owner: PlayerId;
  /** Player whose Gig area the die is in. Only meaningful in the "gig" zone. */
  controller: PlayerId;
  zone: Zone;
  value: number | null;
}

export interface Player {
  name: string;
  color: string;
}

export interface GameState {
  status: "setup" | "playing" | "over";
  players: [Player, Player];
  dice: Die[];
  firstPlayer: PlayerId;
  active: PlayerId;
  turn: number;
  /** Whether the active player has rolled in a Gig this turn. */
  rolled: boolean;
  /** Consecutive turns that began with both fixer areas empty (CR 1.11.1). */
  emptyStreak: number;
  overtime: boolean;
  winner: PlayerId | "tie" | null;
  winReason: string | null;
  lastEvent: string | null;
  lastRolledId: string | null;
}

export const NEON_COLORS = [
  { name: "Cyan", hex: "#00f0ff" },
  { name: "Magenta", hex: "#ff2bd6" },
  { name: "Lime", hex: "#39ff14" },
  { name: "Violet", hex: "#a855ff" },
  { name: "Orange", hex: "#ff8a1f" },
  { name: "Azure", hex: "#3d7bff" },
] as const;

/** Status colors are reserved (never a player color) so min/max always stand out. */
export const MAX_COLOR = "#fcee0a";
export const MIN_COLOR = "#f75049";

export const WIN_GIGS = 7;

export const rival = (p: PlayerId): PlayerId => (p === 0 ? 1 : 0);

export function randInt(max: number): number {
  // Unbiased 1..max using rejection sampling.
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return (buf[0] % max) + 1;
}

export function defaultPlayers(): [Player, Player] {
  return [
    { name: "Player 1", color: NEON_COLORS[0].hex },
    { name: "Player 2", color: NEON_COLORS[1].hex },
  ];
}

export function initialState(players = defaultPlayers()): GameState {
  return {
    status: "setup",
    players,
    dice: [],
    firstPlayer: 0,
    active: 0,
    turn: 0,
    rolled: false,
    emptyStreak: 0,
    overtime: false,
    winner: null,
    winReason: null,
    lastEvent: null,
    lastRolledId: null,
  };
}

// ---------- Selectors ----------

const bySides = (a: Die, b: Die) => a.sides - b.sides || a.owner - b.owner;

export const fixerDice = (s: GameState, p: PlayerId) =>
  s.dice.filter((d) => d.zone === "fixer" && d.owner === p).sort(bySides);

export const gigDice = (s: GameState, p: PlayerId) =>
  s.dice.filter((d) => d.zone === "gig" && d.controller === p).sort(bySides);

export const streetCred = (s: GameState, p: PlayerId) => {
  const gigs = gigDice(s, p);
  return gigs.length ? gigs.reduce((sum, d) => sum + (d.value ?? 0), 0) : null;
};

export const isMin = (d: Die) => d.zone === "gig" && d.value === 1;
export const isMax = (d: Die) => d.zone === "gig" && d.value === d.sides;

/** A Gig counts towards only one value-pair (CR 6.5.1). */
export function pairInfo(gigs: Die[]) {
  const counts = new Map<number, number>();
  for (const d of gigs) if (d.value != null) counts.set(d.value, (counts.get(d.value) ?? 0) + 1);
  let pairs = 0;
  for (const c of counts.values()) pairs += Math.floor(c / 2);
  const paired = new Set(gigs.filter((d) => (counts.get(d.value ?? -1) ?? 0) >= 2).map((d) => d.id));
  return { pairs, paired };
}

export function canRoll(s: GameState, die: Die) {
  if (s.status !== "playing" || s.rolled) return false;
  if (die.zone !== "fixer" || die.owner !== s.active) return false;
  // The d20 can only be rolled in once it's the last die in the fixer area (CR 8.6.5.1.1).
  return die.sides !== 20 || fixerDice(s, s.active).length === 1;
}

/** Rolling in a Gig is a mandatory Start Phase action (CR 8.4.1). */
export const mustRoll = (s: GameState) =>
  s.status === "playing" && !s.rolled && fixerDice(s, s.active).length > 0;

export const canEndTurn = (s: GameState) => s.status === "playing" && !mustRoll(s);

/** Adjusting, stealing and swapping wait until the turn's roll-in is done (CR 8.4.1, 8.7). */
export const canActOnGigs = (s: GameState) => s.status === "playing" && !mustRoll(s);

// ---------- Reducer ----------

export type Action =
  | { type: "start"; players: [Player, Player]; first: PlayerId }
  | { type: "restart" }
  | { type: "setup" }
  | { type: "roll"; dieId: string; value: number }
  | { type: "set"; dieId: string; value: number }
  | { type: "steal"; thief: PlayerId; dieIds: string[] }
  | { type: "swap"; a: string; b: string }
  | { type: "endTurn" }
  | { type: "concede"; player: PlayerId }
  | { type: "updatePlayer"; id: PlayerId; patch: Partial<Player> };

const label = (d: Die) => `D${d.sides}`;

function win(s: GameState, winner: PlayerId, reason: string): GameState {
  return { ...s, status: "over", winner, winReason: reason, lastEvent: reason };
}

/** In overtime, 7+ Gigs wins immediately at any point (CR 1.11). */
function checkOvertime(s: GameState): GameState {
  if (!s.overtime || s.status !== "playing") return s;
  for (const p of [s.active, rival(s.active)]) {
    if (gigDice(s, p).length >= WIN_GIGS) {
      return win(s, p, `${s.players[p].name} controls ${WIN_GIGS} Gigs in overtime`);
    }
  }
  return s;
}

function beginTurn(s: GameState, player: PlayerId, turn: number): GameState {
  const bothEmpty = s.dice.every((d) => d.zone !== "fixer");
  const next: GameState = {
    ...s,
    active: player,
    turn,
    rolled: false,
    emptyStreak: bothEmpty ? s.emptyStreak + 1 : 0,
  };
  // Start of turn win check happens before anything else (CR 1.10, 8.6.1).
  if (gigDice(next, player).length >= WIN_GIGS) {
    return win(next, player, `${s.players[player].name} started their turn with ${WIN_GIGS} Gigs`);
  }
  return next;
}

function newGame(players: [Player, Player], first: PlayerId): GameState {
  const dice: Die[] = ([0, 1] as PlayerId[]).flatMap((owner) =>
    SIDES.map((sides) => ({
      id: `p${owner}-d${sides}`,
      sides,
      owner,
      controller: owner,
      zone: "fixer" as const,
      value: null,
    })),
  );
  const base: GameState = { ...initialState(players), status: "playing", dice, firstPlayer: first };
  return { ...beginTurn(base, first, 1), lastEvent: `${players[first].name} goes first` };
}

function updateDice(s: GameState, fn: (d: Die) => Die): GameState {
  return { ...s, dice: s.dice.map(fn) };
}

export function gameReducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case "start":
      return newGame(a.players, a.first);

    case "restart":
      return newGame(s.players, s.firstPlayer);

    case "setup":
      return initialState(s.players);

    case "updatePlayer": {
      const players = [...s.players] as [Player, Player];
      players[a.id] = { ...players[a.id], ...a.patch };
      return { ...s, players };
    }

    case "roll": {
      const die = s.dice.find((d) => d.id === a.dieId);
      if (!die || !canRoll(s, die)) return s;
      const next = updateDice(s, (d) =>
        d.id === die.id ? { ...d, zone: "gig", controller: s.active, value: a.value } : d,
      );
      return checkOvertime({
        ...next,
        rolled: true,
        lastRolledId: die.id,
        lastEvent: `${s.players[s.active].name} rolled in ${label(die)} → ${a.value}`,
      });
    }

    case "set": {
      const die = s.dice.find((d) => d.id === a.dieId);
      // Can't adjust to a value off the die's faces or to its current value (CR 6.4.4, 6.4.5).
      if (!canActOnGigs(s) || !die || die.zone !== "gig") return s;
      if (a.value < 1 || a.value > die.sides || a.value === die.value) return s;
      const next = updateDice(s, (d) => (d.id === die.id ? { ...d, value: a.value } : d));
      return {
        ...next,
        lastEvent: `${s.players[die.controller].name}'s ${label(die)} ${die.value} → ${a.value}`,
      };
    }

    case "steal": {
      if (!canActOnGigs(s)) return s;
      const victim = rival(a.thief);
      const ids = new Set(
        a.dieIds.filter((id) =>
          s.dice.some((d) => d.id === id && d.zone === "gig" && d.controller === victim),
        ),
      );
      if (!ids.size) return s;
      const names = s.dice.filter((d) => ids.has(d.id)).sort(bySides).map(label).join(", ");
      const next = updateDice(s, (d) => (ids.has(d.id) ? { ...d, controller: a.thief } : d));
      return checkOvertime({
        ...next,
        lastEvent: `${s.players[a.thief].name} stole ${names}`,
      });
    }

    case "swap": {
      if (!canActOnGigs(s)) return s;
      const da = s.dice.find((d) => d.id === a.a);
      const db = s.dice.find((d) => d.id === a.b);
      if (!da || !db || da.zone !== "gig" || db.zone !== "gig" || da.controller === db.controller) return s;
      const next = updateDice(s, (d) =>
        d.id === da.id
          ? { ...d, controller: db.controller }
          : d.id === db.id
            ? { ...d, controller: da.controller }
            : d,
      );
      return checkOvertime({
        ...next,
        lastEvent: `Swapped ${s.players[da.controller].name}'s ${label(da)} ↔ ${s.players[db.controller].name}'s ${label(db)}`,
      });
    }

    case "concede":
      // A player may concede at any point; their rival wins (CR 1.16.1).
      if (s.status !== "playing") return s;
      return win(s, rival(a.player), `${s.players[a.player].name} conceded`);

    case "endTurn": {
      if (!canEndTurn(s)) return s;
      let next: GameState = { ...s, lastRolledId: null };
      // Overtime begins at the end of a turn once conditions are met (CR 8.17, 1.11.1).
      if (!next.overtime && next.emptyStreak >= 2) {
        next = checkOvertime({ ...next, overtime: true });
        if (next.status === "over") return next;
      }
      const after = beginTurn(next, rival(s.active), s.turn + 1);
      if (after.status === "over") return after;
      return {
        ...after,
        lastEvent:
          next.overtime && !s.overtime
            ? "Overtime begins: 7 Gigs wins instantly"
            : `${s.players[s.active].name} ended their turn`,
      };
    }
  }
}

// ---------- Undo history ----------

export interface Store {
  present: GameState;
  past: GameState[];
}

const HISTORY_LIMIT = 100;

export function storeReducer(store: Store, a: Action | { type: "undo" }): Store {
  if (a.type === "undo") {
    const prev = store.past.at(-1);
    return prev ? { present: prev, past: store.past.slice(0, -1) } : store;
  }
  const next = gameReducer(store.present, a);
  if (next === store.present) return store;
  // Cosmetic changes apply across history so undo never reverts a name or color.
  if (a.type === "updatePlayer") {
    return { present: next, past: store.past.map((p) => ({ ...p, players: next.players })) };
  }
  if (a.type === "start" || a.type === "setup") return { present: next, past: [] };
  return { present: next, past: [...store.past, store.present].slice(-HISTORY_LIMIT) };
}
