/**
 * Compile-time consumer check for the published type surface.
 *
 * Run with `npm run test:types` (after `npm run build`, since this imports the
 * built declarations). Every `@ts-expect-error` below is load-bearing: if the
 * marked line ever stops failing, TypeScript reports the directive itself as an
 * error, so the check fails loudly.
 */
import {
  BodyChart,
  ViewSide,
  MUSCLE_DEFS,
  MUSCLE_GROUPS,
  MUSCLE_METADATA,
  createBodyPartState,
  getMuscleDef,
  isMuscleId,
} from "../../dist/index";
import type { BodyState, ChartLabels, MuscleGroup, MuscleId, MuscleSide } from "../../dist/index";

const host = document.getElementById("host") ?? document.body;

// Valid literal identifiers work in state and callbacks.
const state: BodyState = {
  "biceps-left": { intensity: 7, selected: true },
  head: createBodyPartState(3),
};

const chart = new BodyChart(host, {
  view: ViewSide.FRONT,
  bodyState: state,
  onMuscleClick: (id, name) => {
    const clicked: MuscleId = id;
    void clicked;
    void name;
  },
});

// Unknown literal identifiers fail compilation.
// @ts-expect-error - "bicepz-left" is not a region identifier
const typo: BodyState = { "bicepz-left": { intensity: 1, selected: false } };

// @ts-expect-error - "not-a-muscle" is not a region identifier
const badId: MuscleId = "not-a-muscle";

// @ts-expect-error - unknown table key
const missingDef = MUSCLE_DEFS["bicepz-left"];

// The typed table resolves known keys without a guard.
const biceps = MUSCLE_DEFS["biceps-left"];
const bicepsName: string = biceps.name;

// Dynamic identifiers keep working, but must be validated first.
const raw: string = new URLSearchParams(location.search).get("muscle") ?? "";
const dynamic: BodyState = isMuscleId(raw) ? { [raw]: createBodyPartState(5) } : {};

// `getMuscleDef` accepts any string and returns undefined for unknown input,
// so it never needs a cast.
const maybeDef = getMuscleDef(raw);
const resolvedName: string = maybeDef?.name ?? "unknown";

// Labels localize every rendered string; each member is optional.
const labels: ChartLabels = {
  chart: () => "Mapa corporal",
  regionName: (muscle) => muscle.id,
  intensity: (value) => `${value}/10`,
  tooltip: (muscle, state) => `${muscle.id}:${state?.intensity ?? 0}`,
  viewLabel: (view) => (view === ViewSide.BACK ? "Vista posterior" : "Vista anterior"),
};

// @ts-expect-error - regionName must return a string
const badLabels: ChartLabels = { regionName: () => 1 };

// Canonical metadata is typed: side and group narrow, unknown keys do not.
const side: MuscleSide = MUSCLE_METADATA["biceps-left"].side;
const group: MuscleGroup = MUSCLE_METADATA["biceps-left"].group;
const groupIds: readonly MuscleId[] = MUSCLE_GROUPS[group];

// @ts-expect-error - unknown metadata key
const missingMetadata = MUSCLE_METADATA["bicepz-left"];

// @ts-expect-error - unknown group name
const wrongGroup: MuscleGroup = "Wings";

chart.update({ bodyState: dynamic, labels });

export {
  typo,
  badId,
  missingDef,
  bicepsName,
  resolvedName,
  badLabels,
  labels,
  side,
  groupIds,
  missingMetadata,
  wrongGroup,
};
