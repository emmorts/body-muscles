const { BodyChart, ViewSide, MUSCLE_GROUPS, MUSCLE_MAP, INTENSITY_COLORS } = window.BodyMuscles;

// Display names come from the library's anatomy data rather than being derived
// from the identifier, which would read "Hand Left" instead of "Left Hand".
const MUSCLE_NAMES = Object.fromEntries(MUSCLE_MAP.map((muscle) => [muscle.id, muscle.name]));

// ── Theme ──────────────────────────────────────────────
const THEME_KEY = "body-muscles-theme";

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
  // Toggle icon visibility
  const sun = document.querySelector(".icon-sun");
  const moon = document.querySelector(".icon-moon");
  if (sun && moon) {
    sun.style.display = theme === "dark" ? "none" : "block";
    moon.style.display = theme === "dark" ? "block" : "none";
  }
  // Toggle hljs theme
  const dark = document.getElementById("hljs-theme-dark");
  const light = document.getElementById("hljs-theme-light");
  if (dark && light) {
    dark.disabled = theme !== "dark";
    light.disabled = theme === "dark";
  }
}

const initial = getStoredTheme() || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
applyTheme(initial);

document.getElementById("themeToggle").addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

// ── State ──────────────────────────────────────────────
let currentView = ViewSide.FRONT;
let bodyState = {};
let selectedMuscleId = null;

// ── Chart ──────────────────────────────────────────────
const chartContainer = document.getElementById("chartContainer");

let chart = new BodyChart(chartContainer, {
  view: currentView,
  bodyState,
  onMuscleClick: handleMuscleClick,
  onMuscleHover: () => {},
});

function handleMuscleClick(id, name) {
  selectedMuscleId = id;
  const cur = bodyState[id] || { intensity: 0, selected: false };
  bodyState = { ...bodyState, [id]: { ...cur, selected: !cur.selected } };
  chart.update({ bodyState });
  renderSelectedCard();
  renderStats();
  renderGroupChips();
  renderGroupMuscles();
}

// ── View Toggle ────────────────────────────────────────
document.querySelectorAll(".view-toggle button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    if (view === currentView) return;
    currentView = view;
    document.querySelectorAll(".view-toggle button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    chart.update({ view: ViewSide[view] });
  });
});

// ── Selected Card ──────────────────────────────────────
// The card is rendered once and then updated in place: rebuilding it on every
// input would replace the slider mid-interaction and drop keyboard focus.
const selectedEmpty = document.getElementById("selectedEmpty");
const selectedDetail = document.getElementById("selectedDetail");
const selectedName = document.getElementById("selectedName");
const selectedBadge = document.getElementById("selectedBadge");
const selectedIdEl = document.getElementById("selectedId");
const selectedIntensity = document.getElementById("selectedIntensity");
const intensitySlider = document.getElementById("intensitySlider");
const intensitySliderLabel = document.getElementById("intensitySliderLabel");

function renderSelectedCard() {
  if (!selectedMuscleId) {
    selectedEmpty.hidden = false;
    selectedDetail.hidden = true;
    return;
  }

  const state = bodyState[selectedMuscleId] || { intensity: 0, selected: false };
  const name = MUSCLE_NAMES[selectedMuscleId] || selectedMuscleId;

  selectedEmpty.hidden = true;
  selectedDetail.hidden = false;
  selectedName.textContent = name;
  selectedBadge.textContent = state.selected ? "Active" : "Inactive";
  selectedBadge.className = `badge ${state.selected ? "badge-blue" : "badge-gray"}`;
  selectedIdEl.textContent = selectedMuscleId;
  selectedIntensity.textContent = `${state.intensity} / 10`;
  intensitySliderLabel.textContent = `${name} intensity`;
  intensitySlider.setAttribute("aria-valuetext", `${state.intensity} of 10`);
  // Leave the control alone while the user is dragging or arrowing it.
  if (document.activeElement !== intensitySlider) {
    intensitySlider.value = String(state.intensity);
  }
}

intensitySlider.addEventListener("input", () => {
  if (!selectedMuscleId) return;
  const val = parseInt(intensitySlider.value, 10);
  bodyState[selectedMuscleId] = { intensity: val, selected: true };
  chart.update({ bodyState });
  renderSelectedCard();
  renderStats();
  renderGroupChips();
  renderGroupMuscles();
});

