import { test } from "node:test";
import assert from "node:assert/strict";
import { FortressState } from "../src/fortress-state";

test("each supply works independently in any order; convoy waits for all three", () => {
  for (const order of [
    [0, 1, 2],
    [2, 0, 1],
    [1, 2, 0],
  ]) {
    const state = new FortressState();
    const active = [false, false, false];
    for (const n of order.slice(0, 2)) {
      active[n] = true;
      state.update(3, active);
      assert.equal(state.power[n], 1);
      assert.equal(state.convoy, 0);
      assert.equal(state.complete, false);
    }
    active[order[2]] = true;
    state.update(3, active);
    assert.ok(state.convoy > 0);
  }
});
test("gate stays open until both wagons and escort are through, then completion waits for closing", () => {
  const state = new FortressState();
  state.update(1 / 1.1 + 6.6, [true, true, true]);
  assert.equal(state.convoy, 1);
  assert.equal(state.escort, 1);
  assert.equal(state.gate, 1);
  assert.equal(state.complete, false);
  state.update(1.3, [true, true, true]);
  assert.equal(state.gate, 0);
  assert.equal(state.complete, false);
  state.update(1.1, [true, true, true]);
  assert.equal(state.complete, true);
});
test("arrival timing does not depend on frame size", () => {
  const a = new FortressState(),
    b = new FortressState();
  a.update(5, [true, true, true]);
  for (let i = 0; i < 500; i++) b.update(0.01, [true, true, true]);
  assert.ok(Math.abs(a.arrivalAge - b.arrivalAge) < 1e-9);
  assert.ok(Math.abs(a.convoy - b.convoy) < 1e-9);
});
test("undo retracts disconnected machinery and resets the convoy for replay", () => {
  const state = new FortressState();
  state.update(11, [true, true, true]);
  state.update(1, [true, false, true]);
  assert.deepEqual(state.power, [1, 0, 1]);
  assert.equal(state.convoy, 0);
  assert.equal(state.escort, 0);
  assert.equal(state.gate, 1);
  assert.equal(state.complete, false);
  state.update(11, [true, true, true]);
  assert.equal(state.complete, true);
});
test("reduced motion immediately shows the correct partial or completed tableau", () => {
  const state = new FortressState();
  state.update(0, [false, true, false], true);
  assert.deepEqual(state.power, [0, 1, 0]);
  assert.equal(state.convoy, 0);
  state.update(0, [true, true, true], true);
  assert.equal(state.complete, true);
  assert.equal(state.convoy, 1);
  assert.equal(state.gate, 0);
  state.update(0, [false, false, false], true);
  assert.equal(state.complete, false);
  assert.equal(state.convoy, 0);
});
