import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MUSCLE_GROUPS, MUSCLE_PAIRS, MUSCLE_METADATA,
  setGroupSelection, setBilateralSelection,
} from "../dist/esm/index.js";

function freezeState(state) {
  for (const entry of Object.values(state)) Object.freeze(entry);
  return Object.freeze(state);
}

test("mixed group toggle selects the whole group without changing intensities or unrelated state", () => {
  const state = freezeState({
    "biceps-left": { intensity: 7, selected: true },
    "biceps-right": { intensity: 3, selected: false },
    head: { intensity: 9, selected: true },
  });
  const next = setGroupSelection(state, "Arms", "toggle");
  assert.ok(MUSCLE_GROUPS.Arms.every(id => next[id].selected));
  assert.deepEqual(next["biceps-left"], { intensity: 7, selected: true });
  assert.deepEqual(next["biceps-right"], { intensity: 3, selected: true });
  assert.deepEqual(next["triceps-long-left"], { intensity: 0, selected: true });
  assert.strictEqual(next.head, state.head);
  assert.deepEqual(state["biceps-right"], { intensity: 3, selected: false });
  assert.equal(state["triceps-long-left"], undefined);
});

test("fully selected group toggle deselects every member while preserving each intensity", () => {
  const state = freezeState(Object.fromEntries(
    MUSCLE_GROUPS.Arms.map((id, i) => [id, { intensity: i % 11, selected: true }]),
  ));
  const next = setGroupSelection(state, "Arms", "toggle");
  for (const id of MUSCLE_GROUPS.Arms) {
    assert.deepEqual(next[id], { intensity: state[id].intensity, selected: false });
    assert.equal(state[id].selected, true);
  }
});

test("explicit selection is idempotent and deselection preserves sparse mappings", () => {
  const state = freezeState({
    "biceps-left": { intensity: 8, selected: true },
    "forearm-right": { intensity: 6, selected: false },
    spine: { intensity: 4, selected: true },
  });
  const cleared = setGroupSelection(state, "Arms", "deselect");
  assert.deepEqual(Object.keys(cleared).sort(), Object.keys(state).sort());
  assert.deepEqual(cleared["biceps-left"], { intensity: 8, selected: false });
  assert.strictEqual(cleared["forearm-right"], state["forearm-right"]);
  assert.strictEqual(cleared.spine, state.spine);
  const selected = setGroupSelection(cleared, "Arms", "select");
  assert.strictEqual(setGroupSelection(selected, "Arms", "select"), selected);
  assert.strictEqual(setGroupSelection(cleared, "Arms", "deselect"), cleared);
});

test("either side toggles only its exact bilateral counterpart, not neighbouring regions", () => {
  const state = freezeState({
    "triceps-long-left": { intensity: 10, selected: true },
    "triceps-long-right": { intensity: 2, selected: false },
    "triceps-lateral-right": { intensity: 5, selected: false },
    "biceps-left": { intensity: 7, selected: true },
  });
  const next = setBilateralSelection(state, "triceps-long-right", "toggle");
  assert.deepEqual(next, setBilateralSelection(state, "triceps-long-left", "toggle"));
  assert.deepEqual(next["triceps-long-left"], { intensity: 10, selected: true });
  assert.deepEqual(next["triceps-long-right"], { intensity: 2, selected: true });
  assert.strictEqual(next["triceps-lateral-right"], state["triceps-lateral-right"]);
  assert.strictEqual(next["biceps-left"], state["biceps-left"]);
  const cleared = setBilateralSelection(next, "triceps-long-left", "toggle");
  assert.deepEqual(cleared["triceps-long-left"], { intensity: 10, selected: false });
  assert.deepEqual(cleared["triceps-long-right"], { intensity: 2, selected: false });
  assert.equal(state["triceps-long-right"].selected, false);
});

test("central and absent unpaired regions act alone without inheriting another region's intensity", () => {
  const state = freezeState({ spine: { intensity: 6, selected: false }, head: { intensity: 4, selected: true } });
  const next = setBilateralSelection(state, "spine", "select");
  assert.deepEqual(next.spine, { intensity: 6, selected: true });
  assert.strictEqual(next.head, state.head);
  const cleared = setBilateralSelection(next, "spine", "deselect");
  assert.deepEqual(cleared.spine, { intensity: 6, selected: false });
  assert.strictEqual(cleared.head, state.head);
  const added = setBilateralSelection(state, "nape", "toggle");
  assert.deepEqual(added.nape, { intensity: 0, selected: true });
  assert.strictEqual(added.spine, state.spine);
  assert.strictEqual(added.head, state.head);
  assert.strictEqual(setBilateralSelection(state, "nape", "deselect"), state);
});

test("canonical pairs cannot overlap or cross anatomical side, view or group boundaries", () => {
  const seen = new Set();
  for (const [left, right] of MUSCLE_PAIRS) {
    assert.equal(MUSCLE_METADATA[left].side, "left", left);
    assert.equal(MUSCLE_METADATA[right].side, "right", right);
    assert.equal(MUSCLE_METADATA[left].view, MUSCLE_METADATA[right].view, left);
    assert.equal(MUSCLE_METADATA[left].group, MUSCLE_METADATA[right].group, left);
    assert.equal(seen.has(left), false, left);
    assert.equal(seen.has(right), false, right);
    seen.add(left);
    seen.add(right);
  }
});
