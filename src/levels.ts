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
  "Power the bridge wheel.",
  "That was the load-bearing wheel!",
  [
    "~..#|||_",
    "##..|||_",
    "..._|||_",
    "..__|||_",
    "#.__|||_",
    "...O|||_",
    "....|||_",
    "....|||_",
  ],
  [1,2,10,18,17,25,33,41,42],
  9,
);
const city = board(
  "city",
  "Welcome home",
  "Bring water to both wheels. Open both gates.",
  "Everyone is home!",
  [
    "........",
    ".._____.",
    "...____.",
    ".#.O_.O_",
    "..#.__..",
    "~.#.__..",
    "........",
    "........",
  ],
  [48,49,50,51,43,35,52,53,54,46,38],
  11,
);
const harvest = board(
  "harvest",
  "Bread for everyone",
  "Turn both mills. Save the harvest.",
  "The town has bread again!",
  [
    "________",
    "________",
    "..O_..O_",
    "....##._",
    ".#..#.._",
    ".._...._",
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
  "Caravan in the embers",
  "Feed three pumps. Put out the fires.",
  "The caravan is safe!",
  [
    "________",
    "......._",
    "..O#=O._",
    "...#.#._",
    "~....#._",
    ".....#O_",
    "......._",
    "________",
  ],
  [24, 16, 17, 10, 11, 12, 22, 30, 38],
  9,
);
const temple = board(
  "temple",
  "The sleeping sun",
  "Awaken three seals. Light the beacon.",
  "The desert has a guiding light!",
  [
    "________",
    "......._",
    ".O.#..O_",
    "...#=.._",
    "~......_",
    "...###._",
    ".....O._",
    "________",
  ],
  [33, 25, 34, 35, 36, 29, 30, 38, 46, 54],
  10,
);
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
  temple,
  fortress,
  battle,
];