// ── Stats ──────────────────────────────────────────────
function renderStats() {
  const entries = Object.values(bodyState).filter((s) => s && s.selected);
  const count = entries.length;
  const avg = count > 0 ? (entries.reduce((s, e) => s + e.intensity, 0) / count).toFixed(1) : "0";
  document.getElementById("statSelected").textContent = count;
  document.getElementById("statAvg").textContent = avg;
}

// ── Intensity Bar ──────────────────────────────────────
(function renderIntensityBar() {
  const bar = document.getElementById("intensityBar");
  for (let i = 0; i <= 10; i++) {
    const s = document.createElement("div");
    s.className = "intensity-swatch";
    s.style.background = INTENSITY_COLORS[i];
    s.style.color = i >= 8 ? "#fff" : "#1e293b";
    s.textContent = i;
    s.title = `Level ${i}`;
    bar.appendChild(s);
  }
})();

// ── Group Chips ────────────────────────────────────────
let activeGroup = null;

const groupChipsContainer = document.getElementById("groupChips");
const groupChipButtons = new Map();

for (const [group, muscles] of Object.entries(MUSCLE_GROUPS)) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "group-chip";
  chip.textContent = group;
  chip.setAttribute("aria-pressed", "false");
  chip.addEventListener("click", () => {
    const allSel = muscles.every((id) => bodyState[id]?.selected);
    muscles.forEach((id) => {
      bodyState[id] = { intensity: bodyState[id]?.intensity ?? 0, selected: !allSel };
    });
    chart.update({ bodyState });
    activeGroup = !allSel ? group : activeGroup === group ? null : activeGroup;
    renderGroupChips();
    renderGroupMuscles();
    renderStats();
    renderSelectedCard();
  });
  groupChipsContainer.appendChild(chip);
  groupChipButtons.set(group, chip);
}

function renderGroupChips() {
  for (const [group, muscles] of Object.entries(MUSCLE_GROUPS)) {
    const allSelected = muscles.every((id) => bodyState[id]?.selected);
    const chip = groupChipButtons.get(group);
    chip.classList.toggle("active", allSelected);
    chip.setAttribute("aria-pressed", allSelected ? "true" : "false");
  }
}
renderGroupChips();

// ── Group Muscle List ──────────────────────────────────
// Rows are keyed by muscle id and reused: a row is only created when its muscle
// first appears and only removed when it is deselected, so the slider being
// dragged (and any focused control) is never replaced underneath the user.
const groupMusclesCard = document.getElementById("groupMusclesCard");
const groupMusclesList = document.getElementById("groupMusclesList");
const groupMusclesTitle = document.getElementById("groupMusclesTitle");
const muscleRows = new Map();

function createMuscleRow(id) {
  const name = MUSCLE_NAMES[id] || id;

  const row = document.createElement("div");
  row.className = "muscle-item";
  row.dataset.muscleId = id;

  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.className = "muscle-item-toggle";
  toggle.dataset.muscleId = id;
  toggle.setAttribute("aria-label", `${name} selected`);
  toggle.addEventListener("change", () => {
    bodyState[id] = { intensity: bodyState[id]?.intensity ?? 0, selected: toggle.checked };
    chart.update({ bodyState });
    renderGroupChips();
    renderStats();
    renderGroupMuscles();
    if (selectedMuscleId === id) renderSelectedCard();
  });

  const nameEl = document.createElement("span");
  nameEl.className = "muscle-item-name";
  nameEl.textContent = name;
  nameEl.title = id;

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "10";
  slider.step = "1";
  slider.className = "muscle-item-slider";
  slider.dataset.muscleId = id;
  slider.setAttribute("aria-label", `${name} intensity`);
  slider.addEventListener("input", () => {
    const val = parseInt(slider.value, 10);
    bodyState[id] = { intensity: val, selected: true };
    chart.update({ bodyState });
    valEl.textContent = String(val);
    slider.setAttribute("aria-valuetext", `${val} of 10`);
    renderGroupChips();
    renderStats();
    if (selectedMuscleId === id) renderSelectedCard();
  });

  const valEl = document.createElement("span");
  valEl.className = "muscle-item-value";

  row.append(toggle, nameEl, slider, valEl);
  return { row, toggle, slider, value: valEl };
}

