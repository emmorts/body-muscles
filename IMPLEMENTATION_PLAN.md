# Library improvement implementation plan

Created: 2026-10-09  
Review baseline: @emmorts/body-muscles 1.1.1  
Status: Phase 1 in progress (A1 complete; A2–A4 not started).

This document tracks every improvement proposed in the developer and user experience review. Checking an item means its acceptance criteria have been met and verification evidence has been recorded, not merely that code has been written.

## Scope and conventions

- Preserve the framework-agnostic core and zero runtime dependencies. Development-only tooling may be added where needed.
- Keep application state controlled by the consumer; do not introduce a second internal selection state.
- Reuse existing patterns and public data rather than maintaining parallel anatomy definitions.
- Proposed API shapes below are design directions, not finalized contracts. Resolve the listed decisions before implementing an affected public API.
- For each completed item, record the implementation commit or pull request, verification performed, and any compatibility or migration notes in this document.
- Update consumer documentation and the changelog with implemented behavior. Classify breaking changes before release.
- Automated accessibility checks supplement, but do not replace, keyboard and assistive-technology checks.

## Phase 1 — Correctness and accessibility

### A1 — Accessible interactive and read-only chart semantics

- [x] Complete A1

**Problem:** Interactive paths have keyboard handlers, but their SVG ancestor is marked `aria-hidden="true"` and the wrapper has `role="img"`. The reviewed demo produced hidden-focusable-content and nested-interaction accessibility findings. Keyboard activation alone does not make the chart accessible.

**Implementation scope:** `src/BodyChart.ts`, chart API documentation, browser behavior coverage.

**Acceptance criteria:**
- Interactive regions are exposed with usable names and appropriate roles; no interactive descendant is hidden from assistive technology.
- Selection is conveyed with `aria-pressed`, rather than only label text or visual styling.
- Keyboard focus has a distinct visible indicator; Enter and Space activate a region and Escape dismisses its tooltip.
- Interactive and read-only semantics are distinct. A read-only chart does not leave inactive buttons in the tab order.
- Establish a keyboard navigation model that avoids forcing users through all regions before reaching the next page control. Document the model and its relationship to the optional list in C1.

**Verification:** Exercise keyboard navigation, selection changes, tooltip dismissal, and read-only behavior in an actual browser. Inspect the accessibility tree, run an automated audit, and perform an assistive-technology check.

**Design decision:** Choose accessible interactive grouping and navigation semantics before exposing any read-only option.

### A2 — Reliable mutable options and focus-preserving updates

- [ ] Complete A2

**Problem:** Updating `ariaLabel`, `className`, `showViewLabel`, or enabling `showTooltip` without changing `view` did not update the DOM in the reviewed build. `update()` currently refreshes paths unless the view changes.

**Implementation scope:** `src/BodyChart.ts`, API reference, browser regressions.

**Acceptance criteria:**
- Every option accepted by `update()` applies consistently, including callbacks, labels, classes, transitions, tooltip visibility, and tooltip formatting.
- Enabling and disabling optional elements works repeatedly without accumulating DOM nodes or listeners.
- Updates that do not require rebuilding preserve focused elements.
- View changes retain consumer state and clear obsolete hover/tooltip state. Define and document focus behavior when a focused region disappears.
- Visible tooltip content reflects updated state and formatting without requiring a new pointer entry.

**Verification:** Exercise each mutable option without changing view, repeat enable/disable cycles, and switch among front, back, and both views while focused and hovered.

### A3 — Stable and accessible demo controls

- [ ] Complete A3

**Problem:** The selected-muscle slider is replaced on every input. A single ArrowRight press changed its value and then lost focus. Some selection controls are clickable `div` elements, and sliders lack explicit accessible labels.

**Implementation scope:** `docs/app.js`, `docs/index.html`, `docs/style.css` as needed.

**Acceptance criteria:**
- Keep sliders mounted during value changes; continuous dragging and repeated keyboard increments work.
- Update numeric labels, selection state, selected-region details, and statistics without rebuilding the active control.
- Use native buttons or checkboxes for toggles, with programmatically exposed state.
- Label every slider with its region and purpose.
- Use the anatomy data's display names instead of title-casing identifiers.

**Verification:** Exercise mouse dragging, keyboard increments, group selection, deselection, reset, and selected-region detail updates in the running demo.

### A4 — Browser behavior coverage in continuous integration

- [ ] Complete A4

**Problem:** Existing CI checks types and built artifacts, but does not exercise chart DOM behavior or user interaction.

**Implementation scope:** Browser regression coverage, `package.json`, `.github/workflows/ci.yml`.

