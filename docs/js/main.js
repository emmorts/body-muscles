import { initCodeBlocks, initContents, initSiteMeta, initTabs, initTheme } from "./ui.js";
import "./playground.js";
import "./catalog.js";

initTheme();
initTabs();
initCodeBlocks();
initContents();
initSiteMeta();

const { MUSCLE_MAP, MUSCLE_GROUPS } = window.BodyMuscles;
document.querySelector('[data-spec="regions"]').textContent = String(MUSCLE_MAP.length);
document.querySelector('[data-spec="groups"]').textContent = String(Object.keys(MUSCLE_GROUPS).length);
