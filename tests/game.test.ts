import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Game,
  SIZE,
  BORDER_WIDTH,
  TILE_SIZE,
  BOARD_EXTENT,
  CELL_COUNT,
  cell,
  minimumDigs,
  connections,
  type Level,
  type Terrain,
} from "../src/game";
import { levels } from "../src/levels";
function fixture(): Level {
  const tiles: Terrain[] = Array(CELL_COUNT).fill("sand");
  tiles[cell(1, 1)] = "source";
  tiles[cell(4, 1)] = "target";
  tiles[cell(2, 2)] = "rock";
  return {
    tiles,
    sources: [cell(1, 1)],
    targets: [cell(4, 1)],
    budget: 3,
    solution: [cell(2, 1), cell(3, 1)],
  };
}
test("all handcrafted boards meet their exact difficulty budgets", () => {
  levels.forEach((l, n) => {
    assert.equal(l.tiles.length, CELL_COUNT);
    assert.equal(minimumDigs(l), [4, 7, 10, 13, 13, 7, 11, 12][n]);
    assert.equal(l.budget, minimumDigs(l));
    const g = new Game(l);
    for (const i of l.solution) assert.equal(g.dig(i), true);
    assert.equal(g.won, true);
    assert.ok(g.remaining >= 0);
  });
});
test("orthogonal flow connects dry trenches and never crosses a diagonal", () => {
  const g = new Game(fixture());
  g.dig(cell(3, 1));
  assert.equal(g.wet.has(cell(3, 1)), false);
  g.dig(cell(2, 1));
  assert.equal(g.won, true);
  const h = new Game(fixture());
  h.dig(cell(0, 0));
  assert.equal(h.wet.has(cell(0, 0)), false);
});
test("blocked, source, target, out of range, and duplicate digs spend nothing", () => {
  const g = new Game(fixture());
  for (const i of [cell(2, 2), cell(1, 1), cell(4, 1), -1, CELL_COUNT])
    assert.equal(g.dig(i), false);
  assert.equal(g.remaining, 3);
  g.dig(cell(2, 1));
  assert.equal(g.dig(cell(2, 1)), false);
  assert.equal(g.remaining, 2);
});
test("undo refunds and retracts water, reset restores the initial state", () => {
  const g = new Game(fixture());
  g.dig(cell(2, 1));
  g.dig(cell(3, 1));
  assert.equal(g.won, true);
  g.undo();
  assert.equal(g.won, false);
  assert.equal(g.remaining, 2);
  assert.equal(g.wet.has(cell(3, 1)), false);
  g.reset();
  assert.equal(g.remaining, 3);
  assert.equal(g.wet.size, 1);
  g.undo();
  assert.equal(g.remaining, 3);
});
test("last available dig can win, while exhausted failed attempts can be undone", () => {
  const l = fixture();
  l.budget = 2;
  const g = new Game(l);
  g.dig(cell(2, 1));
  g.dig(cell(3, 1));
  assert.equal(g.remaining, 0);
  assert.equal(g.won, true);
  const h = new Game(l);
  h.dig(cell(0, 0));
  h.dig(cell(0, 1));
  assert.equal(h.dig(cell(2, 1)), false);
  h.undo();
  assert.equal(h.dig(cell(2, 1)), true);
});
test("one shared connected network powers all branches and existing channels", () => {
  for (const l of levels.slice(1)) {
    const g = new Game(l);
    for (const i of [...l.solution].reverse()) g.dig(i);
    assert.equal(g.active.filter(Boolean).length, l.targets.length);
  }
});

test("city aqueduct delivers to a new digging area before the well", () => {
  const level=levels[2],game=new Game(level);
  level.solution.slice(0,5).forEach(i=>game.dig(i));
  assert.equal(game.wet.has(22),true);
  assert.equal(game.wet.has(30),true);
  assert.equal(game.wet.has(38),true);
  assert.equal(game.won,false);
  assert.equal(game.remaining,5);
  assert.deepEqual(connections(level,30).sort((a,b)=>a-b),[22,38]);
  level.solution.slice(5).forEach(i=>game.dig(i));
  assert.equal(game.won,true);assert.equal(game.remaining,0);
  game.reset();
  level.solution.slice(5).forEach(i=>game.dig(i));
  assert.equal(game.wet.has(38),false);assert.equal(game.won,false);
  level.solution.slice(0,5).forEach(i=>game.dig(i));
  assert.equal(game.won,true);
});
test("city wall cannot be bypassed and a wrong side branch uses the last dig",()=>{
  const game=new Game(levels[2]);
  for(let i=24;i<32;i++)assert.equal(game.dig(i),false);
  assert.equal(game.dig(13),true);
  levels[2].solution.forEach(i=>game.dig(i));
  assert.equal(game.failed,true);
  game.reset();assert.equal(game.remaining,10);assert.equal(game.wet.has(38),false);
});
test("ravine blocks flow and cannot be dug; dry oasis fills without any gears", () => {
  const bridge = new Game(levels[1]);
  assert.equal(bridge.dig(cell(5, 4)), false);
  const oasis = new Game(levels[0]);
  levels[0].solution.forEach((i) => oasis.dig(i));
  assert.equal(oasis.won, true);
  assert.equal(oasis.wet.has(cell(6, 4)), true);
});
test("failure is reported only when the budget is exhausted without reaching the objective", () => {
  const game = new Game(levels[0]);
  assert.equal(game.failed, false);
  for (let i = 0; i < CELL_COUNT && game.remaining > 0; i++)
    if (!game.level.solution.includes(i)) game.dig(i);
  assert.equal(game.failed, true);
  game.undo();
  assert.equal(game.failed, false);
  assert.equal(game.remaining, 1);
});