**Acceptance criteria:**
- Keep existing type and artifact checks, and add deterministic browser checks against the built library.
- Cover mutable options, keyboard activation and selection semantics, focus preservation, tooltip lifecycle, view transitions, destruction, and multiple chart instances.
- Include regressions for the observed option-update and slider-focus failures.
- Assert consumer-visible behavior rather than implementation details or source text.
- Tests remain isolated and do not add runtime dependencies to the published library.

**Verification:** Run the browser checks through the CI command locally, then record the CI result when available. Browser smoke checks for affected features remain required.

## Phase 2 — Integration flexibility and discoverability

### B1 — Supported themes, sizing, color mapping, and visual states

- [ ] Complete B1

**Problem:** The chart uses inline, mostly hard-coded colors, padding, shadows, tooltip styling, and size limits. Selection relies on a white outline and glow. There is no public palette or color-resolver option.

**Implementation scope:** `src/BodyChart.ts`, color utilities as needed, options/types, styling documentation, demo examples.

**Acceptance criteria:**
- Provide documented CSS custom properties for appearance and layout, retaining existing appearance as the default.
- Make padding, width/height limits, shadows, region strokes, tooltip styling, and selected/focused states customizable.
- Provide a supported color resolver for application-specific intensity scales; define its relationship to the default palette and exported color helper.
- Selection and keyboard focus remain distinguishable from intensity in light and dark themes without relying solely on color.
- Expose numeric intensity in the default tooltip when state is available; allow consumers to customize its wording.
- Respect `prefers-reduced-motion` across chart and tooltip transitions. Define how that preference interacts with `enableTransitions`.

**Verification:** Exercise default styling, light/dark overrides, alternate color mapping, constrained containers, selection/focus visibility, and reduced-motion settings in a browser.

**Design decision:** Finalize the CSS variable names and resolver contract before documenting them as public API.

### B2 — Typed region identifiers and lookup

- [ ] Complete B2

**Problem:** `MuscleId` is currently `string`, so misspelled identifiers receive no compile-time feedback.

**Implementation scope:** `src/types.ts`, anatomy data declarations or generation, `src/index.ts`, consumer examples.

**Acceptance criteria:**
- Derive a literal identifier union from the canonical anatomy dataset, without manually duplicating the ID list.
- Provide a typed lookup for region definitions and a documented unknown-ID behavior for dynamic input.
- Valid identifiers work in state and callbacks; invalid literal identifiers fail consumer type checking.
- Evaluate compatibility for consumers currently passing arbitrary strings and document the migration if the change is breaking.

**Verification:** Compile representative consumer examples with valid and invalid identifiers; exercise dynamic lookups against the built library.

### B3 — Explicit state replacement and patch semantics

- [ ] Complete B3

**Problem:** `update({ bodyState })` replaces the entire mapping, although the method's description says options are merged. Consumers can accidentally remove state for omitted regions.

**Implementation scope:** `src/BodyChart.ts` documentation/types as needed, README, site API reference, consumer examples.

**Acceptance criteria:**
- Clearly document that option merging is shallow and `bodyState` replaces the complete mapping.
- Show examples that intentionally preserve or remove existing region state.
- Decide whether a separate patch operation is warranted. If introduced, distinguish it from replacement and specify entry deletion semantics.
- Preserve application-controlled state; do not add implicit internal selection ownership.

**Verification:** Demonstrate full replacement, preservation of unrelated entries in documented consumer updates, and any approved patch/deletion behavior.

**Design decision:** A patch API is optional; resolving and documenting the distinction is required.

### B4 — Consistent intensity validation

- [ ] Complete B4

**Problem:** `createBodyPartState()` rejects fractional and out-of-range values, while rendering rounds fractions and caps large values. Negative values and `NaN` render as neutral; positive infinity renders at maximum intensity.

**Implementation scope:** `src/types.ts`, `src/utils/getMuscleColor.ts`, chart input boundaries, API documentation.

**Acceptance criteria:**
- Choose and document one policy across factories, helpers, construction, and updates. The review recommends finite integers from 0 through 10, with descriptive errors for invalid input.
- Cover fractions, negative numbers, values above 10, `NaN`, infinity, and valid boundary values.
- Rejected updates do not leave options and rendered state inconsistent.
- Document compatibility implications for consumers relying on rounding or clamping.

**Verification:** Exercise every boundary through the public helpers and built chart API, not only internal validation functions.

### B5 — Localization and shared label resolution

- [ ] Complete B5

**Problem:** Tooltip formatting is customizable, but view labels and accessible labels remain English.

**Implementation scope:** `src/BodyChart.ts`, options/types, API documentation, localization example.

