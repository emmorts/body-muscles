import { FRONT_MUSCLES, BACK_MUSCLES } from "../data";
import type { MuscleDef } from "../data";
import { ViewSide } from "../types";

/**
 * Get muscle definitions filtered by anatomical view.
 * Returns all muscles for the BOTH side-by-side view.
 */
export function filterMuscles(view: ViewSide): MuscleDef[] {
  if (view === ViewSide.BOTH) {
    return [...FRONT_MUSCLES, ...BACK_MUSCLES];
  }
  return view === ViewSide.FRONT ? FRONT_MUSCLES : BACK_MUSCLES;
}
