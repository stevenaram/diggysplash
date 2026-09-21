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

// The northern terraces and southern promenades are scenery; the center remains
// an unobstructed puzzle. Broken channels are useful, but never solve a level alone.
function chapter(
  kind: NonNullable<Level["story"]>["kind"],
  title: string,
  goal: string,
  success: string,
  targetPoints: number[][],
  rocks: number[][],
  channels: number[][],
  solution: number[],
  minimum: number,
  extra: number,
): Level {
  const tiles = foundation();
  for (let x = 1; x < 15; x++)
    for (const z of [1, 2, 13, 14]) tiles[cell(x, z)] = "building";
  for (let z = 3; z < 13; z++) tiles[cell(14, z)] = "building";
  paint(tiles, rocks, "rock");
  paint(tiles, channels, "channel");
  const sources = coords([
    [2, 8],
    [3, 8],
    [2, 9],
    [3, 9],
  ]);
  const targets = coords(targetPoints);
  sources.forEach((i) => (tiles[i] = "source"));
  targets.forEach((i) => (tiles[i] = "target"));
  return {
    tiles,
    sources,
    targets,
    solution,
    budget: minimum + extra,
    starThresholds: { three: minimum, two: minimum + Math.ceil(extra / 2) },
    story: {
      kind,
      title,
      goal,
      success,
      focus: coords([
        [2, 8],
        [12, 3],
        [12, 12],
        [5, 2],
      ]),
      consequenceFocus: [8, 7],
    },
  };
}
const harvest = () =>
  chapter(
    "harvest",
    "Bread for everyone",
    "Turn both mills. Save the harvest.",
    "The town has bread again!",
    [
      [7, 4],
      [12, 7],
    ],
    [
      [6, 6],
      [6, 7],
      [6, 8],
      [9, 5],
      [10, 5],
      [11, 5],
    ],
    [],
    [148, 149, 150, 151, 135, 119, 103, 120, 87, 121, 122, 123],
    12,
    8,
  );
const caravan = () =>
  chapter(
    "caravan",
    "Caravan in the embers",
    "Feed three pumps. Put out the fires.",
    "The caravan is safe!",
    [
      [5, 4],
      [11, 4],
      [12, 10],
    ],
    [
      [7, 4],
      [7, 5],
      [7, 6],
      [7, 7],
      [9, 8],
      [10, 8],
      [11, 8],
    ],
    [
      [8, 5],
      [9, 5],
    ],
    [115, 99, 83, 67, 68, 53, 54, 55, 56, 72, 90, 91, 92, 108, 124, 140, 156],
    17,
    8,
  );
const temple = () =>
  chapter(
    "temple",
    "The sleeping sun",
    "Awaken three seals. Light the beacon.",
    "The desert has a guiding light!",
    [
      [4, 3],
      [12, 3],
      [10, 11],
    ],
    [
      [6, 4],
      [6, 5],
      [6, 6],
      [6, 7],
      [8, 9],
      [9, 9],
      [10, 9],
      [11, 9],
    ],
    [
      [7, 5],
      [8, 5],
      [9, 5],
      [10, 5],
    ],
    [
      132, 133, 134, 135, 119, 151, 103, 167, 168, 71, 169, 55, 170, 54, 53, 74,
      58, 59,
    ],
    18,
    7,
  );
const fortress = () =>
  chapter(
    "fortress",
    "Before the storm",
    "Raise three barricades. Protect the convoy.",
    "The convoy is protected!",
    [
      [3, 3],
      [12, 4],
      [12, 12],
    ],
    [
      [5, 5],
      [6, 5],
      [7, 5],
      [8, 5],
      [9, 5],
      [7, 7],
      [7, 8],
      [7, 9],
      [7, 10],
      [10, 8],
      [11, 8],
      [12, 8],
    ],
    [
      [9, 10],
      [10, 10],
      [11, 10],
    ],
    [
      115, 99, 83, 100, 67, 101, 102, 103, 104, 105, 121, 106, 137, 90, 153, 74,
      75, 172, 188,
    ],
    19,
    6,
  );
const battle = () =>
  chapter(
    "battle",
    "The battle of Sunfall",
    "Power four defenses. Turn the tide.",
    "Sunfall stands. The raiders retreat!",
    [
      [4, 4],
      [12, 4],
      [6, 12],
      [12, 11],
    ],
    [
      [6, 5],
      [6, 6],
      [6, 7],
      [8, 8],
      [9, 8],
      [10, 8],
      [10, 9],
      [10, 10],
    ],
    [],
    [
      115, 148, 99, 149, 83, 150, 67, 166, 182, 183, 184, 185, 186, 187, 172,
      156, 140, 124, 108, 92,
    ],
    20,
    5,
  );
export const levels = [
  oasis(),
  bridge(),
  city(),
  harvest(),
  caravan(),
  temple(),
  fortress(),
  battle(),
];