**Acceptance criteria:**
- Provide a shared label-resolution mechanism for region display names, accessible names, tooltips, view labels, selection wording, and intensity wording.
- Preserve default English behavior and define precedence relative to `ariaLabel` and `tooltipFormatter`.
- Runtime label changes apply through `update()` and remain consistent across visual and accessible output.

**Verification:** Exercise a non-English configuration, custom tooltip formatting, and runtime label updates in the browser and accessibility tree.

**Dependency:** Establish A2's update behavior before completing runtime localization.

### B6 — Explicit anatomy metadata and terminology

- [ ] Complete B6

**Problem:** Side/group helpers infer metadata from identifier strings. The dataset contains anatomical regions such as Head, not only individual muscles, and anatomical left/right conventions need an explicit explanation.

**Implementation scope:** `src/data/types.ts`, anatomy/group data, extraction helpers, README and site documentation.

**Acceptance criteria:**
- Provide canonical anatomical side and group metadata rather than requiring identifier parsing.
- Keep existing region identifiers stable unless a separately documented migration is necessary.
- Reconcile metadata with group exports and helper behavior; avoid conflicting sources of truth.
- State whether left/right means the subject's perspective and explain the distinction between regions and individual muscles.

**Verification:** Check metadata/group consistency across every region and inspect representative front, back, bilateral, and central regions visually.

### B7 — Searchable developer anatomy catalog

- [ ] Complete B7

**Problem:** Identifier naming rules do not show consumers which regions actually exist.

**Implementation scope:** Documentation site and canonical exported anatomy data.

**Acceptance criteria:**
- Offer a searchable catalog of identifiers, display names, groups, anatomical sides, and views.
- Provide front/back previews that make the corresponding region identifiable.
- Build the catalog from canonical data so additions and renames do not require a second manual list.
- Make catalog controls keyboard accessible and usable on narrow screens.

**Verification:** Find representative regions by identifier and name; verify filters, previews, and keyboard/mobile navigation.

**Dependency:** Use B6's metadata once finalized. This developer catalog is distinct from C1's application-facing selection list.

### B8 — Supported data-only package entry point

- [ ] Complete B8

**Problem:** Geometry is already exported as JSON, but the package exports map exposes only the root module.

**Implementation scope:** `package.json`, data export/build scripts as needed, verification tooling, consumer documentation.

**Acceptance criteria:**
- Expose a documented data-only subpath with an explicit format and schema.
- Support the intended non-DOM consumers without requiring chart construction or browser globals.
- Include the entry point in the published package and preserve canonical geometry and color data.
- Document usage for the supported module formats and runtime requirements.

**Verification:** Pack the package and exercise the exported subpath from an isolated non-browser consumer using the documented import/loading method.

**Design decision:** Select the subpath, JSON/module format, and schema versioning policy before establishing the public contract.

### B9 — Runnable TypeScript and framework integration examples

- [ ] Complete B9

**Problem:** Documentation snippets do not provide runnable integration projects or fully demonstrate changing props and client-only mounting. The TypeScript quick start passes a potentially null DOM lookup to the constructor.

**Implementation scope:** Runnable examples, README, documentation site.

**Acceptance criteria:**
- Start with runnable vanilla TypeScript and React examples using the actual library.
- Include DOM null checks, state updates, changing view/callback props, and cleanup on unmount.
- Demonstrate server-side rendering with client-only chart construction and React lifecycle remount behavior.
- Keep existing Vue and Svelte snippets consistent with the final API; update every affected example.
- Give reproducible commands for building and running examples.

**Verification:** Build and launch the examples, then exercise prop/state changes, remounting, cleanup, and the server-rendered/client-mounted path.

## Phase 3 — Optional user-facing capabilities and performance

### C1 — Optional searchable selection list synchronized with the chart

- [ ] Complete C1

**Problem:** Small regions are hard to select precisely on narrow screens. At the reviewed 390px viewport, 71 of 89 regions in the both-views chart had a bounding-box width or height below 24px. This is a usability signal, not by itself a compliance verdict.

**Implementation scope:** Optional composable UI/API, demo integration, documentation.

**Acceptance criteria:**
- Provide searchable, grouped region selection using the same consumer-controlled state as the chart.
- Synchronize selection and intensity changes in both directions without maintaining competing state stores.
- Support native keyboard controls and expose names, selection state, and intensity accessibly.
- Define how selecting a region not visible in the current view behaves.
- Keep the list optional; chart consumers must not be forced to render a sidebar or load a framework dependency.

**Verification:** Exercise search, group navigation, selection from both surfaces, hidden-view selections, and narrow-screen keyboard/touch use.

