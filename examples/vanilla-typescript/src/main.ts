import {
  BodyChart,
  ViewSide,
  createBodyPartState,
  type BodyState,
  type MuscleId,
} from "@emmorts/body-muscles";

// ── Application state ──────────────────────────────────
// The consumer owns the state. The chart renders whatever it is given and never
// keeps a second copy, so there is no synchronisation to get wrong.
const bodyState: BodyState = {
  "biceps-left": createBodyPartState(7, true),
  "chest-upper-left": createBodyPartState(4, false),
};

let view: ViewSide = ViewSide.FRONT;
let clickSuffix = "";

const log = requireElement("log");
const container = requireElement("chart");

function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id} element`);
  return element;
}

// ── Chart lifecycle ────────────────────────────────────
let chart = createChart();

function createChart(): BodyChart {
  const instance = new BodyChart(container, {
    view,
    bodyState,
    onMuscleClick: handleMuscleClick,
    onMuscleHover: (id) => {
      if (id) log.textContent = `Hovering ${id}`;
    },
  });
  log.textContent = "Chart mounted";
  return instance;
}

/** Replace the chart: `destroy()` detaches every listener and removes its DOM. */
function rebuildChart(): void {
  chart.destroy();
  chart = createChart();
  log.textContent = "Chart rebuilt after destroy()";
}

function handleMuscleClick(id: MuscleId, name: string): void {
  const current = bodyState[id] ?? createBodyPartState();
  bodyState[id] = { intensity: current.intensity, selected: !current.selected };
  // `bodyState` replaces the whole mapping, so pass the mapping we just edited.
  chart.update({ bodyState });
  log.textContent = `${name}${clickSuffix} is now ${bodyState[id].selected ? "selected" : "unselected"}`;
}

function setView(next: ViewSide): void {
  view = next;
  // Changing the view rebuilds the chart and drops focus; other option changes
  // are applied in place.
  chart.update({ view });
  syncViewButtons();
}

function syncViewButtons(): void {
  for (const [id, side] of [
    ["view-front", ViewSide.FRONT],
    ["view-back", ViewSide.BACK],
    ["view-both", ViewSide.BOTH],
  ] as const) {
    requireElement(id).setAttribute("aria-pressed", String(view === side));
  }
}

// ── Controls ───────────────────────────────────────────
requireElement("view-front").addEventListener("click", () => setView(ViewSide.FRONT));
requireElement("view-back").addEventListener("click", () => setView(ViewSide.BACK));
requireElement("view-both").addEventListener("click", () => setView(ViewSide.BOTH));

// Callbacks can be swapped at runtime, exactly like any other option.
requireElement("replace-callbacks").addEventListener("click", () => {
  clickSuffix = clickSuffix === "" ? " (new callback)" : "";
  chart.update({ onMuscleClick: handleMuscleClick });
  log.textContent = `Callbacks replaced${clickSuffix ? " with the decorated handler" : ""}`;
});

requireElement("rebuild").addEventListener("click", rebuildChart);

syncViewButtons();

// A real application would also tear down on navigation:
window.addEventListener("beforeunload", () => chart.destroy());
