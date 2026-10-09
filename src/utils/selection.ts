import { MUSCLE_GROUPS, MUSCLE_MAP, MUSCLE_PAIRS } from "../data";
import type { MuscleGroup } from "../data";
import type { BodyState, MuscleId } from "../types";

/** Toggle selects the whole target set unless every member is already selected. */
export type SelectionAction = "select" | "deselect" | "toggle";

const BILATERAL_IDS = new Map<MuscleId, readonly MuscleId[]>();
for (const pair of MUSCLE_PAIRS) {
  BILATERAL_IDS.set(pair[0], pair);
  BILATERAL_IDS.set(pair[1], pair);
}
for (const muscle of MUSCLE_MAP) {
  if (!BILATERAL_IDS.has(muscle.id)) BILATERAL_IDS.set(muscle.id, [muscle.id]);
}

function setSelection(state: BodyState, ids: readonly MuscleId[], action: SelectionAction): BodyState {
  const selected = action === "toggle"
    ? !ids.every((id) => state[id]?.selected)
    : action === "select";
  let next = state;
  for (const id of ids) {
    const current = state[id];
    if (!!current?.selected === selected) continue;
    if (next === state) next = { ...state };
    next[id] = current ? { ...current, selected } : { intensity: 0, selected };
  }
  return next;
}

/**
 * Select, deselect, or toggle a complete canonical group, across both views.
 * Preserves intensities and unrelated state without mutating the input. Missing
 * selected entries start at intensity 0; deselecting a missing entry leaves it
 * absent. No-op operations return the original mapping; unchanged entries are
 * shared. Pass the result as the complete `bodyState` replacement to `update()`.
 */
export function setGroupSelection(state: BodyState, group: MuscleGroup, action: SelectionAction): BodyState {
  return setSelection(state, MUSCLE_GROUPS[group], action);
}

/**
 * Apply one selection action to a region and its canonical bilateral counterpart.
 * Either side addresses the same pair. Central/unpaired regions act alone.
 * Uses the same immutable, intensity-preserving semantics as setGroupSelection.
 */
export function setBilateralSelection(state: BodyState, id: MuscleId, action: SelectionAction): BodyState {
  return setSelection(state, BILATERAL_IDS.get(id)!, action);
}
