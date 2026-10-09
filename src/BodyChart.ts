import { filterMuscles, getMuscleColor } from "./utils";
import { ViewSide, MuscleId, BodyState, BodyPartState } from "./types";
import type { MuscleDef } from "./data";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Configuration options for the BodyChart
 */
export interface BodyChartOptions {
  /** Current anatomical view (FRONT, BACK, or BOTH) */
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
  /** Enable custom instant tooltip (default: true) */
  showTooltip?: boolean;
  /** Optional custom tooltip content formatter */
  tooltipFormatter?: (muscle: MuscleDef, state?: BodyPartState) => string;
}

type ResolvedOptions = Required<BodyChartOptions>;

function resolveOptions(options: BodyChartOptions): ResolvedOptions {
  return {
    className: "",
    ariaLabel: "",
    showViewLabel: false,
    enableTransitions: true,
    showTooltip: true,
    tooltipFormatter: (muscle) => muscle.name,
    onMuscleClick: () => {},
    onMuscleHover: () => {},
    ...options,
  };
}

/**
 * BodyChart — Framework-agnostic interactive SVG body map
 *
 * Renders a detailed human body with 70+ clickable muscle regions into any DOM element.
 * Supports front, back, and side-by-side views, intensity visualization (0-10 scale),
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
 * // Switch to back view
 * chart.update({ view: ViewSide.BACK });
 *
 * // Show both views side-by-side
 * chart.update({ view: ViewSide.BOTH });
 *
 * // Cleanup
 * chart.destroy();
 * ```
 */
export class BodyChart {
  private static instanceCounter = 0;

  private container: HTMLElement;
  private options: ResolvedOptions;
  private hoveredMuscle: MuscleId | null = null;
  private wrapperEl: HTMLDivElement | null = null;
  private svgEl: SVGSVGElement | null = null;
  private labelEl: HTMLDivElement | null = null;
  private tooltipEl: HTMLDivElement | null = null;
  private tooltipId: string = "";
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
    this.hideTooltip();
    for (const fn of this.eventCleanup) fn();
    this.eventCleanup = [];
    this.musclePaths.clear();
    this.muscleData = [];

