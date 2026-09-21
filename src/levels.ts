import { cell, type Level, type Terrain } from "./game";
function make(stage: number): Level {
  const tiles: Terrain[] = Array(256).fill("sand");
  const put = (x: number, z: number, t: Terrain) => (tiles[cell(x, z)] = t);
  for (let z = 0; z < 16; z++)
    for (let x = 0; x < 16; x++)
      if (x === 0 || z === 0 || x === 15 || z === 15) put(x, z, "rock");
  // Buildings occupy their full visible footprints along the back of the town.
  for (const [x, z, w, h] of [
    [8, 1, 3, 3],
    [12, 2, 2, 3],
    [2, 1, 2, 2],
  ])
    for (let a = x; a < x + w; a++)
      for (let b = z; b < z + h; b++) put(a, b, "building");
  for (const [x, z] of [
    [2, 12],
    [3, 12],
    [12, 12],
    [13, 12],
    [11, 3],
    [1, 9],
  ])
    put(x, z, "rock");
  // Palm trunks, pottery, and market furniture are part of the terrain.
  for (const [x, z] of [
    [1, 4],
    [2, 4],
    [3, 4],
    [1, 11],
    [13, 13],
    [5, 2],
    [11, 1],
    [13, 6],
    [2, 13],
    [12, 5],
    [13, 5],
  ])
    put(x, z, "building");
  const sources = [cell(3, 6), cell(2, 6), cell(2, 5), cell(3, 5)];
  sources.forEach((i) => (tiles[i] = "source"));
  let targets: number[], solution: number[];
  if (stage === 0) {
    [5, 6, 7].forEach((z) => put(6, z, "rock"));
    targets = [cell(10, 6)];
    solution = [
      [4, 5],
      [5, 5],
      [5, 4],
      [6, 4],
      [7, 4],
      [8, 4],
      [9, 4],
      [10, 4],
      [10, 5],
    ].map(([x, z]) => cell(x, z));
  } else if (stage === 1) {
    targets = [cell(10, 6), cell(8, 10)];
    solution = [
      [4, 6],
      [5, 6],
      [6, 6],
      [7, 6],
      [8, 6],
      [9, 6],
      [8, 7],
      [8, 8],
      [8, 9],
    ].map(([x, z]) => cell(x, z));
    for (const [x, z] of [
      [5, 8],
      [6, 8],
      [10, 9],
      [11, 9],
    ])
      put(x, z, "rock");
  } else {
    targets = [cell(11, 6), cell(8, 11), cell(12, 10)];
    for (const [x, z] of [
      [6, 5],
      [6, 7],
      [6, 8],
      [6, 9],
      [10, 8],
      [11, 8],
      [12, 8],
      [9, 11],
    ])
      put(x, z, "rock");
    for (const [x, z] of [
      [6, 6],
      [7, 6],
      [8, 6],
      [8, 7],
      [8, 8],
      [8, 9],
      [9, 10],
      [10, 10],
    ])
      put(x, z, "channel");
    solution = [
      [4, 6],
      [5, 6],
      [9, 6],
      [10, 6],
      [8, 10],
    ].map(([x, z]) => cell(x, z));
    solution.push(cell(11, 10));
  }
  targets.forEach((i) => (tiles[i] = "target"));
  return { tiles, sources, targets, solution, budget: [11, 10, 6][stage] };
}
export const levels = [make(0), make(1), make(2)];
