import { cell, type Level, type Terrain } from "./game";
const coords = (points: number[][]) => points.map(([x, z]) => cell(x, z));
function foundation(): Terrain[] {
  return Array.from({ length: 256 }, (_, i) =>
    i % 16 === 0 || i % 16 === 15 || i < 16 || i >= 240 ? "rock" : "sand",
  );
}
function paint(tiles: Terrain[], points: number[][], kind: Terrain) {
  for (const i of coords(points)) tiles[i] = kind;
}
function oasis(): Level {
  const tiles = foundation();
  const sources = coords([
      [2, 6],
      [3, 6],
      [2, 7],
      [3, 7],
    ]),
    targets = [cell(10, 7)];
  paint(
    tiles,
    [
      [6, 6],
      [6, 5],
      [7, 5],
      [4, 11],
      [5, 11],
      [12, 3],
    ],
    "rock",
  );
  paint(
    tiles,
    [
      [10, 6],
      [11, 6],
      [10, 7],
      [11, 7],
      [12, 7],
      [11, 8],
      [12, 8],
    ],
    "basin",
  );
  paint(
    tiles,
    [
      [2, 4],
      [3, 4],
      [13, 6],
      [13, 9],
      [11, 10],
      [12, 10],
      [13, 10],
      [1, 12],
    ],
    "building",
  );
  sources.forEach((i) => (tiles[i] = "source"));
  targets.forEach((i) => (tiles[i] = "target"));
  return {
    tiles,
    sources,
    targets,
    budget: 14,
    solution: coords([
      [4, 7],
      [5, 7],
      [6, 7],
      [7, 7],
      [8, 7],
      [9, 7],
    ]),
    starThresholds: { three: 6, two: 9 },
    story: {
      kind: "oasis",
      title: "A drink for the flock",
      goal: "Bring water to the dry oasis.",
      success: "The flock can drink!",
      focus: coords([
        [3, 6],
        [10, 7],
        [13, 10],
      ]),
    },
  };
}
function bridge(): Level {
  const tiles = foundation();
  for (let z = 0; z < 16; z++)
    for (const x of [10, 11]) tiles[cell(x, z)] = "ravine";
  const sources = coords([
      [2, 4],
      [3, 4],
      [2, 5],
      [3, 5],
    ]),
    targets = [cell(8, 8)];
  paint(
    tiles,
    [
      [6, 5],
      [6, 6],
      [6, 7],
      [3, 9],
      [4, 9],
      [13, 5],
      [14, 5],
    ],
    "rock",
  );
  paint(
    tiles,
    [
      [2, 2],
      [4, 2],
      [8, 10],
      [9, 10],
      [12, 10],
      [13, 10],
      [7, 11],
      [13, 11],
      [14, 3],
    ],
    "building",
  );
  sources.forEach((i) => (tiles[i] = "source"));
  targets.forEach((i) => (tiles[i] = "target"));
  return {
    tiles,
    sources,
    targets,
    budget: 16,
    solution: coords([
      [4, 5],
      [5, 5],
      [5, 6],
      [5, 7],
      [5, 8],
      [6, 8],
      [7, 8],
    ]),
    starThresholds: { three: 7, two: 11 },
    story: {
      kind: "bridge",
      title: "The way across",
      goal: "Power the wheel. Lower the bridge.",
      success: "Together again!",
      focus: coords([
        [3, 5],
        [8, 8],
        [13, 10],
      ]),
    },
  };
}
function city(): Level {
  const tiles = foundation();
  const sources = coords([
      [2, 9],
      [3, 9],
      [2, 10],
      [3, 10],
    ]),
    targets = coords([
      [7, 6],
      [12, 6],
    ]);
  paint(
    tiles,
    [
      [5, 8],
      [5, 9],
      [6, 9],
      [4, 5],
      [5, 5],
      [13, 10],
    ],
    "rock",
  );
  for (let x = 5; x <= 14; x++) tiles[cell(x, 4)] = "building";
  for (const [x, z, w, d] of [
    [5, 1, 2, 2],
    [12, 1, 2, 2],
    [8, 1, 2, 2],
  ])
    for (let a = x; a < x + w; a++)
      for (let b = z; b < z + d; b++) tiles[cell(a, b)] = "building";
  paint(
    tiles,
    [
      [1, 7],
      [4, 12],
      [9, 8],
      [10, 9],
      [11, 9],
      [9, 10],
    ],
    "building",
  );
  const aqueduct = coords([
    [7, 5],
    [8, 5],
    [9, 5],
    [10, 5],
    [11, 5],
    [12, 5],
  ]);
  aqueduct.forEach((i) => (tiles[i] = "aqueduct"));
  const route = [targets[0], ...aqueduct, targets[1]];
  const links: [number, number][] = route.slice(1).map((i, n) => [route[n], i]);
  sources.forEach((i) => (tiles[i] = "source"));
  targets.forEach((i) => (tiles[i] = "target"));
  return {
    tiles,
    sources,
    targets,
    links,
    budget: 18,
    solution: coords([
      [4, 9],
      [4, 8],
      [4, 7],
      [5, 7],
      [6, 7],
      [6, 6],
    ]),
    starThresholds: { three: 6, two: 11 },
    story: {
      kind: "city",
      title: "Welcome home",
      goal: "Feed the aqueduct. Open the gates.",
      success: "Everyone is home!",
      focus: coords([
        [3, 9],
        [7, 6],
        [12, 6],
        [10, 4],
      ]),
    },
  };
}
export const levels = [oasis(), bridge(), city()];
