import { filterMuscles, getMuscleColor } from "./utils";
import { ViewSide, MuscleId, BodyState } from "./types";
import type { MuscleDef } from "./data";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Configuration options for the BodyChart
 */
export interface BodyChartOptions {
  /** Current anatomical view (FRONT or BACK) */
  view: ViewSide;
  /** State mapping for all body parts with intensity and selection */
  bodyState: BodyState;
  /** Callback fired when a muscle is clicked */
  onMuscleClick?: (id: MuscleId, name: string) => void;
  /** Callback fired when a muscle hover state changes */
  onMuscleHover?: (id: MuscleId | null) => void;
  /** Optional className for the container element */
  className?: string;
  /** Optional aria-label for accessibility */
  ariaLabel?: string;
  /** Show view indicator label (default: false) */
  showViewLabel?: boolean;
  /** Enable smooth transitions (default: true) */
  enableTransitions?: boolean;
}

type ResolvedOptions = Required<BodyChartOptions>;

function resolveOptions(options: BodyChartOptions): ResolvedOptions {
  return {
    className: "",
    ariaLabel: "",
    showViewLabel: false,
    enableTransitions: true,
    onMuscleClick: () => {},
    onMuscleHover: () => {},
    ...options,
  };
}

/**
 * BodyChart — Framework-agnostic interactive SVG body map
 *
 * Renders a detailed human body with 70+ clickable muscle regions into any DOM element.
 * Supports dual views (anterior/posterior), intensity visualization (0-10 scale),
 * and interactive selection states with visual feedback.
 *
 * @example
 * ```ts
 * const chart = new BodyChart(document.getElementById('container')!, {
 *   view: ViewSide.FRONT,
 *   bodyState: { 'biceps-left': { intensity: 7, selected: true } },
 *   onMuscleClick: (id, name) => console.log(`Clicked: ${name}`),
 * });
 *
 * // Update state
 * chart.update({ bodyState: newState });
 *
 * // Switch view
 * chart.update({ view: ViewSide.BACK });
 *
 * // Cleanup
 * chart.destroy();
 * ```
 */
export class BodyChart {
  private container: HTMLElement;
  private options: ResolvedOptions;
  private hoveredMuscle: MuscleId | null = null;
  private wrapperEl: HTMLDivElement | null = null;
  private svgEl: SVGSVGElement | null = null;
  private labelEl: HTMLDivElement | null = null;
  private musclePaths: Map<string, SVGPathElement> = new Map();
  private muscleData: MuscleDef[] = [];
  private eventCleanup: (() => void)[] = [];

  constructor(container: HTMLElement, options: BodyChartOptions) {
    this.container = container;
    this.options = resolveOptions(options);
    this.build();
  }

  /**
   * Update chart options. Partial updates are merged with current options.
   * Changing `view` triggers a full re-render; other changes update in-place.
   */
  update(options: Partial<BodyChartOptions>): void {
    const viewChanged = options.view !== undefined && options.view !== this.options.view;
    Object.assign(this.options, options);

    if (viewChanged) {
      this.destroy();
      this.build();
    } else {
      this.refreshAllPaths();
    }
  }

  /**
   * Remove the chart from the DOM and clean up all event listeners.
   */
  destroy(): void {
    for (const fn of this.eventCleanup) fn();
    this.eventCleanup = [];
    this.musclePaths.clear();
    this.muscleData = [];

    if (this.wrapperEl && this.container.contains(this.wrapperEl)) {
      this.container.removeChild(this.wrapperEl);
    }
    this.wrapperEl = null;
    this.svgEl = null;
    this.labelEl = null;
  }

  // ── Build ────────────────────────────────────────────────

  private build(): void {
    const { view, className, ariaLabel, showViewLabel, enableTransitions } = this.options;
    this.muscleData = filterMuscles(view);
    const viewBox = view === ViewSide.FRONT ? "0 0 35 93" : "37 0 35 93";

    // Wrapper
    this.wrapperEl = document.createElement("div");
    this.wrapperEl.className = `body-chart-container ${className}`.trim();
    setStyles(this.wrapperEl, {
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "1rem",
    });
    this.wrapperEl.setAttribute("role", "img");
    this.wrapperEl.setAttribute("aria-label", ariaLabel || `${view === ViewSide.FRONT ? "Anterior" : "Posterior"} body map view`);

    // SVG
    this.svgEl = document.createElementNS(SVG_NS, "svg");
    this.svgEl.setAttribute("viewBox", viewBox);
    this.svgEl.classList.add("body-chart-svg");
    this.svgEl.setAttribute("aria-hidden", "true");
    setStyles(this.svgEl as unknown as HTMLElement, {
      height: "auto",
      width: "100%",
      maxHeight: "70vh",
      maxWidth: "400px",
      filter: "drop-shadow(0 4px 20px rgba(0, 0, 0, 0.3))",
      ...(enableTransitions ? { transition: "all 200ms ease-out" } : {}),
    });

    // Defs (SVG filters)
    this.svgEl.appendChild(this.buildDefs());

    // Background silhouette layer
    const bgGroup = document.createElementNS(SVG_NS, "g");
    bgGroup.classList.add("body-chart-background");
    bgGroup.setAttribute("aria-hidden", "true");
    (bgGroup as unknown as HTMLElement).style.opacity = "0.1";
    (bgGroup as unknown as HTMLElement).style.pointerEvents = "none";

    for (const m of this.muscleData) {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", m.path);
      p.setAttribute("fill", "#cbd5e1");
      bgGroup.appendChild(p);
    }
    this.svgEl.appendChild(bgGroup);

    // Interactive muscle paths
    for (const muscle of this.muscleData) {
      const path = this.buildMusclePath(muscle);
      this.svgEl.appendChild(path);
      this.musclePaths.set(muscle.id, path);
    }

    this.wrapperEl.appendChild(this.svgEl);

    // Optional view label
    if (showViewLabel) {
      this.labelEl = this.buildViewLabel(view);
      this.wrapperEl.appendChild(this.labelEl);
    }

    this.container.appendChild(this.wrapperEl);
    this.refreshAllPaths();
  }

