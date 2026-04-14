import { INTENSITY_COLORS } from "../data";
import { BodyPartState } from "../types";

/**
 * Get the fill color for a muscle based on its state and hover
 */
export function getMuscleColor(state: BodyPartState, isHovered: boolean): string {
  if (state.intensity > 0) {
    const roundedIntensity = Math.min(Math.round(state.intensity), 10);
    return INTENSITY_COLORS[roundedIntensity] || INTENSITY_COLORS[10];
  }
  return INTENSITY_COLORS[0];
}
