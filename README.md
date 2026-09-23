# CyberGig: Cyberpunk TCG Dice Tracker

A mobile-first web app for tracking Gig dice in the [Cyberpunk Trading Card Game](https://cyberpunktcg.com/). Two players share one device. Each player gets their own half of the screen, and the rules for rolling, stealing, swapping and winning are built in.

## Features

- **Shared-device play.** Player 2's half is flipped 180° so players sitting across from each other can each read their own side. Held upright, the halves stack top and bottom; turned sideways, they sit side by side. On a phone or tablet, Player 2 is flipped in both orientations. On a desktop monitor, the side-by-side halves both face the screen. The flip can be turned off in the menu.
- **Roll-in enforcement.** Each player starts with a D4, D6, D8, D10, D12 and D20 in their fixer area. The active player must roll in exactly one Gig per turn before ending it. The D20 can only be rolled once it's the last die in the fixer area.
- **Min, max and value-pairs.** Max Gigs show a yellow number and label, min Gigs a red one, and dice in a value-pair get a double outline. The outline always stays the owner's color. The pair count follows the rule that each Gig belongs to only one pair.
- **Adjust values.** Tap any rolled Gig to set its value with −/+, a number grid, or a reroll.
- **Steal and swap.** Steal lets you pick any number of rival Gigs. Swap trades one friendly Gig for one rival Gig. Values are kept in both cases.
- **Win detection.** A player who starts their turn with 7 Gigs wins. Overtime begins after two consecutive turns in which both fixer areas were empty. In overtime, reaching 7 Gigs wins instantly.
- **Undo.** Every game action can be undone, including ending a turn or a win.
- **Stats.** Each side shows its Gig count, Street Cred (the sum of its values) and pairs.
- **Persistence.** The game is saved to `localStorage`, so a refresh or accidental close doesn't lose it.
- **Customization.** Player names and neon dice colors (dice keep their owner's color even after being stolen or swapped). Who goes first can be picked or decided by a D20 roll-off.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) with React 19 and TypeScript
- [Tailwind CSS 4](https://tailwindcss.com)
- Fonts: Saira (the brand font of cyberpunktcg.com) and Orbitron, via `next/font`
- No backend or database yet. All state is client-side.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To test on a phone, open your computer's LAN IP address on port 3000 from a phone on the same network.

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # ESLint
```

## Project structure

```
src/
  app/
    layout.tsx        Fonts, metadata, mobile viewport
    page.tsx          Renders the client-only game
    globals.css       Theme tokens, glow utilities, animations
  components/
    GameLoader.tsx    Loads Game with ssr: false (state lives in localStorage)
    Game.tsx          Store, persistence, rolling, steal/swap modes, dialogs
    PlayerPanel.tsx   One player's half: stats, Gig area, fixer area, actions
    SetupScreen.tsx   Names, colors, first player / roll-off
    DieIcon.tsx       SVG outline shape for each die type
    ui.tsx            NeonButton, Modal, DieButton
  lib/
    game.ts           Rules engine: types, selectors, reducer, undo history
```

## Rules reference

The engine in `src/lib/game.ts` follows the [Comprehensive Rules](https://cyberpunktcg.com/comprehensive-rules). Comments cite rule numbers (e.g. `CR 8.6.5`). Key rules:

| Rule | Behavior |
| --- | --- |
| CR 8.6.5 | Roll in one Gig from your fixer area during your Start Phase (mandatory) |
| CR 8.6.5.1.1 | The D20 may only be chosen when it's the last die in the fixer area |
| CR 1.10 | Start your turn with 7+ Gigs to win |
| CR 1.11 | Overtime: 7+ Gigs at any point wins immediately |
| CR 6.3 | Min Gig = 1, max Gig = the die's number of sides |
| CR 6.4.4–6.4.5 | A Gig can't be set to a value not on its faces, or to its current value |
| CR 6.5.1 | Each Gig counts towards only one value-pair |
| CR 6.6 / 6.7 | Swaps and steals keep dice values unchanged |

## Disclaimer

CyberGig is an unofficial fan-made tool. It is not affiliated with, endorsed by, or sponsored by the publishers of Cyberpunk TCG. Cyberpunk and related marks belong to their respective owners.

## Roadmap ideas

- Action log / battle history
- Installable PWA with offline support
- Online two-device play (room codes, realtime sync, MongoDB)
