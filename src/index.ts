// Main class export
export { BodyChart } from "./BodyChart";
export type { BodyChartOptions } from "./BodyChart";

// Type exports
export * from "./types";

// Data exports
export {
  MUSCLE_MAP,
  MUSCLE_DEFS,
  MUSCLE_GROUPS,
  INTENSITY_COLORS,
  FRONT_MUSCLES,
  BACK_MUSCLES,
  getMuscleDef,
  isMuscleId,
} from "./data";
export type { MuscleDef, MuscleSpec, FrontMuscleId, BackMuscleId } from "./data";

// Utility exports
export {
  getMuscleColor,
  filterMuscles,
  resolveIntensityColor,
  createIntensityColorScale,
} from "./utils";
