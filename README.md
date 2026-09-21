# Diggy Splash

A low-poly 3D desert puzzle told in eight chapters, each on a full 8 × 8 action grid inside a separate decorative ring (10 × 10 overall). Guide water through freshly dug trenches, from giving a flock a drink to defending Sunfall in a battle between two armies.

## Run

```sh
npm install
npm run dev
```

Open the URL printed by Vite. For a production build, run `npm run build`, then `npm run preview`. No backend, accounts, API keys, or external asset services are needed.

## Hosting

Play at [stevenaram.github.io/diggysplash](https://stevenaram.github.io/diggysplash/).

Every push to `main` runs the tests, builds the game, and deploys to GitHub Pages through `.github/workflows/deploy-pages.yml`. You can also run “Deploy game to GitHub Pages” manually from the repository's Actions tab. A failed test or build prevents deployment. GitHub Pages is free for this public repository.

The workflow builds with the `/diggysplash/` asset base required by the project URL. Normal local builds retain the root base. The existing ChatGPT Sites deployment remains separate and is not updated by this workflow.

## Chapters and scoring

| Chapter               | Water's consequence                                                                                    | Dig budget | Three stars | Two stars  | One star   |
| --------------------- | ------------------------------------------------------------------------------------------------------ | ---------- | ----------- | ---------- | ---------- |
| A drink for the flock | Fill a dry oasis; sheep approach and drink. No gears.                                                  | 8          | ≤ 4 digs    | 5–6 digs   | 7–8 digs   |
| The way across        | Power one wheel; the drawbridge lowers and the shepherd crosses to the lost sheep.                     | 9          | ≤ 5 digs    | 6–7 digs   | 8–9 digs   |
| Welcome home          | Feed one wheel; a raised aqueduct supplies the second. Both portcullises rise and the villagers enter. | 11         | ≤ 6 digs    | 7–9 digs   | 10–11 digs |
| Bread for everyone    | Restart two mills; golden wheat grows and bread appears.                                               | 13         | ≤ 8 digs    | 9–11 digs  | 12–13 digs |
| Caravan in the embers | Three pumps extinguish burning wagons independently.                                                   | 15         | ≤ 10 digs   | 11–13 digs | 14–15 digs |
| The sleeping sun      | Awaken three shrines; a floating sun beacon lights the desert.                                         | 16         | ≤ 11 digs   | 12–14 digs | 15–16 digs |
| Before the storm      | Raise the wall, fill the cistern, and open the refuge gate; escort the convoy inside.                  | 17         | ≤ 12 digs   | 13–15 digs | 16–17 digs |
| The battle of Sunfall | Four water-powered trebuchets break the palisade, scatter the red army, and smash its siege engines.   | 19         | ≤ 14 digs   | 15–17 digs | 18–19 digs |

Objectives have no numbered order. Thin sealed pipes visibly connect the later wheels to their machinery; these are delivery pipes, not extra puzzle channels. Each device reacts to its own water supply, while the final celebration waits for the whole level.

Tiles span two world units. All eight rows and columns belong to the puzzle, including the corners and former boundary. A separate 36-tile stone ring surrounds the 64 action cells; it never receives water or consumes digs. Perimeter campaign scenery sits on this ring, and decorative silhouettes do not intercept tile input. All routes and star thresholds were redesigned for the compact boards. Existing chapter unlocks and mute preferences persist; medals use a new save key so old 16 × 16 scores do not count toward the new puzzles.

Three-star thresholds are verified minimum routes. Scores count the trenches currently dug: undo refunds the dig. The best star rating for each chapter persists and cannot be lowered by a worse replay. Winning on the final dig still succeeds. A failure result appears only after the last water animation settles.

## Controls

- Click or tap sand to dig; a shovel and the updated remaining count rise from each successfully dug tile. Hover only highlights valid sand. Dark soil beds and cut banks distinguish trenches from untouched sand, even when water is flowing.
- Water travels through orthogonal ground connections. Elevated aqueduct sections use explicit links and cannot receive water from a trench underneath them.
- Drag to pan, scroll or pinch to zoom; the corner-frame button shows the board. The fixed camera uses 60° tilt, 0° orbit, and 0.5° roll. The whole island fits the available width in portrait or height in landscape, with headroom for scenery. Stage buttons and toolbars move to side rails in landscape. Resizing and the frame button restore this fit.
- Undo and restart are free. `Z` undoes; `R` restarts. Focus the board, use arrow keys to select a tile, and Enter or Space to dig.
- Watch each consequence before the completion card appears. Continue, replay for a better score, or retry/undo a failed attempt. Numbered chapter buttons revisit unlocked levels.
- Sound preference, chapter unlocks, and best stars are saved locally. In-progress trenches are not.

## Before the storm

Three independent supplies raise a timber curtain wall, fill a visible cistern and drinking trough, and lift a convoy gate. Scouts watch beyond the defenses while sentries, flags, and a waiting supply train idle. Once all three are ready, a donkey pulls the wagons through the gate, the shepherd leads his sheep to water, and the gate closes behind them. Completion waits for everyone to be safely inside. Undo resets the arrival and reverses disconnected machinery; reduced motion shows the final scene immediately. Static scenery and character parts are merged, with separate animated wheels, limbs, flags, winches, and counterweights.

## Sunfall battle polish

Each supplied trebuchet independently winds, releases, and reloads for three volleys. Articulated counterweights, moving winches, sling motion, ballistic boulders, ground shadows, trails, expanding impact rings, bouncing debris, and dust make the attack readable. Hits leave fallen troops, broken palisades, craters, and wrecked ballistas. Banners and formations move while idle; the allied army celebrates after the final impact. Mechanical creaks, launch sounds, and low impact thuds honor mute.

The sixty-four soldiers use instanced body/head/leg geometry. Painted box faces use a single draw on this level; static machinery is merged. Debris and dust have fixed pools, and trails reuse instance buffers. The inspected idle scene dropped from 7,204 to roughly 600 draw calls; this is a renderer workload comparison, not a universal frame-rate guarantee. Repeated stage switching is checked for stable geometry counts. Reduced motion shows the final tableau immediately, and undo restores only the disconnected battery's sector.

## Implementation

- `src/game.ts` and `src/levels.ts`: pure puzzle state, flood fill, aqueduct connections, star ratings, fixed 8 × 8 layouts, and exact node-weighted Steiner-tree verification.
- `src/world.ts`, `src/story.ts`, and `src/campaign.ts`: full-resolution antialiased perspective rendering, generated characters and architecture, dark trench geometry, water flow, bridge/gate animation, character paths, and smooth camera framing.
- `src/battle-state.ts`, `src/battle.ts`, `src/battle-army.ts`, `src/battle-effects.ts`, and `src/battle-mesh.ts`: deterministic artillery timelines, instanced formations, pooled impact effects, and reusable painted geometry.
- `src/main.ts`: objectives, post-dig feedback, accessible result dialogs, local progress, keyboard controls, and synthesized audio.

Materials are unlit. Small generated textures provide painted plaster, masonry, wood grain, leaf veins, sand, soil, and water. Nearest-neighbor magnification applies only to textures; the canvas renders at display resolution up to 2× device pixel ratio. ResizeObserver tracks the game container. Fonts ship with the app. The motion button switches between full animation and reduced motion and saves the choice locally. Without a saved choice, the game follows the system preference. Scene and interface motion share this setting. Reduced motion shows final story poses and uses a gentle opacity-only dig counter; full motion restores water, idle movement, story timelines, a subtle completion camera move, and staggered result stars. Dig counters fade in, drift upward, and fade out over 2.2 seconds. Animation pauses while the page is hidden, and old scene geometries are disposed on level changes.

## Verify

```sh
npm test
npm run build
# Optional: recover exact reference routes with the offline authoring tool
npx tsx scripts/solve-levels.ts
```

Tests cover minimum routes, all star boundaries, actual one/two/three-star finishes, budget exhaustion, final-dig wins, undo/reset, ravine blocking, oasis filling, and elevated aqueduct flow. Browser QA covers pointer/touch playthroughs, character destinations, the lowered bridge and raised gates, result dialogs, retry/undo, star persistence, post-dig counts, and both orientations. The development-only `window.__diggy` inspection bridge is removed from production builds.
