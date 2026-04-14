import { FRONT_MUSCLES, BACK_MUSCLES } from "../data";
import type { MuscleDef } from "../data";
import { ViewSide } from "../types";

/**
 * Get muscle definitions filtered by anatomical view
 */
export function filterMuscles(view: ViewSide): MuscleDef[] {
  return view === ViewSide.FRONT ? FRONT_MUSCLES : BACK_MUSCLES;
}
