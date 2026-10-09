import type { FrontMuscleId } from "./data/muscles.front";
import type { BackMuscleId } from "./data/muscles.back";

/**
 * Anatomical view direction for the body map
 * @enum
 */
export enum ViewSide {
  /** Anterior (front) view of the body */
  FRONT = "FRONT",
  /** Posterior (back) view of the body */
  BACK = "BACK",
  /** Both anterior and posterior views shown side-by-side */
  BOTH = "BOTH",
}

/**
 * Unique identifier for a muscle or body part.
 *
 * Derived from the canonical anatomy dataset, so a misspelled literal is a
 * compile-time error:
 *
 * @example
 * ```ts
 * const state: BodyState = { 'biceps-left': { intensity: 7, selected: true } };
 * const state: BodyState = { 'bicepz-left': { intensity: 7, selected: true } }; // error
 * ```
 *
 * Identifiers that only exist at runtime (for example a value read from
 * storage) are not narrowed automatically. Verify them with `isMuscleId`, or
 * resolve definitions with `getMuscleDef`, which accepts any string.
 */
export type MuscleId = FrontMuscleId | BackMuscleId;

/**
 * State data for a single body part
 */
export interface BodyPartState {
  /** Intensity level from 0-10 (0 = inactive, 10 = maximum) */
  intensity: number;
  /** Whether this body part is currently selected/highlighted */
  selected: boolean;
}

/**
 * Complete body state mapping muscle IDs to their state
 * Partial record allows sparse representation (only tracked muscles need entries)
 */
export type BodyState = Partial<Record<MuscleId, BodyPartState>>;

/**
 * Resolve the fill colour for an intensity level.
 *
 * Return a valid CSS colour, for example `#ef4444`, `hsl(0 84% 60%)`, or
 * `var(--application-color, #ef4444)`. The browser resolves inherited custom
 * properties on the SVG region; the attribute itself retains the expression.
 *
 * @param intensity - Intensity value on the active scale (0-10 by default)
 * @returns A CSS colour string
 */
export type IntensityColorResolver = (intensity: number) => string;

/**
 * Intensity level type guard.
 *
 * A valid intensity is a finite integer from 0 (inactive) to 10 (maximum).
 * Fractions, negative numbers, values above 10, `NaN`, and infinities are
 * rejected, so untrusted input can be checked before it reaches the chart.
 *
 * @param value - Value to check
 * @returns true if value is a valid intensity (an integer from 0 to 10)
 */
export function isValidIntensity(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 10;
}

/**
 * Create a new BodyPartState with default values
 * @param intensity - Initial intensity (default: 0)
 * @param selected - Initial selection state (default: false)
 * @returns New BodyPartState object
 * @throws Error when `intensity` is not an integer from 0 to 10
 */
export function createBodyPartState(intensity: number = 0, selected: boolean = false): BodyPartState {
  if (!isValidIntensity(intensity)) {
    throw new Error(
      `Invalid intensity: ${String(intensity)}. Expected an integer from 0 to 10.`,
    );
  }
  return { intensity, selected };
}

/**
 * Validate a state mapping before it reaches the chart.
 *
 * Throws a descriptive `Error` for the first entry whose intensity is not an
 * integer from 0 to 10, so invalid input is rejected instead of being silently
 * rounded or clamped. Entries that are `undefined` are allowed, because
 * `BodyState` is a sparse partial record.
 *
 * The chart calls this before applying submitted options or rendering changes.
 * It cannot roll back consumer mutations to previously accepted shared objects.
 *
 * @param bodyState - State mapping to validate
 * @throws Error describing the offending region and value
 */
export function assertValidBodyState(bodyState: BodyState): void {
  for (const [id, entry] of Object.entries(bodyState)) {
    if (entry == null) continue;
    if (!isValidIntensity(entry.intensity)) {
      throw new Error(
        `Invalid bodyState entry for "${id}": intensity ${String(entry.intensity)}. Expected an integer from 0 to 10.`,
      );
    }
  }
}

/**
 * Utility type for muscle side extraction
 */
export type MuscleSide = "left" | "right" | "central";

/**
 * Extract side from muscle ID
 * @param muscleId - Muscle identifier
 * @returns 'left', 'right', or 'central'
 */
export function extractMuscleSide(muscleId: MuscleId): MuscleSide {
  if (muscleId.endsWith("-left")) return "left";
  if (muscleId.endsWith("-right")) return "right";
  return "central";
}

/**
 * Extract muscle group from muscle ID
 * @param muscleId - Muscle identifier
 * @returns Base muscle group name
 */
export function extractMuscleGroup(muscleId: MuscleId): string {
  // Remove side suffix
  const base = muscleId.replace(/-(left|right)$/, "");
  // Take first part before any remaining dash
  return base.split("-")[0];
}
