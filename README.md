# Diggy Splash

An unlit, low-poly Three.js desert diorama with three water-routing puzzles. Dig connected trenches, power every wheel, and stay within the shovel budget.

## Run

```sh
npm install
npm run dev
```

Open the URL printed by Vite. For a production build, run `npm run build`, then `npm run preview`. No backend, accounts, API keys, or runtime asset services are needed.

## Controls

- Click or tap sand to dig. Water flows automatically through orthogonally connected trenches.
- Drag to pan, scroll or pinch to zoom, and use the corner-frame button for the whole-board overview. The starting view frames the puzzle at a playable tile size in portrait, landscape, and narrow desktop panels.
- Use the undo and restart buttons freely. `Z` undoes; `R` restarts.
- Focus the board and use arrow keys to select a tile, then Enter or Space to dig.
- The arrow appears when every wheel is powered. Numbered buttons revisit unlocked stages.
- The sound button toggles synthesized effects. Unlocks and sound preference are saved locally; in-progress trenches are not.

## Implementation

- `src/game.ts`: pure puzzle state, flood fill, undo, and exact node-weighted Steiner-tree search for minimum dig counts.
- `src/levels.ts`: three fixed 16 × 16 maps and verified solution routes. Minimum costs are 9, 9, and 6; budgets are 11, 10, and 6.
- `src/world.ts`: perspective scene, full-resolution antialiased rendering, textured low-poly meshes, hit testing, animated flow, and machinery.
- `src/main.ts`: icon interface, stage progression, local storage, keyboard controls, and synthesized audio.

All scene materials are unlit. Small generated surface maps provide painted plaster, stone, wood grain, leaf veins, sand, and water detail. Nearest-neighbor magnification is applied only to textures; the canvas renders at display resolution (up to 2× device pixel ratio) with smooth edges. The camera responds to its actual container via ResizeObserver. Font files ship with the app. Animation respects reduced motion and pauses when the page is hidden. Old level geometries are disposed on stage changes; materials and textures are reused.

## Verify

```sh
npm test
npm run build
```

Tests cover all reference solutions and exact budgets, disconnected and diagonal flow, invalid digs, undo/reset, branching, and winning on the final dig. Browser QA uses the actual projected tile centers and pointer events. A development-only `window.__diggy` bridge exposes these centers and state inspection references; it is removed from production builds.
