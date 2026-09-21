import { test } from "node:test";
import assert from "node:assert/strict";
import { Game, cell, minimumDigs, type Level, type Terrain } from "../src/game";
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
    assert.equal(l.budget - minimumDigs(l), [2, 1, 0][n]);
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
