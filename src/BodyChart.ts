import { filterMuscles, getMuscleColor, resolveIntensityColor } from "./utils";
import { ViewSide, MuscleId, BodyState, BodyPartState, assertValidBodyState } from "./types";
import type { IntensityColorResolver } from "./types";
import type { MuscleDef } from "./data";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Reference a chart CSS custom property (`--bm-*`), falling back to the
 * built-in default so rendered output is unchanged until a consumer overrides
 * the variable. See the README section "Styling and theming".
 */
function bmVar(name: string, fallback: string): string {
  return `var(--bm-${name}, ${fallback})`;
}

/** Shared transition timing, overridable with `--bm-transition-duration`. */
function transitionStyle(): string {
  return `all ${bmVar("transition-duration", "200ms")} ease-out`;
}

/**
 * Shared label resolution for everything the chart renders as text.
 *
 * Every member is optional and falls back to the built-in English wording, so
 * a configuration only has to override what it needs. Resolution order is:
 * the dedicated option (`ariaLabel`, `tooltipFormatter`) first, then the
 * matching `labels` member, then the default.
 *
 * ```ts
 * new BodyChart(el, {
 *   view: ViewSide.FRONT,
 *   bodyState: {},
 *   labels: {
 *     chart: () => "Körperkarte",
 *     regionName: (muscle) => GERMAN_NAMES[muscle.id] ?? muscle.name,
 *     intensity: (value) => `Intensität ${value}`,
 *     viewLabel: (view) => (view === ViewSide.FRONT ? "Vorderansicht" : "Rückansicht"),
 *   },
 * });
 * ```
 */
export interface ChartLabels {
  /** Accessible name of the whole chart. `ariaLabel` takes precedence when set. */
  chart?: (view: ViewSide) => string;
  /** Base display name of a region; defaults to `muscle.name`. */
  regionName?: (muscle: MuscleDef) => string;
  /**
   * Complete accessible name of a region. Defaults to the region name plus the
   * intensity phrase when the region has an intensity above 0.
   * `state` is `undefined` when the consumer's mapping omits the region.
   */
  region?: (muscle: MuscleDef, state: BodyPartState | undefined) => string;
  /** How a numeric intensity is written; defaults to `intensity 7`. */
  intensity?: (value: number) => string;
  /**
   * Tooltip content. `tooltipFormatter` takes precedence when both are set.
   * Defaults to the region name plus the intensity phrase when state exists.
   */
  tooltip?: (muscle: MuscleDef, state: BodyPartState | undefined) => string;
  /**
   * Overlay label for one side; defaults to `Anterior View` / `Posterior View`.
   * Called once per side, so the `BOTH` view labels each half separately.
   */
  viewLabel?: (view: ViewSide) => string;
}

/**
 * Configuration options for the BodyChart
 */
export interface BodyChartOptions {
  /** Current anatomical view (FRONT, BACK, or BOTH) */
  view: ViewSide;
  /**
   * State mapping for all body parts with intensity and selection.
   *
   * `update()` **replaces** this mapping as a whole rather than merging it
   * region by region, so any region the new mapping omits returns to its
   * default (intensity 0, unselected). Spread the previous mapping to keep the
   * entries you are not changing; see {@link BodyChart.update} for examples.
   */
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
  /**
   * Resolve the fill colour for a region from its intensity (default: the
   * exported `INTENSITY_COLORS` palette).
   *
   * Build a custom scale with `createIntensityColorScale`. The resolver must
   * return a concrete CSS colour value; `var()` references are not resolved in
   * the `fill` presentation attribute.
   */
  intensityColor?: IntensityColorResolver;
  /**
   * Localize every string the chart renders: the chart name, region names,
   * accessible region names, tooltips, intensity wording, and view labels.
   * Defaults to English.
   *
   * Like `bodyState`, the object is replaced as a whole by `update()`; spread
   * the current set to change a single member.
   */
  labels?: ChartLabels;
  /**
   * Enable pointer and keyboard interaction (default: true).
   *
   * When `false` the chart is a static visualization exposed to assistive
   * technology as a single labelled graphic: muscle regions are not focusable,
   * hoverable, or clickable, `onMuscleClick`/`onMuscleHover` never fire, and no
   * tooltip is rendered.
   */
  interactive?: boolean;
}

