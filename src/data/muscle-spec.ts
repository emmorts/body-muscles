import type { ViewSide } from "../types";

/**
 * Source shape of one anatomy data entry, as written in the data files.
 */
export interface MuscleSpec {
  /** Unique muscle identifier */
  id: string;
  /** Display name (e.g., "Left Biceps", "Right Front Shoulder") */
  name: string;
  /** SVG path data for the 'd' attribute */
  path: string;
  /** Which anatomical view this muscle belongs to */
  view: ViewSide;
}

/**
 * An anatomy entry whose `id` keeps its string literal type while the other
 * fields stay widened.
 */
export interface MuscleEntry<Id extends string = string> {
  id: Id;
  name: string;
  path: string;
  view: ViewSide;
}

/**
 * Declare an anatomy array so each entry keeps its `id` as a string literal —
 * which is what lets `MuscleId` be derived from the dataset rather than
 * maintained by hand — while `name` and `path` stay plain `string`.
 *
 * A bare `as const` would also turn every SVG path into a literal type, and
 * those are emitted into the public declarations.
 */
export function defineMuscles<const T extends readonly MuscleSpec[]>(
  list: T,
): { readonly [K in keyof T]: MuscleEntry<T[K]["id"]> } {
  return list as unknown as { readonly [K in keyof T]: MuscleEntry<T[K]["id"]> };
}
