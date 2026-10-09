// The playground: a live chart driven by a state object that the page owns,
// exactly as an application would. Every control replaces `bodyState` and
// passes the complete mapping to `chart.update()`.

const {
  BodyChart,
  ViewSide,
  MUSCLE_MAP,
  MUSCLE_GROUPS,
  MUSCLE_METADATA,
  MUSCLE_PAIRS,
  createIntensityColorScale,
  setBilateralSelection,
  setGroupSelection,
} = window.BodyMuscles;

// Resting regions take the site's warm neutral, resolved live by the browser so
// they follow theme changes without an update.
const intensityColor = createIntensityColorScale({ 0: "var(--region-rest, #94a3b8)" });

const SIDE_NAMES = { left: "subject's left", right: "subject's right", central: "central" };
const VIEW_NAMES = { FRONT: "anterior", BACK: "posterior" };
const FIGURE_TITLES = {
  FRONT: "Fig. 1 — Anterior view.",
  BACK: "Fig. 1 — Posterior view.",
  BOTH: "Fig. 1 — Anterior and posterior views.",
};
const CANONICAL_ORDER = MUSCLE_MAP.map((muscle) => muscle.id);
const HAS_PAIR = Object.fromEntries(MUSCLE_PAIRS.flat().map((id) => [id, true]));

// A recorded session, so the first view already shows intensity.
const SAMPLE_STATE = {
  "chest-upper-left": { intensity: 8, selected: false },
  "chest-upper-right": { intensity: 8, selected: false },
  "chest-lower-left": { intensity: 6, selected: false },
  "chest-lower-right": { intensity: 6, selected: false },
  "shoulder-front-left": { intensity: 5, selected: false },
  "shoulder-front-right": { intensity: 5, selected: false },
  "abs-upper-left": { intensity: 2, selected: false },
  "abs-upper-right": { intensity: 2, selected: false },
};

const $ = (id) => document.getElementById(id);
const els = {
  workbench: $("playground"),
  chart: $("chartContainer"),
  figureTitle: $("figureTitle"),
  chips: $("groupChips"),
  reset: $("resetButton"),
  regionStatus: $("regionStatus"),
  regionEmpty: $("regionEmpty"),
  regionDetail: $("regionDetail"),
  regionName: $("regionName"),
  regionId: $("regionId"),
  regionMeta: $("regionMeta"),
  slider: $("intensitySlider"),
  sliderRegion: $("intensitySliderRegion"),
  intensity: $("regionIntensity"),
  bilateral: $("bilateralButton"),
  selectionCount: $("selectionCount"),
  selectionEmpty: $("selectionEmpty"),
  selectionList: $("selectionList"),
  stateCode: $("stateCode"),
};

let bodyState = { ...SAMPLE_STATE };
let inspectedId = null;

// Browsers may restore a different radio on reload, so start from the checked one.
const initialView = document.querySelector('input[name="view"]:checked').value;
els.figureTitle.textContent = FIGURE_TITLES[initialView];

const chart = new BodyChart(els.chart, {
  view: ViewSide[initialView],
  bodyState,
  intensityColor,
  onMuscleClick(id) {
    const current = bodyState[id];
    inspectedId = id;
    commit({ ...bodyState, [id]: { intensity: current?.intensity ?? 0, selected: !current?.selected } });
  },
});

/** Replace the state and bring every view of it up to date. */
function commit(next) {
  bodyState = next;
  chart.update({ bodyState });
  renderInspector();
  renderChips();
  renderSelection();
  renderStateCode();
}

const isSelected = (id) => bodyState[id]?.selected === true;

// ── Intensity ramp shared by the legend and sliders ─────────────────────
{
  const levels = Array.from({ length: 11 }, (_, level) => intensityColor(level));
  const step = 100 / levels.length;
  const stops = levels.map((color, i) => `${color} ${(i * step).toFixed(2)}% ${((i + 1) * step).toFixed(2)}%`);
  els.workbench.style.setProperty("--ramp", `linear-gradient(90deg, ${stops.join(", ")})`);
}

// ── View ────────────────────────────────────────────────────────────────
for (const radio of document.querySelectorAll('input[name="view"]')) {
  radio.addEventListener("change", () => {
    chart.update({ view: ViewSide[radio.value] });
    els.figureTitle.textContent = FIGURE_TITLES[radio.value];
  });
}

// ── Group chips ─────────────────────────────────────────────────────────
const chipButtons = {};
for (const group of Object.keys(MUSCLE_GROUPS)) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.textContent = group;
  chip.addEventListener("click", () => commit(setGroupSelection(bodyState, group, "toggle")));
  els.chips.append(chip);
  chipButtons[group] = chip;
}

function renderChips() {
  for (const [group, ids] of Object.entries(MUSCLE_GROUPS)) {
    chipButtons[group].setAttribute("aria-pressed", String(ids.every(isSelected)));
  }
}

els.reset.addEventListener("click", () => {
  inspectedId = null;
  commit({});
});

// ── Inspector ───────────────────────────────────────────────────────────
els.slider.addEventListener("input", () => {
  if (!inspectedId) return;
  commit({ ...bodyState, [inspectedId]: { intensity: Number(els.slider.value), selected: true } });
});

