@AGENTS.md

# Project notes

CyberGig: a shared-device dice tracker for the Cyberpunk TCG. See README.md for features and structure.

## Conventions

- **Game rules live only in `src/lib/game.ts`.** Keep the reducer pure: pass randomness in through actions (`roll` carries its `value`). Components call `canRoll` / `canEndTurn` / selectors rather than re-deriving rules.
- **Cite rules.** When adding or changing rule behavior, reference the Comprehensive Rules number in a comment (`CR x.y.z`). The full rules JSON is available at `https://api.netdeck.gg/api/cyberpunk/comprehensive-rules`; the site's rules page is client-rendered and can't be scraped directly.
- **Undo.** Every game action goes through `storeReducer`, which snapshots history. `updatePlayer` (names/colors) is cosmetic and is applied across history instead of creating an undo step.
- **Persistence.** The store is saved to `localStorage` under `cptcg-gig-tracker:v1`. Bump the key if the `GameState` shape changes incompatibly.
- **Client-only.** `Game` is loaded with `dynamic(..., { ssr: false })` so it can read `localStorage` in lazy initializers.

## Styling

- Tailwind 4 with theme tokens in `src/app/globals.css` (`void`, `panel`, `steel`, `neon-yellow`, `neon-cyan`, `neon-red`, `font-display`).
- Components get their neon color from `currentColor`: set `style={{ color }}` on a container and use `border-current`, `bg-current/15`, and the `glow` / `glow-text` / `glow-box` utilities.
- Yellow (`MAX_COLOR`) and red (`MIN_COLOR`) are reserved for max/min Gigs and must not be offered as player colors.
- Look: black negative space, thin neon outlines, uppercase wide-tracked labels. Avoid solid fills other than low-opacity tints.
- Player 2's panel, any dialog aimed at them, and the center turn text (on their turn) use `tabletop:rotate-180` when the flip setting is on. `tabletop` (defined in globals.css) matches portrait screens and touch devices in landscape, but not desktop monitors.

## Verifying changes

- `npx tsc --noEmit && npm run lint && npm run build`
- Check the UI at phone portrait (390×844) and desktop landscape (1440×900).