**Dependencies:** Coordinate with A1's navigation model and reuse B2/B6 metadata.

### C2 — Pure group and bilateral selection helpers

- [ ] Complete C2

**Problem:** Consumers repeat selection logic for anatomical groups and paired left/right regions.

**Implementation scope:** Utility exports, canonical metadata, types, examples.

**Acceptance criteria:**
- Provide small pure helpers for group and bilateral selection using canonical relationships, not guessed string substitutions.
- Define toggle/select/deselect behavior, central or unpaired regions, and preservation of existing intensity values.
- Do not mutate caller input or introduce internal state ownership.
- Document composition with the explicit replacement/patch semantics from B3.

**Verification:** Exercise mixed group selections, paired and unpaired regions, input immutability, and preservation of unrelated state and intensity.

**Dependencies:** B3 and B6.

### C3 — Reduce unnecessary path-refresh work

- [ ] Complete C3

**Problem:** Each refresh performs a linear metadata lookup per region and rewrites attributes even when their values are unchanged. Correctness and interaction fixes take priority over optimization for the current 89-region dataset.

**Implementation scope:** `src/BodyChart.ts` internal lookup and refresh logic.

**Acceptance criteria:**
- Cache region definitions by identifier rather than repeatedly scanning the array.
- Avoid unchanged DOM writes and unnecessary repeated default-state allocation during refresh.
- Preserve behavior for hover, focus, selection, callbacks, view changes, and consumer state updates, including callers that reuse a state object.
- Keep the design simple; do not add a general rendering abstraction for this optimization.

**Verification:** Compare browser profiles for repeated slider updates before and after the change, and exercise the same interaction scenarios covered by A4. Record measured results without assuming a performance gain.

## Deferred — Record demand before expanding scope

These suggestions remain tracked, but are not part of the initial implementation phases.

- **Official framework wrappers:** Reconsider when runnable integrations expose recurring lifecycle or ergonomics problems that documentation cannot adequately solve. Preserve a framework-independent core and define ownership/maintenance for each wrapper first.
- **Zoom and pan:** Reconsider after evaluating whether C1 solves small-region selection adequately. Define touch gestures, keyboard alternatives, focus behavior, and tooltip positioning before implementation.
- **Additional anatomical models:** Reconsider on concrete consumer demand. Establish dataset provenance, accuracy expectations, identifier compatibility, and maintenance requirements before adding models.

## Completion record

For each completed item, append a record containing:
- Item ID and completion date.
- Commit or pull request.
- Exercised verification and observed results, including any visual or assistive-technology limitations.
- Documentation/changelog updates and release compatibility classification.
- Resolved API decisions or explicitly approved scope changes.

### A1 — Accessible interactive and read-only chart semantics

- **Completed:** 2026-10-09.
- **Commit:** `feat(a11y): accessible interactive and display-only chart semantics` (see git history for the hash).
- **Files:** `src/BodyChart.ts`, `README.md`, `docs/index.html`, `CHANGELOG.md`.
- **Changes:** removed `aria-hidden` from the interactive SVG and `role="img"` from the wrapper; the SVG now carries `role="group"`/`role="img"` plus the chart name. Regions are toggle buttons with `aria-pressed` tracking `selected`; the `(selected)` label suffix was dropped. Added the `interactive` option (default `true`); `false` renders a display-only graphic with no focusable regions, tooltip, or callbacks. Added a roving tab index (single tab stop) with arrow-key, `Home`/`End`, `Enter`/`Space`, and `Escape` handling, and a dual-tone keyboard focus indicator.
- **Verification:** `npm run typecheck`, `npm run build`, `npm run verify-build` pass. Browser smoke test on the built UMD bundle confirmed: one tab stop across 40 regions with `role="button"`/`aria-pressed`; `Tab` lands on the first region and one further `Tab` leaves the chart; `ArrowRight`/`ArrowUp`/`Home`/`End` move focus with `:focus-visible` showing stroke `#1d4ed8` plus the halo; `Enter` toggles `aria-pressed` and fires `onMuscleClick`; a real click toggles selection; `Escape` hides the tooltip; `interactive: false` yields `role="img"`, zero focusable regions/roles, no tooltip, and no callback invocations while still painting intensity colours. axe-core on the demo page no longer reports `aria-hidden-focus` or `nested-interactive`. Remaining demo-page findings (colour contrast, unlabelled sliders, landmarks) belong to A3.
- **Compatibility:** visible accessibility semantics changed (wrapper no longer exposes a label; region labels no longer include "(selected)"; tab order reduced to one stop). Documented in the changelog under Unreleased. No `[INFERENCE]` items outstanding.