  private buildDefs(): SVGDefsElement {
    const defs = document.createElementNS(SVG_NS, "defs");

    // Glow filter
    const glow = document.createElementNS(SVG_NS, "filter");
    glow.setAttribute("id", "glow");
    const blur = document.createElementNS(SVG_NS, "feGaussianBlur");
    blur.setAttribute("stdDeviation", "0.4");
    blur.setAttribute("result", "coloredBlur");
    const merge = document.createElementNS(SVG_NS, "feMerge");
    const mn1 = document.createElementNS(SVG_NS, "feMergeNode");
    mn1.setAttribute("in", "coloredBlur");
    const mn2 = document.createElementNS(SVG_NS, "feMergeNode");
    mn2.setAttribute("in", "SourceGraphic");
    merge.appendChild(mn1);
    merge.appendChild(mn2);
    glow.appendChild(blur);
    glow.appendChild(merge);
    defs.appendChild(glow);

    // Shadow filter
    const shadow = document.createElementNS(SVG_NS, "filter");
    shadow.setAttribute("id", "shadow");
    const ds = document.createElementNS(SVG_NS, "feDropShadow");
    ds.setAttribute("dx", "0");
    ds.setAttribute("dy", "0.2");
    ds.setAttribute("stdDeviation", "0.3");
    ds.setAttribute("flood-opacity", "0.3");
    shadow.appendChild(ds);
    defs.appendChild(shadow);

    return defs;
  }

  private buildMusclePath(muscle: MuscleDef): SVGPathElement {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", muscle.path);
    path.classList.add("body-chart-muscle");
    path.setAttribute("role", "button");
    path.setAttribute("tabindex", "0");

    const title = document.createElementNS(SVG_NS, "title");
    title.textContent = muscle.name;
    path.appendChild(title);

    // Event listeners
    const onEnter = () => {
      this.hoveredMuscle = muscle.id;
      this.options.onMuscleHover(muscle.id);
      this.refreshPath(muscle.id);
    };
    const onLeave = () => {
      const prev = this.hoveredMuscle;
      this.hoveredMuscle = null;
      this.options.onMuscleHover(null);
      if (prev) this.refreshPath(prev);
    };
    const onClick = () => {
      this.options.onMuscleClick(muscle.id, muscle.name);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.options.onMuscleClick(muscle.id, muscle.name);
      }
    };

    path.addEventListener("mouseenter", onEnter);
    path.addEventListener("mouseleave", onLeave);
    path.addEventListener("click", onClick);
    path.addEventListener("keydown", onKeyDown);

    this.eventCleanup.push(() => {
      path.removeEventListener("mouseenter", onEnter);
      path.removeEventListener("mouseleave", onLeave);
      path.removeEventListener("click", onClick);
      path.removeEventListener("keydown", onKeyDown);
    });

    return path;
  }

  // ── State refresh ────────────────────────────────────────

  private refreshAllPaths(): void {
    for (const id of this.musclePaths.keys()) {
      this.refreshPath(id);
    }
  }

  private refreshPath(muscleId: string): void {
    const path = this.musclePaths.get(muscleId);
    if (!path) return;

    const state = this.options.bodyState[muscleId] || { intensity: 0, selected: false };
    const isSelected = state.selected || false;
    const isHovered = this.hoveredMuscle === muscleId;
    const fill = getMuscleColor(state, isHovered);
    const opacity = state.intensity === 0 && !isSelected ? 0.6 : 1;
    const muscle = this.muscleData.find((m) => m.id === muscleId);

    path.setAttribute("fill", fill);
    path.setAttribute("stroke", isSelected ? "#ffffff" : "#1e293b");
    path.setAttribute("stroke-width", isSelected ? "0.3" : "0.1");
    path.setAttribute(
      "aria-label",
      `${muscle?.name || muscleId}${isSelected ? " (selected)" : ""}${state.intensity > 0 ? ` - intensity ${state.intensity}` : ""}`,
    );

    path.style.fillOpacity = String(opacity);
    path.style.filter = isSelected || isHovered ? "url(#glow)" : "none";
    path.style.cursor = "pointer";
    path.style.transition = this.options.enableTransitions ? "all 200ms ease-out" : "none";
    path.style.outline = "none";
  }

  // ── View label ───────────────────────────────────────────

  private buildViewLabel(view: ViewSide): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "body-chart-view-label";
    el.setAttribute("aria-hidden", "true");
    setStyles(el, {
      position: "absolute",
      bottom: "1rem",
      left: "50%",
      transform: "translateX(-50%)",
      color: "#64748b",
      fontSize: "0.875rem",
      fontFamily: "monospace",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      pointerEvents: "none",
      backgroundColor: "rgba(15, 23, 42, 0.5)",
      padding: "0.25rem 0.75rem",
      borderRadius: "9999px",
      backdropFilter: "blur(4px)",
      zIndex: "10",
    });
    el.textContent = `${view === ViewSide.FRONT ? "Anterior" : "Posterior"} View`;
    return el;
  }
}

// ── Helpers ──────────────────────────────────────────────

function setStyles(el: HTMLElement, styles: Record<string, string>) {
  for (const [k, v] of Object.entries(styles)) {
    (el.style as any)[k] = v;
  }
}
