# Diggy Splash

A low-poly 3D desert puzzle told in eight chapters. Guide water through freshly dug trenches, from giving a flock a drink to defending Sunfall in a battle between two armies.

## Run

```sh
npm install
npm run dev
```

Open the URL printed by Vite. For a production build, run `npm run build`, then `npm run preview`. No backend, accounts, API keys, or external asset services are needed.

## Chapters and scoring

| Chapter               | Water's consequence                                                                                    | Dig budget | Three stars | Two stars  | One star   |
| --------------------- | ------------------------------------------------------------------------------------------------------ | ---------- | ----------- | ---------- | ---------- |
| A drink for the flock | Fill a dry oasis; sheep approach and drink. No gears.                                                  | 14         | ≤ 6 digs    | 7–9 digs   | 10–14 digs |
| The way across        | Power one wheel; the drawbridge lowers and the shepherd crosses to the lost sheep.                     | 16         | ≤ 7 digs    | 8–11 digs  | 12–16 digs |
| Welcome home          | Feed one wheel; a raised aqueduct supplies the second. Both portcullises rise and the villagers enter. | 18         | ≤ 6 digs    | 7–11 digs  | 12–18 digs |
| Bread for everyone    | Restart two mills; golden wheat grows and bread appears.                                               | 20         | ≤ 12 digs   | 13–16 digs | 17–20 digs |
| Caravan in the embers | Three pumps extinguish burning wagons independently.                                                   | 25         | ≤ 17 digs   | 18–21 digs | 22–25 digs |
| The sleeping sun      | Awaken three shrines; a floating sun beacon lights the desert.                                         | 25         | ≤ 18 digs   | 19–22 digs | 23–25 digs |
| Before the storm      | Raise three barricades to protect the convoy.                                                          | 25         | ≤ 19 digs   | 20–22 digs | 23–25 digs |
| The battle of Sunfall | Four water defenses repel the red army and its siege engines.                                          | 25         | ≤ 20 digs   | 21–23 digs | 24–25 digs |

Objectives have no numbered order. Thin sealed pipes visibly connect the later wheels to their machinery; these are delivery pipes, not extra puzzle channels. Each device reacts to its own water supply, while the final celebration waits for the whole level.

Three-star thresholds are verified minimum routes. Scores count the trenches currently dug: undo refunds the dig. The best star rating for each chapter persists and cannot be lowered by a worse replay. Winning on the final dig still succeeds. A failure result appears only after the last water animation settles.

## Controls

- Click or tap sand to dig; hover shows a shovel and remaining digs. Dark soil beds and cut banks distinguish trenches from untouched sand, even when water is flowing.
- Water travels through orthogonal ground connections. Elevated aqueduct sections use explicit links and cannot receive water from a trench underneath them.
- Drag to pan, scroll or pinch to zoom; the corner-frame button shows the board. Default framing keeps the objectives and characters visible in portrait, landscape, and narrow desktop panels.
- Undo and restart are free. `Z` undoes; `R` restarts. Focus the board, use arrow keys to select a tile, and Enter or Space to dig.
- Watch each consequence before the completion card appears. Continue, replay for a better score, or retry/undo a failed attempt. Numbered chapter buttons revisit unlocked levels.
- Sound preference, chapter unlocks, and best stars are saved locally. In-progress trenches are not.

## Implementation

- `src/game.ts` and `src/levels.ts`: pure puzzle state, flood fill, aqueduct connections, star ratings, fixed 16 × 16 layouts, and exact node-weighted Steiner-tree verification.
- `src/world.ts`, `src/story.ts`, and `src/campaign.ts`: full-resolution antialiased perspective rendering, generated characters and architecture, dark trench geometry, water flow, bridge/gate animation, character paths, and smooth camera framing.
- `src/main.ts`: objectives, hover feedback, accessible result dialogs, local progress, keyboard controls, and synthesized audio.

Materials are unlit. Small generated textures provide painted plaster, masonry, wood grain, leaf veins, sand, soil, and water. Nearest-neighbor magnification applies only to textures; the canvas renders at display resolution up to 2× device pixel ratio. ResizeObserver tracks the game container. Fonts ship with the app. Reduced-motion users see the final story poses without motion. Animation pauses while the page is hidden, and old scene geometries are disposed on level changes.

## Verify

```sh
npm test
npm run build
# Optional: recover exact reference routes with the offline authoring tool
npx tsx scripts/solve-levels.ts
```

Tests cover minimum routes, all star boundaries, actual one/two/three-star finishes, budget exhaustion, final-dig wins, undo/reset, ravine blocking, oasis filling, and elevated aqueduct flow. Browser QA covers pointer/touch playthroughs, character destinations, the lowered bridge and raised gates, result dialogs, retry/undo, star persistence, hover counts, and both orientations. The development-only `window.__diggy` inspection bridge is removed from production builds.