type ResolvedOptions = Omit<Required<BodyChartOptions>, "labels" | "tooltipFormatter"> & {
  /** `undefined` when the consumer did not supply a tooltip formatter. */
  tooltipFormatter?: (muscle: MuscleDef, state?: BodyPartState) => string;
  labels: ChartLabels;
};

function resolveOptions(options: BodyChartOptions): ResolvedOptions {
  return {
    ...options,
    className: options.className ?? "",
    ariaLabel: options.ariaLabel ?? "",
    showViewLabel: options.showViewLabel ?? false,
    enableTransitions: options.enableTransitions ?? true,
    showTooltip: options.showTooltip ?? true,
    tooltipFormatter: options.tooltipFormatter,
    labels: options.labels ?? {},
    intensityColor: options.intensityColor ?? resolveIntensityColor,
    interactive: options.interactive ?? true,
    onMuscleClick: options.onMuscleClick ?? (() => {}),
    onMuscleHover: options.onMuscleHover ?? (() => {}),
  };
}

/**
 * BodyChart — Framework-agnostic interactive SVG body map
 *
 * Renders a detailed human body with 70+ clickable muscle regions into any DOM element.
 * Supports front, back, and side-by-side views, intensity visualization (0-10 scale),
 * and interactive selection states with visual feedback.
 *
 * ## Accessibility
 *
 * The chart is a composite widget with a single tab stop. Only the active region
 * carries `tabindex="0"`; the remaining regions are reachable with the arrow keys,
 * so a keyboard user is never forced through every region to leave the chart.
 *
 * - `ArrowRight` / `ArrowDown`: next region in reading order
 * - `ArrowLeft` / `ArrowUp`: previous region in reading order
 * - `Home` / `End`: first / last region
 * - `Enter` / `Space`: activate the focused region (fires `onMuscleClick`)
 * - `Escape`: dismiss the tooltip
 *
 * Each region is exposed as a toggle button whose pressed state reflects `selected`.
 * Set `interactive: false` for a display-only chart that is announced as a single
 * labelled graphic instead.
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
  private tooltipMuscleId: MuscleId | null = null;
  private tooltipClientX = 0;
  private tooltipClientY = 0;
  private musclePaths: Map<MuscleId, SVGPathElement> = new Map();
  private muscleData: MuscleDef[] = [];
  private tabbableMuscle: MuscleId | null = null;
  private eventCleanup: (() => void)[] = [];
  private motionQuery: MediaQueryList | null = null;

  constructor(container: HTMLElement, options: BodyChartOptions) {
    this.container = container;
    this.options = resolveOptions(options);
    // Validate before mounting so a rejected construction leaves the container empty.
    assertValidBodyState(this.options.bodyState);
    this.build();
  }

  /**
   * Update chart options. Partial updates are merged with the current options;
   * keys whose value is `undefined` are ignored, so callers can pass a spread
   * object without clobbering existing values.
   *
   * The merge is **shallow**: `bodyState`, when provided, replaces the entire
   * mapping instead of merging per region, so any region missing from the new
   * mapping returns to its default (intensity 0, unselected). Preserve the
   * entries you are not changing by spreading the current mapping:
   *
   * ```ts
   * // Replace one region, keep every other region's state.
   * chart.update({
   *   bodyState: { ...current, "biceps-left": { intensity: 7, selected: true } },
   * });
   *
   * // Remove one region's state.
   * const { "biceps-left": removed, ...rest } = current;
   * chart.update({ bodyState: rest });
   * ```
   *
   * The chart never mutates the mapping it receives and keeps no selection
   * state of its own, so the application stays the single source of truth.
   *
   * Changing `view` or `interactive` rebuilds the chart (and therefore drops
   * focus); every other change is applied in place and preserves focus.
   */
  update(options: Partial<BodyChartOptions>): void {
    // Validate before applying submitted options or rendering changes. This
    // cannot roll back consumer mutations to previously accepted shared objects.
    if (options.bodyState !== undefined) assertValidBodyState(options.bodyState);

    const previous = this.options;
    const next = { ...previous };
    for (const [key, value] of Object.entries(options)) {
      if (value === undefined) continue;
      (next as unknown as Record<string, unknown>)[key] = value;
    }

    const rebuild = next.view !== previous.view || next.interactive !== previous.interactive;
    this.options = next;

    if (rebuild) {
      this.destroy();
      this.build();
      return;
    }

    // Explicit updates also refresh mutated/reused label configurations.
    const labelsChanged = options.labels !== undefined;

    if (next.className !== previous.className) this.applyClassName();
    if (next.ariaLabel !== previous.ariaLabel || labelsChanged) this.applyChartLabel();
    if (next.showViewLabel !== previous.showViewLabel || labelsChanged) this.applyViewLabels();
    if (next.showTooltip !== previous.showTooltip) this.applyTooltipPresence();
    if (next.enableTransitions !== previous.enableTransitions) this.applyTransitions();

    this.refreshAllPaths();

    // Consumers may mutate and reuse the state mapping; an explicit state
    // update must refresh an open tooltip even when its reference is unchanged.
    if (
      options.bodyState !== undefined ||
      next.tooltipFormatter !== previous.tooltipFormatter ||
      labelsChanged
    ) {
      this.refreshVisibleTooltip();
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
    this.tabbableMuscle = null;
    this.hoveredMuscle = null;
    this.motionQuery = null;
    this.tooltipMuscleId = null;
    this.tooltipClientX = 0;
    this.tooltipClientY = 0;

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
    this.tooltipId = "";
  }

  // ── Incremental option application ───────────────────────

  private applyClassName(): void {
    if (!this.wrapperEl) return;
    this.wrapperEl.className = `body-chart-container ${this.options.className}`.trim();
  }

  private applyChartLabel(): void {
    if (!this.svgEl) return;
    this.svgEl.setAttribute("aria-label", this.chartName());
  }

  /**
   * Accessible name of the chart: `ariaLabel` wins, then `labels.chart`, then
   * the built-in English default.
   */
  private chartName(): string {
    const { view, ariaLabel, labels } = this.options;
    if (ariaLabel) return ariaLabel;
    if (labels.chart) return labels.chart(view);
    return view === ViewSide.BOTH
      ? "Anterior and posterior body map views"
      : `${view === ViewSide.FRONT ? "Anterior" : "Posterior"} body map view`;
  }

  /** Base display name of a region. */
  private regionName(muscle: MuscleDef): string {
    return this.options.labels.regionName?.(muscle) ?? muscle.name;
  }

  /** How an intensity value is written. */
  private intensityPhrase(value: number): string {
    return this.options.labels.intensity?.(value) ?? `intensity ${value}`;
  }

  /**
   * Accessible name of a region: `labels.region` when provided, otherwise the
   * region name plus the intensity phrase when the region has an intensity.
   */
  private regionLabel(muscle: MuscleDef, state: BodyPartState | undefined): string {
    if (this.options.labels.region) return this.options.labels.region(muscle, state);
    const name = this.regionName(muscle);
    return state && state.intensity > 0
      ? `${name} - ${this.intensityPhrase(state.intensity)}`
      : name;
  }

  /**
   * Tooltip content: `tooltipFormatter` wins, then `labels.tooltip`, then the
   * default region name plus intensity phrase.
   */
  private tooltipText(muscle: MuscleDef, state: BodyPartState | undefined): string {
    if (this.options.tooltipFormatter) return this.options.tooltipFormatter(muscle, state);
    if (this.options.labels.tooltip) return this.options.labels.tooltip(muscle, state);
    const name = this.regionName(muscle);
    return state ? `${name} - ${this.intensityPhrase(state.intensity)}` : name;
  }

  /** Overlay text for one side of the chart. */
  private viewLabelText(view: ViewSide): string {
    return (
      this.options.labels.viewLabel?.(view) ??
      (view === ViewSide.FRONT ? "Anterior View" : "Posterior View")
    );
  }

  /** Replace the view overlay labels to match the current view and option. */
  private applyViewLabels(): void {
    if (!this.wrapperEl) return;
    this.wrapperEl.querySelectorAll(".body-chart-view-label").forEach((el) => el.remove());
    this.labelEl = null;

    if (!this.options.showViewLabel) return;

    if (this.options.view === ViewSide.BOTH) {
      this.labelEl = this.buildViewLabel(this.viewLabelText(ViewSide.FRONT), 25);
      this.wrapperEl.appendChild(this.labelEl);
      this.wrapperEl.appendChild(this.buildViewLabel(this.viewLabelText(ViewSide.BACK), 75));
    } else {
      this.labelEl = this.buildViewLabel(this.viewLabelText(this.options.view), 50);
      this.wrapperEl.appendChild(this.labelEl);
    }
  }

  /**
   * Create or remove the tooltip element so `showTooltip` can be toggled at
   * runtime without leaking DOM nodes or leaving stale `aria-describedby`
   * references on the regions.
   */
  private applyTooltipPresence(): void {
    const wanted = this.options.showTooltip && this.options.interactive;
    if (wanted && !this.tooltipEl) {
      this.buildTooltip();
      const focused = document.activeElement;
      const muscle = this.muscleData.find((m) => this.musclePaths.get(m.id) === focused);
      if (muscle) this.showFocusedTooltip(muscle, focused as SVGPathElement);
      return;
    }
    if (!wanted && this.tooltipEl) {
      this.hideTooltip();
      this.tooltipEl.remove();
      this.tooltipEl = null;
      this.tooltipId = "";
      this.tooltipMuscleId = null;
      for (const path of this.musclePaths.values()) {
        path.removeAttribute("aria-describedby");
      }
    }
  }

  /** Re-render an on-screen tooltip after its content source changed. */
  private refreshVisibleTooltip(): void {
    if (!this.tooltipEl || this.tooltipEl.style.visibility !== "visible") return;
    const muscle = this.muscleData.find((m) => m.id === this.tooltipMuscleId);
    if (!muscle) return;
    this.showTooltipAt(muscle, this.tooltipClientX, this.tooltipClientY);
  }

  // ── Build ────────────────────────────────────────────────

  private watchReducedMotion(): void {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => this.applyTransitions();
    query.addEventListener?.("change", onChange);
    this.motionQuery = query;
    this.eventCleanup.push(() => query.removeEventListener?.("change", onChange));
  }

  /**
   * Transitions are enabled only when the consumer asks for them *and* the
   * user has not requested reduced motion. The OS preference wins.
   */
  private transitionsEnabled(): boolean {
    if (!this.options.enableTransitions) return false;
    return !(this.motionQuery?.matches ?? false);
  }

  private applyTransitions(): void {
    const transition = this.transitionsEnabled() ? transitionStyle() : "";
    if (this.svgEl) this.svgEl.style.transition = transition;
    if (this.tooltipEl) {
      this.tooltipEl.style.transition = transition ? "opacity 120ms ease-out, transform 120ms ease-out" : "none";
    }
    for (const path of this.musclePaths.values()) {
      path.style.transition = transition ? transitionStyle() : "none";
    }
  }

  private build(): void {
    const { view, className, interactive } = this.options;
    this.muscleData = filterMuscles(view);
    const isBoth = view === ViewSide.BOTH;

    this.watchReducedMotion();

    const viewBox = isBoth
      ? "0 0 72 93"
      : view === ViewSide.FRONT
        ? "0 0 35 93"
        : "37 0 35 93";

    // Wrapper (layout only; the SVG carries the accessible role and name)
    this.wrapperEl = document.createElement("div");
    this.wrapperEl.className = `body-chart-container ${className}`.trim();
    setStyles(this.wrapperEl, {
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: bmVar("padding", "1rem"),
    });

    // SVG
    this.svgEl = document.createElementNS(SVG_NS, "svg");
    this.svgEl.setAttribute("viewBox", viewBox);
    this.svgEl.classList.add("body-chart-svg");
    // Interactive charts expose individually focusable regions, so the SVG must
    // not be `aria-hidden` and must be a group rather than an image. Display-only
    // charts have no focusable descendants and are announced as one graphic.
    this.svgEl.setAttribute("role", interactive ? "group" : "img");
    this.applyChartLabel();
    setStyles(this.svgEl as unknown as HTMLElement, {
      height: "auto",
      width: "100%",
      maxHeight: bmVar("max-height", "70vh"),
      maxWidth: bmVar(isBoth ? "max-width-both" : "max-width", isBoth ? "760px" : "400px"),
      filter: bmVar("svg-shadow", "drop-shadow(0 4px 20px rgba(0, 0, 0, 0.3))"),
      ...(this.transitionsEnabled() ? { transition: transitionStyle() } : {}),
    });

    // Defs (SVG filters)
    this.svgEl.appendChild(this.buildDefs());

    // Background silhouette layer
    const bgGroup = document.createElementNS(SVG_NS, "g");
    bgGroup.classList.add("body-chart-background");
    bgGroup.setAttribute("aria-hidden", "true");
    (bgGroup as unknown as HTMLElement).style.opacity = bmVar("background-opacity", "0.1");
    (bgGroup as unknown as HTMLElement).style.pointerEvents = "none";

    for (const m of this.muscleData) {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", m.path);
      p.style.fill = bmVar("background-fill", "#cbd5e1");
      bgGroup.appendChild(p);
    }
    this.svgEl.appendChild(bgGroup);

    // Interactive muscle paths
    for (const muscle of this.muscleData) {
      const path = this.buildMusclePath(muscle);
      this.svgEl.appendChild(path);
      this.musclePaths.set(muscle.id, path);
    }

    if (interactive) {
      this.applyRovingTabIndex(this.muscleData[0]?.id ?? null);
    }

    this.wrapperEl.appendChild(this.svgEl);

    // Optional view label(s)
    this.applyViewLabels();

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
    if (!this.options.showTooltip || !this.options.interactive || !this.wrapperEl) return;

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
      transition: this.transitionsEnabled()
        ? "opacity 120ms ease-out, transform 120ms ease-out"
        : "none",
      zIndex: "50",
      backgroundColor: bmVar("tooltip-bg", "rgba(15, 23, 42, 0.92)"),
      color: bmVar("tooltip-color", "#f8fafc"),
      padding: bmVar("tooltip-padding", "0.35rem 0.65rem"),
      borderRadius: bmVar("tooltip-radius", "0.5rem"),
      fontSize: bmVar("tooltip-font-size", "0.75rem"),
      fontWeight: bmVar("tooltip-font-weight", "500"),
      lineHeight: bmVar("tooltip-line-height", "1.2"),
      whiteSpace: "nowrap",
      boxShadow: bmVar(
        "tooltip-shadow",
        "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.25)",
      ),
      border: bmVar("tooltip-border", "1px solid rgba(255, 255, 255, 0.15)"),
      backdropFilter: bmVar("tooltip-backdrop-filter", "blur(8px)"),
      WebkitBackdropFilter: bmVar("tooltip-backdrop-filter", "blur(8px)"),
      transform: "translate3d(0, 0, 0)",
    });

    this.wrapperEl.appendChild(this.tooltipEl);
  }

  private showFocusedTooltip(muscle: MuscleDef, path: SVGPathElement): void {
    if (!this.tooltipEl) return;
    path.setAttribute("aria-describedby", this.tooltipId);
    const rect = path.getBoundingClientRect();
    this.showTooltipAt(muscle, rect.left + rect.width / 2, rect.top);
  }

  private showTooltipAt(
    muscle: MuscleDef,
    clientX: number,
    clientY: number,
  ): void {
    if (!this.tooltipEl || !this.wrapperEl || !this.options.showTooltip) return;
    if (!this.options.interactive) return;

    this.tooltipMuscleId = muscle.id;
    this.tooltipClientX = clientX;
    this.tooltipClientY = clientY;
    this.tooltipEl.textContent = this.tooltipText(muscle, this.options.bodyState[muscle.id]);
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

    if (!this.options.interactive) return path;

    // Toggle button: pressed state reflects `selected`. All regions start out of
    // the tab order; `applyRovingTabIndex` promotes one to a single tab stop.
    path.setAttribute("role", "button");
    path.setAttribute("tabindex", "-1");

    // Event listeners
    const onPointerEnter = (e: PointerEvent) => {
      this.hoveredMuscle = muscle.id;
      this.options.onMuscleHover(muscle.id);
      this.refreshPath(muscle.id);
      this.showTooltipAt(muscle, e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (this.hoveredMuscle === muscle.id) {
        this.showTooltipAt(muscle, e.clientX, e.clientY);
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
      this.applyRovingTabIndex(muscle.id);
      this.refreshPath(muscle.id);
      this.showFocusedTooltip(muscle, path);
    };

    const onBlur = () => {
      const prev = this.hoveredMuscle;
      this.hoveredMuscle = null;
      if (prev) this.refreshPath(prev);
      path.removeAttribute("aria-describedby");
      this.hideTooltip();
    };

    const onClick = () => {
      this.options.onMuscleClick(muscle.id, this.regionName(muscle));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          this.options.onMuscleClick(muscle.id, this.regionName(muscle));
          break;
        case "Escape":
          this.hideTooltip();
          break;
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          this.moveFocus(muscle.id, 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          this.moveFocus(muscle.id, -1);
          break;
        case "Home":
          e.preventDefault();
          this.focusMuscle(this.muscleData[0]?.id);
          break;
        case "End":
          e.preventDefault();
          this.focusMuscle(this.muscleData[this.muscleData.length - 1]?.id);
          break;
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

  // ── Keyboard navigation ──────────────────────────────────

  /**
   * Keep exactly one region in the tab order, so `Tab` enters and leaves the
   * chart with a single stop instead of traversing every region.
   */
  private applyRovingTabIndex(activeId: MuscleId | null): void {
    this.tabbableMuscle = activeId;
    for (const [id, path] of this.musclePaths) {
      path.setAttribute("tabindex", id === activeId ? "0" : "-1");
    }
  }

  /** Move focus by `delta` regions in reading order, wrapping around. */
  private moveFocus(currentId: MuscleId, delta: number): void {
    const index = this.muscleData.findIndex((m) => m.id === currentId);
    if (index === -1) return;
    const count = this.muscleData.length;
    this.focusMuscle(this.muscleData[(index + delta + count) % count]?.id);
  }

  private focusMuscle(id: MuscleId | undefined): void {
    if (!id) return;
    const path = this.musclePaths.get(id);
    if (!path) return;
    this.applyRovingTabIndex(id);
    path.focus();
  }

  // ── State refresh ────────────────────────────────────────

  private refreshAllPaths(): void {
    for (const id of this.musclePaths.keys()) {
      this.refreshPath(id);
    }
  }

  private refreshPath(muscleId: MuscleId): void {
    const path = this.musclePaths.get(muscleId);
    if (!path) return;

    const suppliedState = this.options.bodyState[muscleId];
    const state = suppliedState || { intensity: 0, selected: false };
    const isSelected = state.selected || false;
    const isHovered = this.hoveredMuscle === muscleId;
    let isFocused = false;
    if (this.options.interactive) {
      // `:focus-visible` limits the ring to keyboard focus; engines without it
      // fall back to `:focus`.
      try {
        isFocused = path.matches(":focus-visible");
      } catch {
        isFocused = path.matches(":focus");
      }
    }
    const fill = getMuscleColor(state, isHovered, this.options.intensityColor);
    const opacity =
      state.intensity === 0 && !isSelected ? bmVar("region-inactive-opacity", "0.6") : "1";
    const muscle = this.muscleData.find((m) => m.id === muscleId);

    // `fill` stays a presentation attribute so the resolved colour is
    // introspectable; strokes are CSS properties so `--bm-*` variables resolve.
    path.setAttribute("fill", fill);
    path.style.stroke = isFocused
      ? bmVar("region-stroke-focus", "#1d4ed8")
      : isSelected
        ? bmVar("region-stroke-selected", "#ffffff")
        : bmVar("region-stroke", "#1e293b");
    path.style.strokeWidth = isFocused
      ? bmVar("region-stroke-width-focus", "0.5")
      : isSelected
        ? bmVar("region-stroke-width-selected", "0.3")
        : bmVar("region-stroke-width", "0.1");

    if (this.options.interactive) {
      // Selection is exposed as a toggle-button state, not only as a colour or
      // label suffix, so assistive technology announces it reliably.
      path.setAttribute("aria-pressed", isSelected ? "true" : "false");
      path.setAttribute("aria-label", muscle ? this.regionLabel(muscle, suppliedState) : muscleId);
    }

    path.style.fillOpacity = opacity;
    // Focus is a dual-tone halo that stays visible against any background; it
    // replaces the selection/hover glow so the ring is never masked by it.
    path.style.filter = isFocused
      ? bmVar(
          "region-focus-shadow",
          "drop-shadow(0 0 1.5px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 2.5px rgba(15, 23, 42, 0.9))",
        )
      : isSelected || isHovered
        ? bmVar("region-active-shadow", "url(#glow)")
        : "none";
    path.style.cursor = this.options.interactive ? "pointer" : "default";
    path.style.transition = this.transitionsEnabled() ? transitionStyle() : "none";
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
      color: bmVar("view-label-color", "#64748b"),
      fontSize: bmVar("view-label-font-size", "0.875rem"),
      fontFamily: "monospace",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      pointerEvents: "none",
      backgroundColor: bmVar("view-label-bg", "rgba(15, 23, 42, 0.5)"),
      padding: bmVar("view-label-padding", "0.25rem 0.75rem"),
      borderRadius: bmVar("view-label-radius", "9999px"),
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
