const { BodyChart, ViewSide, MUSCLE_GROUPS, INTENSITY_COLORS } = window.BodyMuscles;

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
function renderSelectedCard() {
  const el = document.getElementById("selectedInfo");
  if (!selectedMuscleId) {
    el.innerHTML = '<span style="font-style:italic">Click a body part to see details</span>';
    return;
  }
  const state = bodyState[selectedMuscleId] || { intensity: 0, selected: false };
  const name = selectedMuscleId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.35rem">
      <strong style="color:var(--accent);font-size:1rem">${name}</strong>
      <span class="badge ${state.selected ? "badge-blue" : "badge-gray"}">${state.selected ? "Active" : "Inactive"}</span>
    </div>
    <div style="font-size:.78rem;color:var(--fg-muted);font-family:var(--font-mono);margin-bottom:.5rem">${selectedMuscleId}</div>
    <div class="info-row">
      <span class="info-label">Intensity</span>
      <span class="info-value">${state.intensity} / 10</span>
    </div>
    <div style="margin-top:.5rem">
      <input type="range" min="0" max="10" step="1" value="${state.intensity}"
        style="width:100%;accent-color:var(--accent)"
        id="intensitySlider" />
    </div>
  `;
  document.getElementById("intensitySlider")?.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    bodyState[selectedMuscleId] = { intensity: val, selected: true };
    chart.update({ bodyState });
    renderSelectedCard();
    renderStats();
  });
}

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

function renderGroupChips() {
  const container = document.getElementById("groupChips");
  container.innerHTML = "";
  for (const [group, muscles] of Object.entries(MUSCLE_GROUPS)) {
    const isAllSelected = muscles.every((id) => bodyState[id]?.selected);
    const chip = document.createElement("button");
    chip.className = `group-chip${isAllSelected ? " active" : ""}`;
    chip.textContent = group;
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
    });
    container.appendChild(chip);
  }
}
renderGroupChips();

// ── Group Muscle List ──────────────────────────────────
function renderGroupMuscles() {
  const card = document.getElementById("groupMusclesCard");
  const list = document.getElementById("groupMusclesList");
  const title = document.getElementById("groupMusclesTitle");

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
    card.style.display = "none";
    activeGroup = null;
    return;
  }

  card.style.display = "";
  title.textContent = activeGroup ? `${activeGroup} — ${selectedIds.length} muscles` : `${selectedIds.length} muscles selected`;

  // Show muscles from active group first, then any other selected
  const groupMuscles = activeGroup ? MUSCLE_GROUPS[activeGroup] || [] : [];
  const groupSelected = groupMuscles.filter((id) => bodyState[id]?.selected);
  const otherSelected = selectedIds.filter((id) => !groupSelected.includes(id));
  const ordered = [...groupSelected, ...otherSelected];

  list.innerHTML = "";
  list.className = "muscle-list";

  for (const id of ordered) {
    const state = bodyState[id] || { intensity: 0, selected: false };
    const name = id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const row = document.createElement("div");
    row.className = "muscle-item";

    // Toggle checkbox
    const toggle = document.createElement("div");
    toggle.className = `muscle-item-toggle${state.selected ? " active" : ""}`;
    toggle.addEventListener("click", () => {
      bodyState[id] = { ...bodyState[id], selected: !bodyState[id]?.selected };
      chart.update({ bodyState });
      renderGroupMuscles();
      renderGroupChips();
      renderStats();
    });

    // Name
    const nameEl = document.createElement("span");
    nameEl.className = "muscle-item-name";
    nameEl.textContent = name;
    nameEl.title = id;

    // Slider
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "10";
    slider.step = "1";
    slider.value = state.intensity;
    slider.className = "muscle-item-slider";
    slider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      bodyState[id] = { intensity: val, selected: true };
      chart.update({ bodyState });
      valEl.textContent = val;
      renderStats();
      // Update selected card if this muscle is shown there
      if (selectedMuscleId === id) renderSelectedCard();
    });

    // Value label
    const valEl = document.createElement("span");
    valEl.className = "muscle-item-value";
    valEl.textContent = state.intensity;

    row.appendChild(toggle);
    row.appendChild(nameEl);
    row.appendChild(slider);
    row.appendChild(valEl);
    list.appendChild(row);
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
