// Main class export
export { BodyChart } from "./BodyChart";
export type { BodyChartOptions } from "./BodyChart";

// Type exports
export * from "./types";

// Data exports
export { MUSCLE_MAP, MUSCLE_GROUPS, INTENSITY_COLORS, FRONT_MUSCLES, BACK_MUSCLES } from "./data";
export type { MuscleDef } from "./data";

// Utility exports
export {
  getMuscleColor,
  filterMuscles,
  resolveIntensityColor,
  createIntensityColorScale,
} from "./utils";