    if (this.tooltipEl && this.wrapperEl?.contains(this.tooltipEl)) {
      this.wrapperEl.removeChild(this.tooltipEl);
    }
    if (this.wrapperEl && this.container.contains(this.wrapperEl)) {
      this.container.removeChild(this.wrapperEl);
    }
    this.wrapperEl = null;
    this.svgEl = null;
    this.labelEl = null;
    this.tooltipEl = null;
  }

  // ── Build ────────────────────────────────────────────────

  private build(): void {
    const { view, className, ariaLabel, showViewLabel, enableTransitions } =
      this.options;
    this.muscleData = filterMuscles(view);
    const isBoth = view === ViewSide.BOTH;
    const viewBox = isBoth
      ? "0 0 72 93"
      : view === ViewSide.FRONT
        ? "0 0 35 93"
        : "37 0 35 93";

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
    this.wrapperEl.setAttribute(
      "aria-label",
      ariaLabel ||
        (isBoth
          ? "Anterior and posterior body map views"
          : `${view === ViewSide.FRONT ? "Anterior" : "Posterior"} body map view`),
    );

    // SVG
    this.svgEl = document.createElementNS(SVG_NS, "svg");
    this.svgEl.setAttribute("viewBox", viewBox);
    this.svgEl.classList.add("body-chart-svg");
    this.svgEl.setAttribute("aria-hidden", "true");
    setStyles(this.svgEl as unknown as HTMLElement, {
      height: "auto",
      width: "100%",
      maxHeight: "70vh",
      maxWidth: isBoth ? "760px" : "400px",
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

    // Optional view label(s)
    if (showViewLabel) {
      if (isBoth) {
        this.labelEl = this.buildViewLabel("Anterior View", 25);
        this.wrapperEl.appendChild(this.labelEl);
        const posteriorLabel = this.buildViewLabel("Posterior View", 75);
        this.wrapperEl.appendChild(posteriorLabel);
      } else {
        this.labelEl = this.buildViewLabel(
          `${view === ViewSide.FRONT ? "Anterior" : "Posterior"} View`,
          50,
        );
        this.wrapperEl.appendChild(this.labelEl);
      }
    }

    // Instant Tooltip DOM
    this.buildTooltip();

    // Hide tooltip when tapping outside wrapper
    const onDocumentPointerDown = (e: PointerEvent) => {
      if (this.wrapperEl && !this.wrapperEl.contains(e.target as Node)) {
        this.hideTooltip();
      }
    };
    document.addEventListener("pointerdown", onDocumentPointerDown);
    this.eventCleanup.push(() => {
      document.removeEventListener("pointerdown", onDocumentPointerDown);
    });

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

  private buildTooltip(): void {
    if (!this.options.showTooltip || !this.wrapperEl) return;

    BodyChart.instanceCounter++;
    this.tooltipId = `body-chart-tooltip-${BodyChart.instanceCounter}`;

    this.tooltipEl = document.createElement("div");
    this.tooltipEl.id = this.tooltipId;
    this.tooltipEl.className = "body-chart-tooltip";
    this.tooltipEl.setAttribute("role", "tooltip");
    this.tooltipEl.setAttribute("aria-hidden", "true");

    setStyles(this.tooltipEl, {
      position: "absolute",
      top: "0",
      left: "0",
      pointerEvents: "none",
      opacity: "0",
      visibility: "hidden",
      transition: "opacity 120ms ease-out, transform 120ms ease-out",
      zIndex: "50",
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      color: "#f8fafc",
      padding: "0.35rem 0.65rem",
      borderRadius: "0.5rem",
      fontSize: "0.75rem",
      fontWeight: "500",
      lineHeight: "1.2",
      whiteSpace: "nowrap",
      boxShadow:
        "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.25)",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      transform: "translate3d(0, 0, 0)",
    });

    this.wrapperEl.appendChild(this.tooltipEl);
  }

  private showTooltipAt(
    content: string,
    clientX: number,
    clientY: number,
  ): void {
    if (!this.tooltipEl || !this.wrapperEl || !this.options.showTooltip) return;

    this.tooltipEl.textContent = content;
    this.tooltipEl.style.visibility = "visible";
    this.tooltipEl.style.opacity = "1";
    this.tooltipEl.setAttribute("aria-hidden", "false");

    const wrapperRect = this.wrapperEl.getBoundingClientRect();
    const tooltipRect = this.tooltipEl.getBoundingClientRect();

    // Center horizontally over cursor/target point, position above target point
    let left = clientX - wrapperRect.left - tooltipRect.width / 2;
    let top = clientY - wrapperRect.top - tooltipRect.height - 10;

    // Boundary collision detection
    const padding = 8;
    const maxLeft = Math.max(
      padding,
      wrapperRect.width - tooltipRect.width - padding,
    );
    const minLeft = padding;

    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;

    // Flip below if overflowing wrapper top boundary
    if (top < padding) {
      top = clientY - wrapperRect.top + 16;
    }

    // Clamp vertical position so tooltip stays visible within container
    const maxTop = Math.max(
      padding,
      wrapperRect.height - tooltipRect.height - padding,
    );
    if (top > maxTop) top = maxTop;
    if (top < padding) top = padding;

    this.tooltipEl.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
  }

  private hideTooltip(): void {
    if (!this.tooltipEl) return;
    this.tooltipEl.style.opacity = "0";
    this.tooltipEl.style.visibility = "hidden";
    this.tooltipEl.setAttribute("aria-hidden", "true");
  }

  private buildMusclePath(muscle: MuscleDef): SVGPathElement {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", muscle.path);
    path.classList.add("body-chart-muscle");
    path.setAttribute("role", "button");
    path.setAttribute("tabindex", "0");

    const getTooltipText = () => {
      const state = this.options.bodyState[muscle.id];
      return this.options.tooltipFormatter(muscle, state);
    };

    // Event listeners
    const onPointerEnter = (e: PointerEvent) => {
      this.hoveredMuscle = muscle.id;
      this.options.onMuscleHover(muscle.id);
      this.refreshPath(muscle.id);
      this.showTooltipAt(getTooltipText(), e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (this.hoveredMuscle === muscle.id) {
        this.showTooltipAt(getTooltipText(), e.clientX, e.clientY);
      }
    };

    const onPointerLeave = () => {
      const prev = this.hoveredMuscle;
      this.hoveredMuscle = null;
      this.options.onMuscleHover(null);
      if (prev) this.refreshPath(prev);
      this.hideTooltip();
    };

    const onFocus = () => {
      this.hoveredMuscle = muscle.id;
      this.refreshPath(muscle.id);
      if (this.tooltipId) {
        path.setAttribute("aria-describedby", this.tooltipId);
      }
      const rect = path.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const topY = rect.top;
      this.showTooltipAt(getTooltipText(), centerX, topY);
    };

    const onBlur = () => {
      const prev = this.hoveredMuscle;
      this.hoveredMuscle = null;
      if (prev) this.refreshPath(prev);
      path.removeAttribute("aria-describedby");
      this.hideTooltip();
    };

    const onClick = () => {
      this.options.onMuscleClick(muscle.id, muscle.name);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.options.onMuscleClick(muscle.id, muscle.name);
      } else if (e.key === "Escape") {
        this.hideTooltip();
      }
    };

    path.addEventListener("pointerenter", onPointerEnter);
    path.addEventListener("pointermove", onPointerMove);
    path.addEventListener("pointerleave", onPointerLeave);
    path.addEventListener("focus", onFocus);
    path.addEventListener("blur", onBlur);
    path.addEventListener("click", onClick);
    path.addEventListener("keydown", onKeyDown);

    this.eventCleanup.push(() => {
      path.removeEventListener("pointerenter", onPointerEnter);
      path.removeEventListener("pointermove", onPointerMove);
      path.removeEventListener("pointerleave", onPointerLeave);
      path.removeEventListener("focus", onFocus);
      path.removeEventListener("blur", onBlur);
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

  private buildViewLabel(
    text: string,
    horizontalCenter: number,
  ): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "body-chart-view-label";
    el.setAttribute("aria-hidden", "true");
    setStyles(el, {
      position: "absolute",
      bottom: "1rem",
      left: `${horizontalCenter}%`,
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
    el.textContent = text;
    return el;
  }
}

// ── Helpers ──────────────────────────────────────────────

function setStyles(el: HTMLElement, styles: Record<string, string>) {
  for (const [k, v] of Object.entries(styles)) {
    (el.style as unknown as Record<string, string>)[k] = v;
    const kebab = k.replace(/([A-Z])/g, "-$1").toLowerCase();
    el.style.setProperty(kebab, v);
  }
}
