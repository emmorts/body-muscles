import type { MuscleId } from "../types";

/**
 * Canonical bilateral counterparts, ordered [subject's left, subject's right].
 * Each pair represents the same region in the same anatomical view. Central or
 * unpaired regions are omitted; selection helpers act on those regions alone.
 * Relationships are explicit rather than inferred by editing identifier strings.
 */
export const MUSCLE_PAIRS = [
  ["neck-left", "neck-right"],
  ["shoulder-front-left", "shoulder-front-right"],
  ["shoulder-side-left", "shoulder-side-right"],
  ["biceps-left", "biceps-right"],
  ["forearm-left", "forearm-right"],
  ["chest-upper-left", "chest-upper-right"],
  ["chest-lower-left", "chest-lower-right"],
  ["abs-upper-left", "abs-upper-right"],
  ["abs-lower-left", "abs-lower-right"],
  ["serratus-anterior-left", "serratus-anterior-right"],
  ["obliques-left", "obliques-right"],
  ["hip-flexor-left", "hip-flexor-right"],
  ["quads-left", "quads-right"],
  ["adductors-left", "adductors-right"],
  ["tibialis-anterior-left", "tibialis-anterior-right"],
  ["knee-left", "knee-right"],
  ["foot-left", "foot-right"],
  ["elbow-left", "elbow-right"],
  ["hand-left", "hand-right"],
  ["traps-upper-left", "traps-upper-right"],
  ["traps-mid-left", "traps-mid-right"],
  ["traps-lower-left", "traps-lower-right"],
  ["lats-upper-left", "lats-upper-right"],
  ["lats-mid-left", "lats-mid-right"],
  ["lats-lower-left", "lats-lower-right"],
  ["deltoid-rear-left", "deltoid-rear-right"],
  ["triceps-long-left", "triceps-long-right"],
  ["triceps-lateral-left", "triceps-lateral-right"],
  ["forearm-flexors-left", "forearm-flexors-right"],
  ["forearm-extensors-left", "forearm-extensors-right"],
  ["hand-back-left", "hand-back-right"],
  ["lower-back-erectors-left", "lower-back-erectors-right"],
  ["lower-back-ql-left", "lower-back-ql-right"],
  ["gluteus-medius-left", "gluteus-medius-right"],
  ["gluteus-maximus-left", "gluteus-maximus-right"],
  ["knee-back-left", "knee-back-right"],
  ["calves-gastroc-medial-left", "calves-gastroc-medial-right"],
  ["calves-gastroc-lateral-left", "calves-gastroc-lateral-right"],
  ["calves-soleus-left", "calves-soleus-right"],
  ["hamstrings-medial-left", "hamstrings-medial-right"],
  ["hamstrings-lateral-left", "hamstrings-lateral-right"],
  ["foot-back-left", "foot-back-right"],
] as const satisfies readonly (readonly [MuscleId, MuscleId])[];
