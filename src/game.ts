export const SIZE = 8;
export const CELL_COUNT = SIZE * SIZE;
// Two world units per tile keep the diorama large while making every dig legible.
export const TILE_SIZE = 2;
export const BORDER_WIDTH = TILE_SIZE / 8;
export const BOARD_EXTENT = SIZE * TILE_SIZE + BORDER_WIDTH * 2;
export const gridWorld = (coordinate: number) =>
  (coordinate - (SIZE - 1) / 2) * TILE_SIZE;
export type Terrain =
  | "sand"
  | "rock"
  | "source"
  | "channel"
  | "target"
  | "building"
  | "basin"
  | "ravine"
  | "aqueduct";
export interface Level {
  tiles: Terrain[];
  targets: number[];
  sources: number[];
  budget: number;
  solution: number[];
  links?: [number, number][];
  /** Render elevations only; connectivity remains the explicit puzzle graph. */
  elevations?: number[];
  story?: {
    kind:
      | "oasis"
      | "bridge"
      | "city"
      | "harvest"
      | "caravan"
      | "temple"
      | "bathhouse"
      | "fortress"
      | "battle";
    title: string;
    goal: string;
    success: string;
    focus: number[];
    consequenceFocus?: [number, number];
  };
}
export const cell = (x: number, z: number) => z * SIZE + x;
export function neighbors(i: number): number[] {
  const x = i % SIZE,
    z = Math.floor(i / SIZE);
  return [
    [x - 1, z],
    [x + 1, z],
    [x, z - 1],
    [x, z + 1],
  ]
    .filter(([a, b]) => a >= 0 && b >= 0 && a < SIZE && b < SIZE)
    .map(([a, b]) => cell(a, b));
}
export function connections(level: Level, i: number): number[] {
  const ground =
    level.tiles[i] === "aqueduct"
      ? []
      : neighbors(i).filter((j) => level.tiles[j] !== "aqueduct");
  for (const [a, b] of level.links ?? []) {
    if (a === i) ground.push(b);
    if (b === i) ground.push(a);
  }
  return ground;
}
export class Game {
  digs: number[] = [];
  wet = new Map<number, number>();
  constructor(public level: Level) {
    this.flow();
  }
  get remaining() {
    return this.level.budget - this.digs.length;
  }
  get active() {
    return this.level.targets.map((i) => this.wet.has(i));
  }
  get won() {
    return this.active.every(Boolean);
  }

  get failed() {
    return this.remaining === 0 && !this.won;
  }
  dig(i: number) {
    if (
      this.won ||
      this.remaining <= 0 ||
      this.level.tiles[i] !== "sand" ||
      this.digs.includes(i)
    )
      return false;
    this.digs.push(i);
    this.flow();
    return true;
  }
  undo() {
    this.digs.pop();
    this.flow();
  }
  reset() {
    this.digs = [];
    this.flow();
  }
  flow() {
    this.wet = new Map(this.level.sources.map((i) => [i, 0]));
    const q = [...this.level.sources];
    const dug = new Set(this.digs);
    for (let n = 0; n < q.length; n++)
      for (const j of connections(this.level, q[n]))
        if (
          !this.wet.has(j) &&
          (dug.has(j) ||
            ["source", "channel", "target", "basin", "aqueduct"].includes(
              this.level.tiles[j],
            ))
        ) {
          this.wet.set(j, this.wet.get(q[n])! + 1);
          q.push(j);
        }
  }
}
// Exact node-weighted Steiner tree DP. At most five terminals on 64 cells.
export function minimumDigs(level: Level): number {
  const terminals = [level.sources[0], ...level.targets],
    count = 1 << terminals.length;
  const cost = level.tiles.map((t) =>
    t === "sand"
      ? 1
      : ["rock", "building", "ravine"].includes(t)
        ? Infinity
        : 0,
  );
  const dp = Array.from({ length: count }, () =>
    new Float64Array(CELL_COUNT).fill(Infinity),
  );
  for (let mask = 1; mask < count; mask++) {
    if ((mask & (mask - 1)) === 0) dp[mask][terminals[Math.log2(mask)]] = 0;
    for (let sub = (mask - 1) & mask; sub; sub = (sub - 1) & mask)
      for (let v = 0; v < CELL_COUNT; v++)
        if (Number.isFinite(cost[v]))
          dp[mask][v] = Math.min(
            dp[mask][v],
            dp[sub][v] + dp[mask ^ sub][v] - cost[v],
          );
    const seen = new Set<number>();
    for (let k = 0; k < CELL_COUNT; k++) {
      let v = -1,
        best = Infinity;
      for (let j = 0; j < CELL_COUNT; j++)
        if (!seen.has(j) && dp[mask][j] < best) {
          best = dp[mask][j];
          v = j;
        }
      if (v < 0) break;
      seen.add(v);
      for (const j of connections(level, v))
        dp[mask][j] = Math.min(dp[mask][j], best + cost[j]);
    }
  }
  return Math.min(...dp[count - 1]);
}
