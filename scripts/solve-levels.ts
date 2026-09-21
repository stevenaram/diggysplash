// Offline authoring tool: recover an exact node-weighted Steiner tree.
import { levels } from "../src/levels";
import { connections, Game, CELL_COUNT } from "../src/game";
for (const [index, level] of levels.entries()) {
  const terminals = [level.sources[0], ...level.targets],
    count = 1 << terminals.length;
  const weight = level.tiles.map((t) =>
    t === "sand"
      ? 1
      : ["rock", "building", "ravine"].includes(t)
        ? Infinity
        : 0,
  );
  const dp = Array.from({ length: count }, () =>
    Array(CELL_COUNT).fill(Infinity),
  );
  const back = Array.from({ length: count }, () =>
    Array<[number, number] | undefined>(CELL_COUNT),
  );
  for (let mask = 1; mask < count; mask++) {
    if ((mask & (mask - 1)) === 0) dp[mask][terminals[Math.log2(mask)]] = 0;
    for (let sub = (mask - 1) & mask; sub; sub = (sub - 1) & mask)
      for (let v = 0; v < CELL_COUNT; v++) {
        const value = dp[sub][v] + dp[mask ^ sub][v] - weight[v];
        if (value < dp[mask][v]) {
          dp[mask][v] = value;
          back[mask][v] = [sub, v];
        }
      }
    const seen = new Set<number>();
    for (let k = 0; k < CELL_COUNT; k++) {
      let v = -1,
        best = Infinity;
      for (let j = 0; j < CELL_COUNT; j++)
        if (!seen.has(j) && dp[mask][j] < best) {
          v = j;
          best = dp[mask][j];
        }
      if (v < 0) break;
      seen.add(v);
      for (const j of connections(level, v))
        if (best + weight[j] < dp[mask][j]) {
          dp[mask][j] = best + weight[j];
          back[mask][j] = [0, v];
        }
    }
  }
  const minimum = Math.min(...dp[count - 1]),
    cells = new Set<number>();
  function trace(mask: number, v: number) {
    if (weight[v] === 1) cells.add(v);
    const b = back[mask][v];
    if (!b) return;
    if (b[0] === 0) trace(mask, b[1]);
    else {
      trace(b[0], v);
      trace(mask ^ b[0], v);
    }
  }
  trace(count - 1, dp[count - 1].indexOf(minimum));
  // Sort by distance through the completed network for a readable source-first route.
  const probe = new Game({ ...level, budget: CELL_COUNT });
  probe.digs = [...cells];
  probe.flow();
  const solution = [...cells].sort(
    (a, b) => probe.wet.get(a)! - probe.wet.get(b)!,
  );
  console.log(JSON.stringify({ stage: index + 1, minimum, solution }));
}
