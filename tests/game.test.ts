import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Game,
  cell,
  minimumDigs,
  ratingForDigs,
  connections,
  type Level,
  type Terrain,
} from "../src/game";
import { levels } from "../src/levels";
function fixture(): Level {
  const tiles: Terrain[] = Array(256).fill("sand");
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
    assert.equal(l.tiles.length, 256);
    assert.equal(minimumDigs(l), [6, 7, 6][n]);
    assert.equal(l.starThresholds!.three, minimumDigs(l));
    assert.ok(l.budget - l.starThresholds!.three >= 8);
    const g = new Game(l);
    for (const i of l.solution) assert.equal(g.dig(i), true);
    assert.equal(g.won, true);
    assert.ok(g.remaining >= 0);
    assert.equal(g.stars, 3);
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
  for (const i of [cell(2, 2), cell(1, 1), cell(4, 1), -1, 256])
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

test("star thresholds are inclusive and all successful routes earn at least one star", () => {
  for (const level of levels) {
    const { three, two } = level.starThresholds!;
    assert.equal(ratingForDigs(level, three), 3);
    assert.equal(ratingForDigs(level, three + 1), 2);
    assert.equal(ratingForDigs(level, two), 2);
    assert.equal(ratingForDigs(level, two + 1), 1);
    assert.equal(ratingForDigs(level, level.budget), 1);
  }
});
test("actual wins earn three, two, or one star from net digs after undo", () => {
  const level = levels[0];
  for (const [extra, stars] of [
    [0, 3],
    [3, 2],
    [4, 1],
    [8, 1],
  ]) {
    const game = new Game(level);
    for (let x = 1; x <= extra; x++) game.dig(cell(x, 13));
    level.solution.forEach((i) => game.dig(i));
    assert.equal(game.won, true);
    assert.equal(game.stars, stars);
  }
  const game = new Game(level);
  game.dig(cell(1, 13));
  game.undo();
  level.solution.forEach((i) => game.dig(i));
  assert.equal(game.stars, 3);
});
test("the aqueduct carries water between both gears, and cannot be entered through the ground underneath", () => {
  const level = levels[2],
    game = new Game(level);
  assert.equal(game.dig(cell(8, 5)), false);
  assert.equal(connections(level, cell(8, 6)).includes(cell(8, 5)), false);
  level.solution.forEach((i) => game.dig(i));
  assert.deepEqual(game.active, [true, true]);
  assert.ok(game.wet.get(level.targets[1])! > game.wet.get(level.targets[0])!);
  game.undo();
  assert.deepEqual(game.active, [false, false]);
});
test("ravine blocks flow and cannot be dug; dry oasis fills without any gears", () => {
  const bridge = new Game(levels[1]);
  assert.equal(bridge.dig(cell(10, 8)), false);
  const oasis = new Game(levels[0]);
  levels[0].solution.forEach((i) => oasis.dig(i));
  assert.equal(oasis.won, true);
  assert.equal(oasis.wet.has(cell(12, 8)), true);
});
test("failure is reported only when the budget is exhausted without reaching the objective", () => {
  const game = new Game(levels[0]);
  assert.equal(game.failed, false);
  assert.equal(game.stars, 0);
  for (let x = 1; x <= 14; x++) game.dig(cell(x, 13));
  assert.equal(game.failed, true);
  assert.equal(game.stars, 0);
  game.undo();
  assert.equal(game.failed, false);
  assert.equal(game.remaining, 1);
});
