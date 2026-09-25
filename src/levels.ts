import { cell, SIZE, type Level, type Terrain } from "./game";

const terrain: Record<string, Terrain> = {
  ".": "sand",
  "#": "rock",
  _: "building",
  "~": "source",
  O: "target",
  "=": "channel",
  a: "aqueduct",
  b: "basin",
  "|": "ravine",
};
type Kind = NonNullable<Level["story"]>["kind"];
function board(
  kind: Kind,
  title: string,
  goal: string,
  success: string,
  rows: string[],
  solution: number[],
  minimum: number,
): Level {
  if (rows.length !== SIZE || rows.some((row) => row.length !== SIZE))
    throw Error("Invalid 8 × 8 board");
  const tiles = rows
    .join("")
    .split("")
    .map((char) => {
      if (!terrain[char]) throw Error("Unknown terrain");
      return terrain[char];
    });
  const find = (t: Terrain) =>
    tiles.flatMap((tile, i) => (tile === t ? [i] : []));
  const sources = find("source"),
    targets = find("target");
  return {
    tiles,
    sources,
    targets,
    solution,
    budget: minimum,
    story: {
      kind,
      title,
      goal,
      success,
      focus: [
        ...sources,
        ...targets,
        cell(0, 0),
        cell(7, 0),
        cell(0, 7),
        cell(7, 7),
      ],
      ...(!["oasis", "bridge", "city"].includes(kind)
        ? {
            consequenceFocus:
              kind === "fortress"
                ? ([10.5, 10.7] as [number, number])
                : ([8, 7] as [number, number]),
          }
        : {}),
    },
  };
}

// Each character is one complete tile. Scenery occupies reserved terraces;
// every open square is a real, reachable dig, never a decorative sub-grid.
const oasis = board(
  "oasis",
  "Something in the water",
  "Bring water to the dry oasis.",
  "You watered WHAT?!",
  [
    "........",
    "........",
    "._..#__.",
    "~....Ob.",
    "......b.",
    ".....__.",
    "..._....",
    "........",
  ],
  [25, 26, 27, 28],
  4,
);
const bridge = board(
  "bridge",
  "The way across",
  "Fill the wheel basin.",
  "That was the load-bearing wheel!",
  [
    "~..#|||_",
    "##..|||_",
    "...#|||_",
    "#.##|||_",
    "..bO|||_",
    "..##|||_",
    "....|||_",
    "....|||_",
  ],
  [1,2,10,18,17,25,33],
  7,
);
const city = board(
  "city",
  "Market day",
  "Carry lake water through the aqueduct to the village well.",
  "Well, that escalated.",
  [
    "________",
    "_~..#.__",
    "_.#...b_",
    "______a_",
    "__....b_",
    "__..#.__",
    "__O...__",
    "________",
  ],
  [10,11,19,20,21,37,36,35,43,42],
  10,
);
// The wall separates the two digging areas. Only the visible flume crosses it.
city.links=[[22,30],[30,38]];
city.elevations=Array.from({length:64},(_,i)=>i<24||i===30?1.15:0);
const harvest = board(
  "harvest",
  "The last supper",
  "Irrigate both farm terraces.",
  "An all-you-can-eat disaster.",
  [
    "________",
    "________",
    "..O_..O_",
    "....##._",
    ".#..#.._",
    "..#...._",
    "~#____#_",
    "________",
  ],
  // The eastern approach to the first mill becomes the shared trunk. The
  // equally short western approach costs two extra digs when feeding both mills.
  [40,32,24,25,26,27,35,43,44,45,37,38,30],
  13,
);
const caravan = board(
  "caravan",
  "Highway robbery",
  "Fill all three horse troughs.",
  "Wrong turn, wrong company.",
  ["________","________","________",".O#.O#O#","..#.....","...##...","~.#.....","....#..."],
  [49,41,33,57,58,59,51,52,53,45,36,37,38],
  13,
);
const bathhouse = board(
  "bathhouse", "Last bath", "Fill the bath and feed the steam room.", "Down the drain.",
  ["..~.____","....____",".a..____",".a..____",".a..O___",".b..#___",".....___","....O___"],
  [1,9,42,43,35,51,52],
  7,
);
// Isolated aqueduct endpoints: only the north intake accepts water, then the
// three-cell downhill spillway becomes the starting point of the southern network.
bathhouse.requiresWater={36:60};
bathhouse.links=[[9,17],[17,25],[25,33],[33,41]];
bathhouse.elevations=Array.from({length:64},(_,i)=>i<16&&i%8<4?.6:0);
const fortress = board(
  "fortress",
  "Before the storm",
  "Raise the wall. Ready the refuge.",
  "Safe inside. Sunfall is ready!",
  [
    "________",
    "________",
    "..O##.O_",
    ".#....._",
    ".#..##._",
    "~#..#.._",
    "......O_",
    "________",
  ],
  [32, 24, 16, 17, 26, 27, 28, 29, 30, 38, 46],
  11,
);
const battle = board(
  "battle",
  "The battle of Sunfall",
  "Feed the trebuchets. Break the siege.",
  "Siege broken. Sunfall stands!",
  [
    "________",
    "________",
    "..O#..O_",
    "..##..._",
    "~....#._",
    "...###O_",
    "...O..#_",
    "________",
  ],
  [33, 25, 34, 17, 42, 35, 50, 36, 28, 29, 30, 38],
  12,
);
export const levels = [
  oasis,
  bridge,
  city,
  harvest,
  caravan,
  bathhouse,
  fortress,
  battle,
];
