import { MuscleId, MuscleSide, ViewSide } from "../types";
import type { MuscleGroup } from "./muscle-groups";

/**
 * Canonical anatomy metadata for one region.
 *
 * `side` is the **subject's own** left/right (anatomical convention), not the
 * viewer's: `biceps-left` is on the subject's left arm, which is drawn on the
 * right-hand side of the anterior view.
 */
export interface MuscleMetadata {
  /** Region identifier */
  id: MuscleId;
  /** Display name, identical to the region definition */
  name: string;
  /** Which anatomical view the region is drawn in */
  view: ViewSide;
  /** Anatomical side, from the subject's perspective */
  side: MuscleSide;
  /** Display group name — a key of `MUSCLE_GROUPS` */
  group: MuscleGroup;
}

/**
 * SVG path definition for a muscle region
 */
export interface MuscleDef {
  /** Unique muscle identifier */
  id: MuscleId;
  /** Display name (e.g., "Left Biceps", "Right Front Shoulder") */
  name: string;
  /** SVG path data for the 'd' attribute */
  path: string;
  /** Which anatomical view this muscle belongs to */
  view: ViewSide;
}