els.bilateral.addEventListener("click", () => {
  if (inspectedId) commit(setBilateralSelection(bodyState, inspectedId, "toggle"));
});

function renderInspector() {
  els.regionEmpty.hidden = inspectedId !== null;
  els.regionDetail.hidden = inspectedId === null;
  els.regionStatus.hidden = inspectedId === null;
  if (!inspectedId) return;

  const region = MUSCLE_METADATA[inspectedId];
  const state = bodyState[inspectedId] ?? { intensity: 0, selected: false };

  els.regionName.textContent = region.name;
  els.regionId.textContent = region.id;
  els.regionMeta.textContent = `${region.group} · ${SIDE_NAMES[region.side]} · ${VIEW_NAMES[region.view]}`;
  els.regionStatus.textContent = state.selected ? "Selected" : "Not selected";
  els.regionStatus.dataset.state = state.selected ? "on" : "off";

  els.sliderRegion.textContent = ` of ${region.name}`;
  els.intensity.textContent = `${state.intensity} / 10`;
  els.slider.setAttribute("aria-valuetext", `${state.intensity} of 10`);
  // Never move a control the visitor is operating.
  if (document.activeElement !== els.slider) els.slider.value = String(state.intensity);

  els.bilateral.hidden = !HAS_PAIR[inspectedId];
  const counterpartSelected = setBilateralSelection(bodyState, inspectedId, "select") === bodyState;
  els.bilateral.textContent = counterpartSelected ? "Deselect both sides" : "Select both sides";
}

// ── Selection list ──────────────────────────────────────────────────────
// Rows are keyed by region and reused, so a slider being dragged or a focused
// checkbox is never replaced underneath the visitor.
const rows = new Map();

function createRow(id) {
  const name = MUSCLE_METADATA[id].name;
  const item = document.createElement("li");
  item.className = "selection-row";
  item.dataset.regionId = id;

  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.className = "checkbox";
  toggle.setAttribute("aria-label", `${name} selected`);
  toggle.addEventListener("change", () => {
    commit({ ...bodyState, [id]: { intensity: bodyState[id]?.intensity ?? 0, selected: toggle.checked } });
  });

  const label = document.createElement("span");
  label.className = "selection-row-name";
  label.textContent = name;
  label.title = id;

  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "range";
  slider.min = "0";
  slider.max = "10";
  slider.step = "1";
  slider.setAttribute("aria-label", `${name} intensity`);
  slider.addEventListener("input", () => {
    commit({ ...bodyState, [id]: { intensity: Number(slider.value), selected: true } });
  });

  const value = document.createElement("span");
  value.className = "selection-row-value";
  value.setAttribute("aria-hidden", "true");

  item.append(toggle, label, slider, value);
  return { item, toggle, slider, value };
}

function renderSelection() {
  const selected = CANONICAL_ORDER.filter(isSelected);
  els.selectionCount.textContent = String(selected.length);
  els.selectionEmpty.hidden = selected.length > 0;

  // Remember focus so a removed row can hand it to a neighbour.
  const focused = document.activeElement;
  const focusedRow = els.selectionList.contains(focused) ? focused.closest(".selection-row") : null;
  const focusedId = focusedRow?.dataset.regionId;
  const focusedField = focused?.type === "range" ? "slider" : "toggle";
  const focusedIndex = focusedRow ? [...els.selectionList.children].indexOf(focusedRow) : -1;

  for (const [id, row] of rows) {
    if (isSelected(id)) continue;
    row.item.remove();
    rows.delete(id);
  }

  selected.forEach((id, index) => {
    let row = rows.get(id);
    if (!row) {
      row = createRow(id);
      rows.set(id, row);
    }
    const { intensity } = bodyState[id];
    row.toggle.checked = true;
    row.value.textContent = String(intensity);
    row.slider.setAttribute("aria-valuetext", `${intensity} of 10`);
    if (document.activeElement !== row.slider) row.slider.value = String(intensity);
    const current = els.selectionList.children[index];
    if (current !== row.item) els.selectionList.insertBefore(row.item, current ?? null);
  });

  if (focusedId && !els.selectionList.contains(document.activeElement)) {
    const neighbour = rows.get(selected[Math.min(focusedIndex, selected.length - 1)]);
    const fallback = chipButtons[MUSCLE_METADATA[focusedId].group];
    (neighbour?.[focusedField] ?? fallback).focus();
  }
}

// ── State listing ───────────────────────────────────────────────────────
function renderStateCode() {
  const entries = CANONICAL_ORDER.filter((id) => bodyState[id]).map(
    (id) => `    "${id}": { intensity: ${bodyState[id].intensity}, selected: ${bodyState[id].selected} },`,
  );
  els.stateCode.textContent =
    entries.length === 0
      ? "chart.update({ bodyState: {} });"
      : ["chart.update({", "  bodyState: {", ...entries, "  },", "});"].join("\n");

  if (window.hljs) {
    delete els.stateCode.dataset.highlighted;
    window.hljs.highlightElement(els.stateCode);
  }
}

renderInspector();
renderChips();
renderSelection();
renderStateCode();
