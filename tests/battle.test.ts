import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  BattleState,
  CYCLE,
  IMPACT,
  RELEASE,
  VOLLEYS,
} from "../src/battle-state";
import { bakeColored } from "../src/battle-mesh";

test("each trebuchet fires immediately when its own supply connects", () => {
  const state = new BattleState();
  const events = state.update(IMPACT + 0.01, [false, false, true, false]);
  assert.deepEqual(state.hits, [0, 0, 1, 0]);
  assert.deepEqual(
    events.map((e) => e.kind),
    ["wind", "launch", "impact"],
  );
  assert.ok(events.every((e) => e.sector === 2));
  assert.ok(!state.complete);
});
test("large and small time steps produce the same salvos without missing impacts", () => {
  const fast = new BattleState(),
    slow = new BattleState();
  const active = [true, true, true, true];
  const fastEvents = [...fast.update(11, active)];
  const slowEvents = [];
  for (let i = 0; i < 1100; i++) slowEvents.push(...slow.update(0.01, active));
  assert.deepEqual(fast.hits, slow.hits);
  for (const kind of ["wind", "launch", "impact"])
    assert.equal(
      fastEvents.filter((e) => e.kind === kind).length,
      slowEvents.filter((e) => e.kind === kind).length,
    );
  assert.equal(
    fastEvents.filter((e) => e.kind === "impact").length,
    4 * VOLLEYS,
  );
  assert.equal(fast.update(10, active).length, 0);
});
test("victory waits for the last battery's impacts and the celebration hold", () => {
  const s = new BattleState();
  s.update(11, [true, true, true, false]);
  assert.equal(s.complete, false);
  s.update(0.01, [true, true, true, true]);
  s.update(CYCLE * 2 + RELEASE, [true, true, true, true]);
  assert.equal(s.hits[3], 2);
  assert.equal(s.complete, false);
  s.update(IMPACT - RELEASE + 0.01, [true, true, true, true]);
  assert.equal(s.hits[3], 3);
  s.update(1.3, [true, true, true, true]);
  assert.equal(s.complete, true);
});
test("undo resets only the disconnected battery and allows its destruction to replay", () => {
  const s = new BattleState();
  s.update(11, [true, true, true, true]);
  const events = s.update(0.02, [true, false, true, true]);
  assert.deepEqual(s.hits, [3, 0, 3, 3]);
  assert.equal(s.ages[1], -1);
  assert.equal(s.complete, false);
  assert.deepEqual(events, [{ sector: 1, shot: 0, kind: "reset" }]);
  s.update(IMPACT + 0.01, [true, true, true, true]);
  assert.deepEqual(s.hits, [3, 1, 3, 3]);
});
test("reduced motion displays final destruction immediately without sound events", () => {
  const s = new BattleState();
  assert.equal(s.update(0.01, [true, false, true, false], true).length, 0);
  assert.deepEqual(s.hits, [3, 0, 3, 0]);
  assert.equal(s.complete, false);
  assert.equal(s.update(0.01, [true, true, true, true], true).length, 0);
  assert.equal(s.complete, true);
});
test("baking preserves face colors, child transforms, and single-material cylinder groups", () => {
  const root = new T.Group();
  root.position.set(10, 0, 0);
  const cylinder = new T.Mesh(
    new T.CylinderGeometry(1, 1, 2, 6),
    new T.MeshBasicMaterial({ color: 0x33aa88 }),
  );
  cylinder.position.x = 3;
  root.add(cylinder);
  const geometry = bakeColored(root);
  geometry.computeBoundingBox();
  assert.ok(
    geometry.boundingBox!.min.x > 1.9 && geometry.boundingBox!.max.x < 4.1,
  );
  const colors = geometry.getAttribute("color");
  assert.equal(colors.count, geometry.getAttribute("position").count);
  for (let i = 0; i < colors.count; i++)
    assert.ok(Number.isFinite(colors.getX(i)) && colors.getY(i) > 0);
  geometry.dispose();
  cylinder.geometry.dispose();
  cylinder.material.dispose();
});
