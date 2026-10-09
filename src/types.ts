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
 * Unique identifier for a muscle or body part
 * Format: {muscle_group}-{side} or {muscle_group}-{sub_group}-{side}
 *
 * @example
 * 'biceps-left'
 * 'shoulder-front-left'
 * 'abs-upper-right'
 * 'spine' // Central/singular parts
 */
export type MuscleId = string;

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
 * Must return a concrete CSS colour value (for example `#ef4444` or
 * `hsl(0 84% 60%)`); `var()` references are not resolved where the resolver
 * output is written to the SVG `fill` presentation attribute.
 *
 * @param intensity - Intensity value on the active scale (0-10 by default)
 * @returns A CSS colour string
 */
export type IntensityColorResolver = (intensity: number) => string;

/**
 * Intensity level type guard
 * @param value - Number to check
 * @returns true if value is a valid intensity (0-10)
 */
export function isValidIntensity(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 10;
}

/**
 * Create a new BodyPartState with default values
 * @param intensity - Initial intensity (default: 0)
 * @param selected - Initial selection state (default: false)
 * @returns New BodyPartState object
 */
export function createBodyPartState(intensity: number = 0, selected: boolean = false): BodyPartState {
  if (!isValidIntensity(intensity)) {
    throw new Error(`Invalid intensity: ${intensity}. Must be 0-10.`);
  }
  return { intensity, selected };
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