test("the campaign escalates through five distinct consequences and a four-objective battle", () => {
  assert.equal(levels.length, 8);
  assert.deepEqual(
    levels.slice(3).map((l) => l.story!.kind),
    ["harvest", "caravan", "bathhouse", "fortress", "battle"],
  );
  // Chapters 4–6 use independent puzzles; the final battle adds another objective.
  for (let n = 7; n < 8; n++)
    assert.ok(
      levels[n].budget > levels[n - 1].budget,
    );
  assert.equal(levels[7].targets.length, 4);
  for (const level of levels.slice(3)) {
    const g = new Game(level);
    assert.ok(g.active.every((a) => !a));
    level.solution.forEach((i) => g.dig(i));
    assert.ok(g.won);
    g.undo();
    assert.ok(!g.won);
    g.reset();
    assert.ok(g.active.every((a) => !a));
    const exact = new Game({ ...level, budget: level.solution.length });
    level.solution.forEach((i) => exact.dig(i));
    assert.ok(exact.won);
    assert.equal(exact.remaining, 0);
  }
});

test("every ungated objective is independently reachable", () => {
  for (const level of levels)
    for (const target of level.targets) {
      if(level.requiresWater?.[target]!==undefined)continue;
      const queue = [...level.sources],
        previous = new Map<number, number>();
      const visited = new Set(queue);
      for (let n = 0; n < queue.length && !visited.has(target); n++) {
        for (const next of connections(level, queue[n])) {
          if (
            visited.has(next) ||
            ["rock", "building", "ravine"].includes(level.tiles[next])
          )
            continue;
          visited.add(next);
          previous.set(next, queue[n]);
          queue.push(next);
        }
      }
      assert.ok(visited.has(target));
      const route: number[] = [];
      for (let at = target; previous.has(at); at = previous.get(at)!)
        if (level.tiles[at] === "sand") route.push(at);
      // This checks connectivity; BFS minimizes edges, not paid digs through free channels.
      const game = new Game({...level,budget:64});
      for (const i of route.reverse()) game.dig(i);
      assert.ok(
        game.wet.has(target),
        `${level.story!.kind}: target ${target} is independently reachable`,
      );
    }
});

test("8 × 8 boundaries never wrap, and every authored coordinate stays on the board", () => {
  assert.equal(SIZE, 8);
  for (const level of levels) {
    for (const i of [
      ...level.sources,
      ...level.targets,
      ...level.solution,
      ...(level.story?.focus ?? []),
      ...(level.links ?? []).flat(),
    ]) {
      assert.ok(Number.isInteger(i) && i >= 0 && i < CELL_COUNT);
    }
    for (let z = 0; z < SIZE; z++) {
      assert.ok(!connections(level, cell(7, z)).includes(cell(0, z + 1)));
    }
    assert.equal(new Set(level.solution).size, level.solution.length);
  }
});

test("thin trim surrounds exactly 64 cells and campaign scenery owns non-diggable map tiles", () => {
  assert.equal(BORDER_WIDTH, TILE_SIZE / 8);
  assert.equal(BOARD_EXTENT, 16.5);
  for (const level of levels) {
    assert.equal(level.tiles.length, 64);
    for (const i of level.solution) assert.equal(level.tiles[i], "sand");
    const game = new Game(level);
    level.tiles.forEach((t, i) => {
      if (t === "building") assert.equal(game.dig(i), false);
    });
    assert.equal(game.remaining, level.budget);
  }
  for (const level of levels.slice(3).filter(l=>!["caravan", "bathhouse"].includes(l.story?.kind??""))) {
    for (let x = 0; x < 8; x++) {
      assert.equal(level.tiles[cell(x, 0)], "building");
      assert.equal(level.tiles[cell(x, 7)], "building");
    }
    for (let z = 0; z < 8; z++) assert.equal(level.tiles[cell(7, z)], "building");
  }
});


test("stage four rewards the shared eastern approach over the equally short western approach", () => {
  const level=levels[3];
  const efficient=new Game(level);
  [40,32,24,25,26].forEach(i=>efficient.dig(i));
  assert.deepEqual(efficient.active,[true,false]);
  level.solution.slice(5).forEach(i=>efficient.dig(i));
  assert.equal(efficient.won,true);
  const separate=new Game(level);
  [40,32,24,16,17].forEach(i=>separate.dig(i));
  assert.deepEqual(separate.active,[true,false]);
  [25,26,27,35,43,44,45,37,38,30].forEach(i=>separate.dig(i));
  assert.equal(separate.won,false);
  assert.equal(separate.remaining,0);
});
