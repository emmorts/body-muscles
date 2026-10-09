import { INTENSITY_COLORS } from "../data";
import type { BodyPartState, IntensityColorResolver } from "../types";

/**
 * Clamp any intensity value into the 0-10 palette range.
 *
 * The chart validates intensities at its API boundary, but consumers own the
 * state mapping and may mutate it between updates, so rendering stays
 * defensive: never throw here, round and clamp instead.
 */
function clampIntensity(intensity: number): number {
  return Math.min(Math.max(Math.round(intensity), 0), 10);
}

/**
 * Default intensity colour resolver: the exported `INTENSITY_COLORS` palette.
 *
 * Values are rounded and clamped to 0-10; anything outside the palette falls
 * back to the neutral level-0 colour.
 */
export function resolveIntensityColor(intensity: number): string {
  return INTENSITY_COLORS[clampIntensity(intensity)] ?? INTENSITY_COLORS[0];
}

/**
 * Build an intensity colour resolver from a custom intensity→colour palette.
 *
 * Intensities are rounded and clamped to 0-10; levels missing from the palette
 * fall back to the default palette via `resolveIntensityColor`.
 *
 * @example
 * ```ts
 * const chart = new BodyChart(el, {
 *   view: ViewSide.FRONT,
 *   bodyState: {},
 *   intensityColor: createIntensityColorScale({ 0: "#e5e7eb", 5: "#f59e0b", 10: "#dc2626" }),
 * });
 * ```
 */
export function createIntensityColorScale(
  colors: Record<number, string>,
): IntensityColorResolver {
  return (intensity) =>
    colors[clampIntensity(intensity)] ?? resolveIntensityColor(intensity);
}

/**
 * Get the fill colour for a muscle based on its state.
 *
 * @param state - Body part state supplying the intensity
 * @param isHovered - Reserved; hover styling is applied through the region filter
 * @param resolver - Intensity colour resolver (default: the exported palette)
 */
export function getMuscleColor(
  state: BodyPartState,
  isHovered: boolean,
  resolver: IntensityColorResolver = resolveIntensityColor,
): string {
  return resolver(state.intensity);
}