function renderGroupMuscles() {
  // Find first active group if none explicitly set
  if (!activeGroup) {
    for (const [group, muscles] of Object.entries(MUSCLE_GROUPS)) {
      if (muscles.some((id) => bodyState[id]?.selected)) {
        activeGroup = group;
        break;
      }
    }
  }

  // Collect all selected muscles (across all groups)
  const selectedIds = Object.entries(bodyState)
    .filter(([, s]) => s?.selected)
    .map(([id]) => id);

  if (selectedIds.length === 0) {
    groupMusclesCard.style.display = "none";
    activeGroup = null;
    for (const entry of muscleRows.values()) entry.row.remove();
    muscleRows.clear();
    return;
  }

  groupMusclesCard.style.display = "";
  groupMusclesTitle.textContent = activeGroup
    ? `${activeGroup} — ${selectedIds.length} muscles`
    : `${selectedIds.length} muscles selected`;

  // Show muscles from active group first, then any other selected
  const groupMuscles = activeGroup ? MUSCLE_GROUPS[activeGroup] || [] : [];
  const ordered = [
    ...groupMuscles.filter((id) => bodyState[id]?.selected),
    ...selectedIds.filter((id) => !groupMuscles.includes(id)),
  ];

  // Remember what had focus so a removed or reordered row can hand it on.
  const focused = document.activeElement;
  const focusWasInRows = groupMusclesList.contains(focused);
  const focusedId = focusWasInRows ? focused.closest(".muscle-item")?.dataset.muscleId : undefined;
  const focusedField = focused?.classList.contains("muscle-item-slider") ? "slider" : "toggle";

  for (const [id, entry] of [...muscleRows]) {
    if (ordered.includes(id)) continue;
    entry.row.remove();
    muscleRows.delete(id);
  }

  ordered.forEach((id, index) => {
    let entry = muscleRows.get(id);
    if (!entry) {
      entry = createMuscleRow(id);
      muscleRows.set(id, entry);
    }
    const state = bodyState[id] || { intensity: 0, selected: false };
    entry.toggle.checked = !!state.selected;
    entry.value.textContent = String(state.intensity);
    entry.slider.setAttribute("aria-valuetext", `${state.intensity} of 10`);
    if (document.activeElement !== entry.slider) {
      entry.slider.value = String(state.intensity);
    }
    const current = groupMusclesList.children[index];
    if (current !== entry.row) {
      groupMusclesList.insertBefore(entry.row, current || null);
    }
  });

  if (focusWasInRows && !groupMusclesList.contains(document.activeElement)) {
    const restored = focusedId ? muscleRows.get(focusedId) : null;
    const fallback = groupMusclesList.querySelector(".muscle-item-toggle, .muscle-item-slider");
    (restored?.[focusedField] || fallback || document.getElementById("btnCloseGroup")).focus();
  }
}

document.getElementById("btnCloseGroup").addEventListener("click", () => {
  activeGroup = null;
  document.getElementById("groupMusclesCard").style.display = "none";
});

// ── Actions ────────────────────────────────────────────
document.getElementById("btnReset").addEventListener("click", () => {
  bodyState = {};
  selectedMuscleId = null;
  activeGroup = null;
  chart.update({ bodyState });
  renderSelectedCard();
  renderStats();
  renderGroupChips();
  renderGroupMuscles();
});

document.getElementById("btnExport").addEventListener("click", () => {
  const json = JSON.stringify(bodyState, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bodymap-state.json";
  a.click();
  URL.revokeObjectURL(url);
});

// ── Install Copy Button ────────────────────────────────
const installCopyBtn = document.getElementById("installCopyBtn");
if (installCopyBtn) {
  installCopyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText("npm install @emmorts/body-muscles").then(() => {
      installCopyBtn.classList.add("copied");
      installCopyBtn.querySelector(".icon-copy").style.display = "none";
      installCopyBtn.querySelector(".icon-check").style.display = "block";
      setTimeout(() => {
        installCopyBtn.classList.remove("copied");
        installCopyBtn.querySelector(".icon-copy").style.display = "block";
        installCopyBtn.querySelector(".icon-check").style.display = "none";
      }, 2000);
    });
  });
}
