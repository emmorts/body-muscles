import { ViewSide } from "../types";
import { FRONT_MUSCLES } from "./muscles.front";
import { BACK_MUSCLES } from "./muscles.back";

export { MUSCLE_GROUPS } from "./muscle-groups";
export type { MuscleDef } from "./types";

/**
 * Complete muscle map - all 70+ anatomical regions
 * Combines front and back view muscle definitions
 */
export const MUSCLE_MAP = [...FRONT_MUSCLES, ...BACK_MUSCLES];

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
