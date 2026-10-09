import type { MuscleId } from "../types";
import { extractMuscleSide } from "../types";
import type { MuscleDef, MuscleMetadata } from "./types";
import { MUSCLE_GROUPS } from "./muscle-groups";
import type { MuscleGroup } from "./muscle-groups";
import { FRONT_MUSCLES } from "./muscles.front";
import { BACK_MUSCLES } from "./muscles.back";

export { MUSCLE_GROUPS };
export { MUSCLE_PAIRS } from "./muscle-pairs";
export type { MuscleGroup } from "./muscle-groups";
export type { MuscleDef, MuscleMetadata } from "./types";
export type { MuscleSpec, MuscleEntry } from "./muscle-spec";
export type { FrontMuscleId } from "./muscles.front";
export type { BackMuscleId } from "./muscles.back";

/**
 * Complete muscle map - all 70+ anatomical regions
 * Combines front and back view muscle definitions
 */
export const MUSCLE_MAP: MuscleDef[] = [...FRONT_MUSCLES, ...BACK_MUSCLES];

/**
 * Region definitions keyed by identifier, for direct property access:
 * `MUSCLE_DEFS["biceps-left"]`. TypeScript rejects unknown literal keys; use
 * `getMuscleDef` for identifiers that are only known at runtime.
 */
export const MUSCLE_DEFS: Record<MuscleId, MuscleDef> = Object.fromEntries(
  MUSCLE_MAP.map((muscle) => [muscle.id, muscle]),
) as Record<MuscleId, MuscleDef>;

/**
 * Look up a region definition by identifier.
 *
 * Unknown identifiers return `undefined` rather than throwing, so dynamic input
 * (URL parameters, stored state, user input) can be handled without a cast.
 */
export function getMuscleDef(id: string): MuscleDef | undefined {
  if (!Object.prototype.hasOwnProperty.call(MUSCLE_DEFS, id)) return undefined;
  return (MUSCLE_DEFS as Record<string, MuscleDef>)[id];
}

/**
 * Type guard for region identifiers. Narrows an arbitrary string to `MuscleId`
 * after verifying it exists in the dataset.
 */
export function isMuscleId(value: string): value is MuscleId {
  return Object.prototype.hasOwnProperty.call(MUSCLE_DEFS, value);
}

/** Group name for every region, inverted from the canonical group table. */
const GROUP_BY_ID: Record<string, MuscleGroup> = {};
for (const group of Object.keys(MUSCLE_GROUPS) as MuscleGroup[]) {
  for (const id of MUSCLE_GROUPS[group]) GROUP_BY_ID[id] = group;
}

/**
 * Canonical anatomy metadata for every region, keyed by identifier.
 *
 * `side` comes from the identifier convention through `extractMuscleSide`, and
 * `group` from `MUSCLE_GROUPS`, so metadata, the group table, and the exported
 * helpers cannot drift apart. Sides are the **subject's** left/right; see
 * `MuscleMetadata`.
 */
export const MUSCLE_METADATA: Record<MuscleId, MuscleMetadata> = Object.fromEntries(
  MUSCLE_MAP.map((muscle) => [
    muscle.id,
    {
      id: muscle.id,
      name: muscle.name,
      view: muscle.view,
      side: extractMuscleSide(muscle.id),
      group: GROUP_BY_ID[muscle.id],
    },
  ]),
) as Record<MuscleId, MuscleMetadata>;

/**
 * Look up anatomy metadata by identifier. Unknown identifiers return
 * `undefined`, so dynamic input needs no cast.
 */
export function getMuscleMetadata(id: string): MuscleMetadata | undefined {
  if (!Object.prototype.hasOwnProperty.call(MUSCLE_METADATA, id)) return undefined;
  return (MUSCLE_METADATA as Record<string, MuscleMetadata>)[id];
}

/**
 * Pre-filtered front view muscles for performance
 */
export { FRONT_MUSCLES };

/**
 * Pre-filtered back view muscles for performance
 */
export { BACK_MUSCLES };

/**
 * Intensity color gradient mapping (0-10 scale)
 * Colors progress from yellow (low) → orange (mid) → red (high)
 */
export const INTENSITY_COLORS: Record<number, string> = {
  0: "#94a3b8", // Slate 400 (inactive/neutral)
  1: "#fde047", // Yellow 300
  2: "#facc15", // Yellow 400
  3: "#eab308", // Yellow 500
  4: "#fb923c", // Orange 400
  5: "#f97316", // Orange 500
  6: "#ea580c", // Orange 600
  7: "#ef4444", // Red 500
  8: "#dc2626", // Red 600
  9: "#b91c1c", // Red 700
  10: "#7f1d1d", // Red 900
};
