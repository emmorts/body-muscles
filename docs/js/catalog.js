// Region catalog, generated from the library's exported anatomy data so an
// added or renamed region never needs a second list maintained here.
import { copyText } from "./ui.js";

const { MUSCLE_MAP, MUSCLE_GROUPS, MUSCLE_METADATA, FRONT_MUSCLES, BACK_MUSCLES } = window.BodyMuscles;

const SVG_NS = "http://www.w3.org/2000/svg";
const VIEW_NAMES = { FRONT: "Anterior", BACK: "Posterior" };
const SIDE_NAMES = { left: "subject's left", right: "subject's right", central: "central" };

const regions = MUSCLE_MAP.map((muscle) => MUSCLE_METADATA[muscle.id]);
const describe = (region) => `${region.group} · ${SIDE_NAMES[region.side]} · ${VIEW_NAMES[region.view]}`;

const form = document.getElementById("catalogControls");
const search = document.getElementById("catalogSearch");
const groupSelect = document.getElementById("catalogGroup");
const sideSelect = document.getElementById("catalogSide");
const viewSelect = document.getElementById("catalogView");
const count = document.getElementById("catalogCount");
const caption = document.getElementById("catalogPreviewCaption");
const results = document.getElementById("catalogResults");

for (const group of Object.keys(MUSCLE_GROUPS)) groupSelect.append(new Option(group, group));

// Decorative previews drawn from the chart's geometry; the caption carries the description.
const previewPaths = new Map();
for (const [container, muscles, viewBox] of [
  [document.getElementById("catalogPreviewFront"), FRONT_MUSCLES, "0 0 35 93"],
  [document.getElementById("catalogPreviewBack"), BACK_MUSCLES, "37 0 35 93"],
]) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("focusable", "false");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("catalog-preview-svg");
  for (const muscle of muscles) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", muscle.path);
    path.classList.add("catalog-preview-path");
    svg.append(path);
    previewPaths.set(muscle.id, path);
  }
  container.append(svg);
}

const rowButtons = new Map();
let activeId = null;

function setActive(id) {
  if (id === activeId) return;
  rowButtons.get(activeId)?.removeAttribute("aria-current");
  previewPaths.get(activeId)?.classList.remove("is-active");
  activeId = id;
  rowButtons.get(id)?.setAttribute("aria-current", "true");
  previewPaths.get(id)?.classList.add("is-active");
  const region = MUSCLE_METADATA[id];
  caption.textContent = `${region.name} (${id}) · ${describe(region)} view`;
}

function createRow(region) {
  const item = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "catalog-row";
  if (region.id === activeId) button.setAttribute("aria-current", "true");

  const code = document.createElement("code");
  code.textContent = region.id;
  const name = document.createElement("span");
  name.className = "catalog-row-name";
  name.textContent = region.name;
  const meta = document.createElement("span");
  meta.className = "catalog-row-meta";
  meta.textContent = describe(region);

  // The preview follows keyboard focus as well as the pointer.
  button.addEventListener("focus", () => setActive(region.id));
  button.addEventListener("pointerenter", () => setActive(region.id));
  button.addEventListener("click", () => copyText(region.id, null, `Copied ${region.id}`));

  button.append(code, name, meta);
  item.append(button);
  rowButtons.set(region.id, button);
  return item;
}

function render() {
  const term = search.value.trim().toLowerCase();
  const group = groupSelect.value;
  const side = sideSelect.value;
  const view = viewSelect.value;

  const matches = regions.filter(
    (region) =>
      (!group || region.group === group) &&
      (!side || region.side === side) &&
      (!view || region.view === view) &&
      (!term || `${region.id} ${region.name} ${describe(region)}`.toLowerCase().includes(term)),
  );

  rowButtons.clear();
  results.replaceChildren(...matches.map(createRow));
  count.textContent = `${matches.length} of ${regions.length} regions`;

  if (matches.length === 0) {
    previewPaths.get(activeId)?.classList.remove("is-active");
    activeId = null;
    caption.textContent = "No regions match these filters.";
  } else if (!matches.some((region) => region.id === activeId)) {
    setActive(matches[0].id);
  }
}

form.addEventListener("submit", (event) => event.preventDefault());
search.addEventListener("input", render);
for (const select of [groupSelect, sideSelect, viewSelect]) select.addEventListener("change", render);

render();
