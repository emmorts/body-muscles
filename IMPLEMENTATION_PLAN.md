# Library improvement implementation plan

Created: 2026-10-09  
Review baseline: @emmorts/body-muscles 1.1.1  
Status: Phase 1 review corrections complete; A1 screen-reader verification remains pending. Phase 2 complete (B1–B9).

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

- [ ] Complete A1

**Problem:** Interactive paths have keyboard handlers, but their SVG ancestor is marked `aria-hidden="true"` and the wrapper has `role="img"`. The reviewed demo produced hidden-focusable-content and nested-interaction accessibility findings. Keyboard activation alone does not make the chart accessible.

**Implementation scope:** `src/BodyChart.ts`, chart API documentation, browser behavior coverage.

**Acceptance criteria:**
- Interactive regions are exposed with usable names and appropriate roles; no interactive descendant is hidden from assistive technology.
- Selection is conveyed with `aria-pressed`, rather than only label text or visual styling.
- Keyboard focus has a distinct visible indicator; Enter and Space activate a region and Escape dismisses its tooltip.
- Interactive and read-only semantics are distinct. A read-only chart does not leave inactive buttons in the tab order.
- Establish a keyboard navigation model that avoids forcing users through all regions before reaching the next page control. Document the model and its relationship to the optional list in C1.

**Verification:** Exercise keyboard navigation, selection changes, tooltip dismissal, and read-only behavior in an actual browser. Inspect the accessibility tree, run an automated audit, and perform an assistive-technology check.

**Remaining verification:** Implementation, keyboard checks, and accessibility-tree inspection are complete. A real desktop screen-reader/browser session is still required to verify announcements and browse/focus-mode navigation before checking Complete A1. The current environment has no Orca, speech-dispatcher, or espeak-ng executable, and DISPLAY/WAYLAND_DISPLAY are unset.

**Design decision:** Choose accessible interactive grouping and navigation semantics before exposing any read-only option.

### A2 — Reliable mutable options and focus-preserving updates

- [x] Complete A2

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

- [x] Complete A3

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

- [x] Complete A4

**Problem:** Existing CI checks types and built artifacts, but does not exercise chart DOM behavior or user interaction.

**Implementation scope:** Browser regression coverage, `package.json`, `.github/workflows/ci.yml`.

**Acceptance criteria:**
- Keep existing type and artifact checks, and add deterministic browser checks against the built library.
- Cover mutable options, keyboard activation and selection semantics, focus preservation, tooltip lifecycle, view transitions, destruction, and multiple chart instances.
- Include regressions for the observed option-update and slider-focus failures.
- Assert consumer-visible behavior rather than implementation details or source text.
- Tests remain isolated and do not add runtime dependencies to the published library.

**Verification:** Run the browser checks through the CI command locally, then record the CI result when available. Browser smoke checks for affected features remain required.

### A5 — Documentation-site structural and contrast accessibility

- [x] Complete A5

**Problem:** Discovered while verifying A1: axe-core on the demo page reports page-level findings that are outside A3's control-level scope — colour contrast across site chrome, buttons, badges, the selected-muscle card, muscle rows, install tabs, and syntax-highlighting tokens; a missing main landmark; 43 nodes outside any landmark; and two prose links distinguishable only by colour. The demo is the first thing a prospective user sees, so its accessibility is user-facing.

**Implementation scope:** `docs/index.html`, `docs/style.css`, `docs/app.js` as needed, and the syntax-highlighting theme handling.

**Acceptance criteria:**
- Text and controls meet WCAG AA contrast (4.5:1 for normal text, 3:1 for large text and UI boundaries) in both the light and dark themes, including the active view toggle, group chips, badges, selected-muscle card, install tabs, and code tokens.
- Wrap page content in a single `<main>` landmark so all content is inside a landmark region.
- Make in-text links distinguishable without relying on colour (underline or equivalent, not colour alone).
- Re-run the audit after the change and record the remaining findings; do not suppress or exclude rules to reach a clean result.

**Verification:** axe-core audit of the demo page in light and dark themes, plus a visual check that the palette changes did not break the chart's own region colours. Record the rule-by-rule result.

**Note:** Added 2026-10-09, after the A1 verification surfaced the evidence. Not part of the original review.

## Phase 2 — Integration flexibility and discoverability

**Resolved design decisions (2026-10-09, before implementing the affected public APIs):**

- **B1** — CSS custom properties are prefixed `--bm-*`. Colour customization is a resolver function: the new `intensityColor` option, with an exported `createIntensityColorScale(colors)` helper and `INTENSITY_COLORS` (via `resolveIntensityColor`) as the default.
- **B2** — `MuscleId` becomes a strict literal union derived from the canonical dataset, so misspelled literals fail compilation. This is a breaking change and requires a major release with migration notes.
- **B3** — No patch API. Document that option merging is shallow while `bodyState` replaces the complete mapping, with examples that deliberately preserve or remove entries.
- **B8** — The data-only entry point is the `@emmorts/body-muscles/data` subpath: a typed JSON-backed module (ESM + CJS + types) with a schema version field.

### B1 — Supported themes, sizing, color mapping, and visual states

- [x] Complete B1

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

- [x] Complete B2

**Problem:** `MuscleId` is currently `string`, so misspelled identifiers receive no compile-time feedback.

**Implementation scope:** `src/types.ts`, anatomy data declarations or generation, `src/index.ts`, consumer examples.

**Acceptance criteria:**
- Derive a literal identifier union from the canonical anatomy dataset, without manually duplicating the ID list.
- Provide a typed lookup for region definitions and a documented unknown-ID behavior for dynamic input.
- Valid identifiers work in state and callbacks; invalid literal identifiers fail consumer type checking.
- Evaluate compatibility for consumers currently passing arbitrary strings and document the migration if the change is breaking.

**Verification:** Compile representative consumer examples with valid and invalid identifiers; exercise dynamic lookups against the built library.

### B3 — Explicit state replacement and patch semantics

- [x] Complete B3

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

- [x] Complete B4

**Problem:** `createBodyPartState()` rejects fractional and out-of-range values, while rendering rounds fractions and caps large values. Negative values and `NaN` render as neutral; positive infinity renders at maximum intensity.

**Implementation scope:** `src/types.ts`, `src/utils/getMuscleColor.ts`, chart input boundaries, API documentation.

**Acceptance criteria:**
- Choose and document one policy across factories, helpers, construction, and updates. The review recommends finite integers from 0 through 10, with descriptive errors for invalid input.
- Cover fractions, negative numbers, values above 10, `NaN`, infinity, and valid boundary values.
- Rejected updates do not leave options and rendered state inconsistent.
- Document compatibility implications for consumers relying on rounding or clamping.

**Verification:** Exercise every boundary through the public helpers and built chart API, not only internal validation functions.

### B5 — Localization and shared label resolution

- [x] Complete B5

**Problem:** Tooltip formatting is customizable, but view labels and accessible labels remain English.

**Implementation scope:** `src/BodyChart.ts`, options/types, API documentation, localization example.

**Acceptance criteria:**
- Provide a shared label-resolution mechanism for region display names, accessible names, tooltips, view labels, selection wording, and intensity wording.
- Preserve default English behavior and define precedence relative to `ariaLabel` and `tooltipFormatter`.
- Runtime label changes apply through `update()` and remain consistent across visual and accessible output.

**Verification:** Exercise a non-English configuration, custom tooltip formatting, and runtime label updates in the browser and accessibility tree.

**Dependency:** Establish A2's update behavior before completing runtime localization.

### B6 — Explicit anatomy metadata and terminology

- [x] Complete B6

**Problem:** Side/group helpers infer metadata from identifier strings. The dataset contains anatomical regions such as Head, not only individual muscles, and anatomical left/right conventions need an explicit explanation.

**Implementation scope:** `src/data/types.ts`, anatomy/group data, extraction helpers, README and site documentation.

**Acceptance criteria:**
- Provide canonical anatomical side and group metadata rather than requiring identifier parsing.
- Keep existing region identifiers stable unless a separately documented migration is necessary.
- Reconcile metadata with group exports and helper behavior; avoid conflicting sources of truth.
- State whether left/right means the subject's perspective and explain the distinction between regions and individual muscles.

**Verification:** Check metadata/group consistency across every region and inspect representative front, back, bilateral, and central regions visually.

### B7 — Searchable developer anatomy catalog

- [x] Complete B7

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

- [x] Complete B8

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

- [x] Complete B9

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

## Phase 1 review corrections

Review findings are tracked individually; each correction is committed separately.

- [x] R1 — Refresh visible tooltips for reused state objects.
- [x] R2 — Preserve focus when the final demo row is deselected.
- [x] R3 — Restore bounded scrolling and spacing to the demo muscle list.
- [x] R4 — Fix populated-state contrast and CDN prose-link styling.
- [x] R5 — Preserve constructor defaults for undefined options.
- [x] R6 — Reposition visible tooltips after content updates.
- [x] R7 — Restore tooltip visibility and description when enabled during focus.
- [x] R8 — Replace the vacuous tooltip-reference cleanup assertion.
- [x] R9 — Correct the browser tooling Node prerequisite.
- [x] R10 — Verify accessibility-tree behavior and record screen-reader verification limits.

## Completion record

For each completed item, append a record containing:
- Item ID and completion date.
- Commit or pull request.
- Exercised verification and observed results, including any visual or assistive-technology limitations.
- Documentation/changelog updates and release compatibility classification.
- Resolved API decisions or explicitly approved scope changes.

### A1 — Accessible interactive and read-only chart semantics

- **Implementation completed:** 2026-10-09; screen-reader verification remains pending (see R10).
- **Commit:** `feat(a11y): accessible interactive and display-only chart semantics` (see git history for the hash).
- **Files:** `src/BodyChart.ts`, `README.md`, `docs/index.html`, `CHANGELOG.md`.
- **Changes:** removed `aria-hidden` from the interactive SVG and `role="img"` from the wrapper; the SVG now carries `role="group"`/`role="img"` plus the chart name. Regions are toggle buttons with `aria-pressed` tracking `selected`; the `(selected)` label suffix was dropped. Added the `interactive` option (default `true`); `false` renders a display-only graphic with no focusable regions, tooltip, or callbacks. Added a roving tab index (single tab stop) with arrow-key, `Home`/`End`, `Enter`/`Space`, and `Escape` handling, and a dual-tone keyboard focus indicator.
- **Verification:** `npm run typecheck`, `npm run build`, `npm run verify-build` pass. Browser smoke test on the built UMD bundle confirmed: one tab stop across 40 regions with `role="button"`/`aria-pressed`; `Tab` lands on the first region and one further `Tab` leaves the chart; `ArrowRight`/`ArrowUp`/`Home`/`End` move focus with `:focus-visible` showing stroke `#1d4ed8` plus the halo; `Enter` toggles `aria-pressed` and fires `onMuscleClick`; a real click toggles selection; `Escape` hides the tooltip; `interactive: false` yields `role="img"`, zero focusable regions/roles, no tooltip, and no callback invocations while still painting intensity colours. axe-core on the demo page no longer reports `aria-hidden-focus` or `nested-interactive`. The remaining demo-page findings (colour contrast, landmarks, region, link distinction) and the unlabelled sliders were recorded as separate items; the sliders were fixed by A3, and the rest are tracked as A5 (added 2026-10-09 after this verification).
- **Compatibility:** visible accessibility semantics changed (wrapper no longer exposes a label; region labels no longer include "(selected)"; tab order reduced to one stop). Documented in the changelog under Unreleased. No `[INFERENCE]` items outstanding.

### A2 — Reliable mutable options and focus-preserving updates

- **Completed:** 2026-10-09.
- **Commit:** `fix(api): apply every option in update and preserve focus` (see git history for the hash).
- **Files:** `src/BodyChart.ts`, `README.md`, `docs/index.html`, `CHANGELOG.md`.
- **Changes:** `update()` now shallow-merges into a new resolved-options object, skipping `undefined` values, then applies each changed field through a dedicated method (`applyClassName`, `applyChartLabel`, `applyViewLabels`, `applyTooltipPresence`, `applyTransitions`) before refreshing regions. `view` or `interactive` changes rebuild. `applyViewLabels` and `applyTooltipPresence` remove before they add, so toggling never accumulates nodes; tooltip removal also clears `aria-describedby` from every region. `showTooltipAt` now takes the region and records `tooltipMuscleId`, and `refreshVisibleTooltip()` re-renders an on-screen tooltip when `bodyState` or `tooltipFormatter` changes. `build()` reuses the same appliers, and the outside-pointerdown listener is always registered. `destroy()` resets `hoveredMuscle`, `tooltipMuscleId`, and `tooltipId`.
- **Verification:** `npm run typecheck`, `npm run build`, `npm run verify-build` pass. Browser smoke test on the built UMD bundle confirmed: `className`, `ariaLabel`, `showViewLabel`, `showTooltip` (off then on), and `enableTransitions` all reach the DOM without a view change; three on/off cycles left exactly one label set and one tooltip, and `showTooltip: false` left zero `aria-describedby` references; `undefined` in the update object did not clobber the existing `ariaLabel`; a focused region stayed focused across `update({ bodyState })` while its fill changed; a visible tooltip updated from `Face @ 6` to `Face @ 9` on a state change and to `Face!` on a formatter change without pointer movement; replacing callbacks took effect immediately; six view changes left one wrapper, one SVG, one tooltip, and one tab stop, and `destroy()` left the host empty. The demo page toggled views and a muscle group with no console errors.
- **Compatibility:** `update()` behaviour changed (options now apply; `undefined` ignored; `interactive` change rebuilds). Documented in the changelog under Unreleased. `view`-change focus loss is now explicitly documented. No `[INFERENCE]` items outstanding.

### A3 — Stable and accessible demo controls

- **Completed:** 2026-10-09.
- **Commit:** `fix(docs): keep demo controls mounted and accessible` (see git history for the hash).
- **Files:** `docs/app.js`, `docs/index.html`, `docs/style.css`.
- **Changes:** the selected-muscle card is now built once with persistent `#selectedEmpty`/`#selectedDetail` blocks and updated in place, so the slider is never replaced mid-interaction; the row toggle is a native `<input type="checkbox">` (styled with `appearance: none`) instead of a clickable `div`; group chips are created once as `aria-pressed` toggle buttons and only have their state class updated; muscle rows are keyed by id in `muscleRows` and reconciled through `syncMuscleRows`-style logic inside `renderGroupMuscles`, so a row is created once and removed only when deselected, with focus handed to the neighbouring control when the focused row disappears; every slider carries `aria-label`/`aria-valuetext` naming its region, and the selected-card slider is labelled through `#intensitySliderLabel`; display names come from `MUSCLE_MAP` via a `MUSCLE_NAMES` record instead of title-casing identifiers.
- **Verification:** `node --check docs/app.js` passes. Browser smoke test on the served demo confirmed: the selected card shows "Left Biceps"/`biceps-left` for `aria-label^="Left Biceps"` rather than "Biceps Left"; three `ArrowRight` presses on the selected-card slider produced 1→2→3 with `document.activeElement` still the slider and the card text following; the Chest chip selected 5 muscles with `aria-pressed="true"`, rows rendered native `input/checkbox` toggles and labelled range sliders, and three `ArrowRight` presses on a row slider produced 1→2→3 with focus retained and the value label updating; `Space` on a focused row checkbox deselected it, removed the row, and moved focus to the next row's checkbox (never `document.body`) while the chip returned to `aria-pressed="false"` and the stats updated; no console errors after the interactions. axe-core no longer reports the `label` violations (the two unlabelled sliders); the remaining `color-contrast`, `landmark-one-main`, `link-in-text-block`, and `region` findings are page-level and are tracked as A5.
- **Compatibility:** demo-only change; no package-facing API or artifact impact, so no changelog entry. No `[INFERENCE]` items outstanding.

### A4 — Browser behaviour coverage in continuous integration

- **Completed:** 2026-10-09.
- **Commit:** `test: cover chart behaviour in a real browser` (see git history for the hash).
- **Files:** `tests/browser-behavior.mjs`, `package.json`, `package-lock.json`, `.github/workflows/ci.yml`, `README.md`.
- **Changes:** added Playwright 1.64.0 as a devDependency and `npm run test:browser`. The suite runs the built UMD bundle in headless Chromium: the library tests inject `dist/umd/body-muscles.umd.js` into a blank page, and the demo tests serve `docs/` from an in-process HTTP server that maps the git-ignored `docs/lib/body-muscles.umd.js` to the freshly built bundle, so no artifact is written into the working tree and external CDN requests are blocked. Each test uses a fresh page. Covered: single-tab-stop and toggle-button semantics, display-only mode, keyboard navigation and activation, focus preservation across in-place updates, tooltip show/refresh/hide and stale `aria-describedby`, every mutable option, callback replacement, view transitions, destruction, multiple instances, and three demo-control behaviours (slider increments, labelled native controls, focus hand-off when a row is deselected).
- **Verification:** `npm run test:browser` — 12 passed, 0 failed, in ~2.5 s. To prove the suite is a real regression guard rather than a tautology, `src/BodyChart.ts` was reverted to `0a6b1a2` (pre-A2) and `docs/{app.js,index.html,style.css}` to `5ceb9a2` (pre-A3), the bundle rebuilt, and the suite re-run: 6 tests failed — the option-update, tooltip-refresh, focus/tooltip, and all three demo-control tests — confirming they exercise the fixed behaviour. The fixes were then restored and the suite returned to 12 passed. CI wiring (`npx playwright install --with-deps chromium` then `npm run test:browser`) is added but has not yet run on GitHub; that result is still pending.
- **Compatibility:** development-only; `playwright` is a devDependency and the published files list is unchanged, so runtime dependencies remain zero. The browser tests require Node 20+ (the locked Playwright packages' minimum) and a downloaded Chromium; the consumer engines.node contract remains >=16. No changelog entry.

### A5 — Documentation-site structural and contrast accessibility

- **Completed:** 2026-10-09.
- **Commit:** `fix(docs): meet WCAG AA contrast and add landmarks` (see git history for the hash).
- **Files:** `docs/style.css`, `docs/index.html`, `docs/app.js`.
- **Changes:** the light theme's `--accent` went from `#3b82f6` to `#2563eb` (white-on-accent 3.68→5.17, accent-on-card 3.52→4.94, accent-on-code 3.36→4.72) and `--fg-muted` from `#64748b` to `#5d6b7e` (on code background 4.34→4.95). Because a single accent cannot both carry white text and stay legible on dark surfaces, the dark theme now defines its own `--accent: #60a5fa` with `--accent-fg: #0b1220`. `--ring` follows both accents. The intensity-legend swatches use `#0f172a` instead of `#1e293b` for levels 0–7, which were failing on the orange and red steps (levels 8–10 keep white). The three failing highlight.js light-theme token colours are overridden under `[data-theme="light"]` — `#d73a49`→`#b31d28`, `#e36209`→`#b04a00`, `#22863a`→`#1b6e30`, covering every class that uses them in that theme. Links inside `p`/`li`/`dd`/`td` are underlined so they no longer rely on colour alone (WCAG 1.4.1). The page's sections are wrapped in a single `<main>` between the header and footer.
- **Initial verification:** axe-core reported 0 violations and 1 incomplete result in each theme on the initial page, and the 12-test browser suite passed. This did not cover populated selection details or the hidden CDN panel and does not establish full WCAG conformance. The review found additional contrast and link-distinction failures in those states; R4 records their corrections and expanded verification.
- **Note:** section indentation inside `<main>` was intentionally left as-is rather than re-indenting ~590 lines, keeping the diff reviewable; the markup is valid either way.
- **Compatibility:** documentation-site only; no package-facing API or artifact impact, so no changelog entry. No `[INFERENCE]` items outstanding.

### R1 — Reused-state tooltip refresh

- **Completed:** 2026-10-09.
- **Commit:** `fix: refresh tooltips for reused state mappings` (see git history for the hash).
- **Changes:** explicit non-undefined `bodyState` updates refresh an open tooltip regardless of object identity. Extended the existing browser regression to cover both replacement mappings and in-place mutation.
- **Verification:** build and 12 browser tests pass. Separate keyboard-focus smoke on the built bundle changed Head intensity 1→7 using the same state object; both the region label and visible tooltip reflected 7, with focus retained.
- **Compatibility:** no signature changes or runtime dependencies; Unreleased changelog clarified. Later review corrections remain pending.

### R2 — Final-row focus hand-off

- **Completed:** 2026-10-09.
- **Commit:** `fix(docs): retain focus when the final muscle row disappears`.
- **Changes:** move focus to the active group's persistent chip (or Reset) before hiding an empty panel, only when focus is inside that panel.
- **Verification:** 13 browser tests pass, including final-row deselection and keyboard activation of the fallback chip. Separate demo smoke confirmed zero rows, a hidden panel, and focus on Head & Neck rather than the document body.
- **Compatibility:** documentation-site only; no package API or changelog change.

### R3 — Bounded muscle-list layout

- **Completed:** 2026-10-09.
- **Commit:** `fix(docs): restore scrollable muscle list layout`.
- **Changes:** the persistent list container carries the existing muscle-list class again; no duplicate layout convention.
- **Verification:** 14 browser tests pass, including scrolling a large selection to its final keyboard control. Demo screenshot and measurements show 22 Legs rows in a 320px viewport with 945px scroll content and 5.6px row gaps.
- **Compatibility:** documentation-site only; no package API or changelog change.

### R4 — Populated-state accessibility corrections

- **Completed:** 2026-10-09.
- **Commit:** `fix(docs): correct populated-state contrast and prose links`.
- **Changes:** retain the tinted badge but use darker blue text in light mode; use the theme's accent foreground for checked-checkbox markers; remove the CDN note's overriding text-decoration rule so the prose underline applies.
- **Verification:** 15 browser tests pass. The new regression computes badge text contrast against its composited background (at least 4.5:1) and checked-marker contrast (at least 3:1) in both themes. Separate served-demo axe audits with a selected muscle and the CDN (ESM) panel visible report 0 violations, 1 incomplete, and 45 passing rules in each theme. The dark checkbox screenshot shows its dark marker; the CDN link's computed decoration is underline. The previously observed color-contrast and link-in-text-block failures are gone; landmark-one-main and region remain passing.
- **Limit:** automated audits and these targeted measurements are not a full WCAG conformance assessment or a screen-reader check.
- **Compatibility:** documentation-site only; no package API or changelog change.

### R5 — Undefined constructor options

- **Completed:** 2026-10-09.
- **Commit:** `fix: preserve constructor defaults for undefined options`.
- **Changes:** resolve every optional field after the supplied options, preserving explicit false values. README, site API reference, and Unreleased changelog document undefined constructor fields.
- **Verification:** build and 16 browser tests pass. The new regression enters via Tab, activates a region, displays the default tooltip, and hovers Face with undefined optional fields. Separate built-bundle smoke with interactive/showTooltip/tooltipFormatter set to undefined yields role=group, one tab stop, and a visible Head tooltip. Existing display-only and option-off coverage continues to pass.
- **Compatibility:** fixes optional-field default handling without changing signatures or runtime dependencies.

### R6 — Tooltip collision positioning after refresh

- **Completed:** 2026-10-09.
- **Commit:** `fix: reposition tooltips after content updates`.
- **Changes:** retain the last tooltip anchor coordinates and reuse showTooltipAt for content refresh, including its collision handling. Anchors are cleared on destruction.
- **Verification:** build and 17 browser tests pass. New coverage checks chart boundaries after a formatter changes tooltip width for both keyboard and pointer anchors. Separate built-bundle smoke changed Short to a 287px-wide tooltip; its horizontal margins were 64px and 81px instead of overflowing. Screenshot confirms visible content and retained keyboard focus.
- **Compatibility:** no API changes; content wider than the chart remains outside this fix's scope. Unreleased changelog updated.

### R7 — Enabling tooltips during keyboard focus

- **Completed:** 2026-10-09.
- **Commit:** `fix: restore tooltips when enabled during focus`.
- **Changes:** reuse focused-tooltip rendering when creating a tooltip for an already focused region; attach the new description without moving focus.
- **Verification:** build and 18 browser tests pass, including two enable/disable cycles while retaining region focus and updating intensity. Separate built-bundle smoke confirms the focused path describes the newly created tooltip, visibility is visible, and text is Head: 1 without refocusing.
- **Compatibility:** no API changes; Unreleased changelog updated.

### R8 — Meaningful tooltip-reference cleanup regression

- **Completed:** 2026-10-09.
- **Commit:** `test: exercise cleanup of a live tooltip description`.
- **Changes:** focus a region before the tooltip-toggle checks and assert its description resolves to the live tooltip before checking removal. The old empty-state-only assertion no longer supplies false assurance.
- **Verification:** 18 browser tests pass. Separate smoke starts with body-chart-tooltip-2 referenced by the focused region, then disables tooltips: the reference becomes null, the tooltip count becomes zero, and focus remains on the region.
- **Compatibility:** test-only behavior coverage; no package API or changelog change.

### R9 — Browser tooling runtime prerequisite

- **Completed:** 2026-10-09.
- **Commit:** `docs: correct browser tooling Node prerequisite`.
- **Changes:** README development prerequisites and A4's compatibility record now state Node 20+, matching Playwright and playwright-core 1.64.0.
- **Verification:** both lockfile engine entries are >=20; the installed CLI reports Playwright 1.64.0 on Node v24.21.0. CI specifies Node 24. The published package's engines.node remains >=16.
- **Compatibility:** documentation correction only; no dependency, consumer engine, or changelog change.

### R10 — Available accessibility verification and explicit limits

- **Completed:** 2026-10-09 (available checks and documentation only).
- **Commit:** `docs: record accessibility verification evidence and limits`.
- **Verification:** the built bundle's Chromium accessibility tree exposes a labelled group with named toggle buttons and Head's pressed state. Consumer-controlled Enter activation changed Head to unpressed; ArrowRight focused Face with its tooltip description; Escape hid the tooltip and Tab reached the following page button. Display-only mode exposes one labelled image, without button descendants. Final typecheck, build, artifact verification (89 regions, 11 intensity colours), 18 browser tests, and docs build all pass. Served-demo dragging changed the selected-card slider to 8, retained its element and focus, and updated details/statistics to 8 / 10 and 8.0. Populated light/dark demo audits with the CDN panel visible each report 0 violations, 1 incomplete, and 45 passing rules; no browser errors were recorded.
- **Missing prerequisite:** no screen-reader executable or desktop display session is available here. Accessibility-tree inspection is not speech-output or browse/focus-mode verification. A1 is deliberately unchecked pending a real screen-reader/browser check; README and the site explicitly state this limit. No full WCAG-conformance claim is made.
- **Required manual check:** with a supported desktop screen reader and browser, verify chart/button names and pressed-state announcements, arrow-key behavior in browse and focus modes, Enter/Space selection announcements, tooltip description/dismissal, one-step Tab exit, and the single-image read-only presentation. Record the reader/browser versions and results before completing A1.
- **Compatibility:** verification documentation only; no package API or changelog change. GitHub CI results have not been observed for these local commits.

### B1 — Supported themes, sizing, color mapping, and visual states

- **Completed:** 2026-10-09.
- **Commit:** `feat(theme): expose CSS variables, color resolver, and reduced motion` (see git history for the hash).
- **Changes:** `src/BodyChart.ts` now renders through `--bm-*` custom properties with the previous literals as fallbacks (wrapper padding, SVG height/width limits, SVG shadow, silhouette fill/opacity, region strokes and weights, selection glow, focus halo, tooltip chrome, view-label chrome, transition timing). Added the `intensityColor` option, `IntensityColorResolver` type, and `resolveIntensityColor` / `createIntensityColorScale` exports (with `getMuscleColor` taking an optional third resolver argument). The default `tooltipFormatter` appends the numeric intensity when the region has state. `prefers-reduced-motion: reduce` now disables chart, region, and tooltip transitions regardless of `enableTransitions`, with a `matchMedia` `change` listener that re-applies the preference. The demo's dark theme overrides `--bm-region-stroke` / `--bm-background-fill`. README, docs site, and CHANGELOG document the variables, resolver, and motion behavior.
- **Design decision resolved:** `--bm-*` prefix; resolver function plus `createIntensityColorScale`, with `INTENSITY_COLORS` as the default scale.
- **Verification:** `npm run typecheck`, `npm run build`, `npm run verify-build` (89 regions across both views, 11 intensity colours), and 25 browser tests pass (7 new: custom resolvers, CSS-variable defaults and overrides, constrained container, reduced motion, default tooltip intensity, selection/focus distinguishable from intensity, demo theme overrides). Real-browser inspection confirmed the light theme is visually unchanged, the dark theme now renders visible region outlines, and the focus halo and tooltip render correctly in both.
- **Compatibility:** additive for the documentable API (`intensityColor`, new exports, all CSS variables default to the previous values). Two behaviour changes: the default tooltip now includes intensity when state exists, and reduced-motion users no longer get transitions. Both are recorded in the CHANGELOG.

### B2 — Typed region identifiers and lookup

- **Completed:** 2026-10-09.
- **Commit:** `feat(types)!: derive MuscleId from the anatomy dataset` (see git history for the hash).
- **Changes:** the front and back data arrays are built with the new `defineMuscles` helper (`src/data/muscle-spec.ts`), which keeps each entry's `id` as a string literal while widening `name`/`path` — a bare `as const` would have emitted every SVG path as a literal type into the published declarations (measured: 50 KB of `.d.ts` versus 7.7 KB with the helper). `MuscleId` is now `FrontMuscleId | BackMuscleId`, derived from the data. Added `MUSCLE_DEFS` (typed `Record<MuscleId, MuscleDef>`), `getMuscleDef(id: string)` and `isMuscleId(value): value is MuscleId` in `src/data/index.ts`, exported through the root, plus the `MuscleSpec`, `MuscleEntry`, `FrontMuscleId`, and `BackMuscleId` types. `BodyChart`'s `musclePaths` map and `refreshPath` are keyed by `MuscleId`. Added `tests/types/consumer.ts` with `npm run test:types` (wired into CI after the build), a browser test for the lookup API, and README/site documentation including the migration for runtime identifiers.
- **Design decision resolved:** strict literal union derived from the dataset, accepted as a breaking change requiring a major release.
- **Verification:** `npm run typecheck`, `npm run build`, `npm run verify-build`, `npm run test:types` (fixture compiles; its `@ts-expect-error` directives fire, so unknown literals do fail), and 26 browser tests pass. Runtime checks against the built bundle confirm `getMuscleDef` resolves 89 identifiers, returns `undefined` for unknown input, does not leak prototype keys (`constructor`, `toString`), and that `MUSCLE_DEFS` is keyed by the canonical entries. Declaration output stays compact (7.7 KB across the three affected `.d.ts` files).
- **Compatibility:** breaking. Consumers passing arbitrary strings as state keys, callback ids, or helper arguments must narrow with `isMuscleId` or switch to `getMuscleDef`. Recorded as **BREAKING** in the CHANGELOG, which now states the next release must be a major version. Existing identifiers are unchanged.

### B3 — Explicit state replacement and patch semantics

- **Completed:** 2026-10-09.
- **Commit:** `docs: specify bodyState replacement semantics` (see git history for the hash).
- **Changes:** documented the two merge rules explicitly — shallow option merge with `undefined` ignored, versus whole-mapping replacement for `bodyState` — in the `BodyChartOptions.bodyState` and `BodyChart.update()` JSDoc, the README "State updates" subsection, and the site's "State Updates" reference. Each shows three concrete patterns: replace one region while spreading the rest, apply an externally built patch, and remove one region's state by destructuring it out. Added a browser regression that pins the contract: an omitted region loses its selection and default fill, a spread preserves unmentioned entries, a deleted key returns the region to its default, and the caller's mapping is never mutated.
- **Design decision resolved:** no patch API. A spread expresses preservation and removal, and a second entry point with different merge rules would make the two easy to confuse; the decision and its rationale are documented next to the examples.
- **Verification:** `npm run test:browser` — 27 tests pass, including the new replacement/preservation regression, which asserts observed region attributes rather than source text.
- **Compatibility:** documentation plus a test; no behaviour, API, or changelog change. The chart still never mutates the mapping it receives and owns no selection state.

### B4 — Consistent intensity validation

- **Completed:** 2026-10-09.
- **Commit:** `fix(api)!: validate intensities as integers from 0 to 10` (see git history for the hash).
- **Changes:** `isValidIntensity` now accepts `unknown` and requires a finite integer from 0 to 10; `createBodyPartState` throws a descriptive message naming the value; the new exported `assertValidBodyState` reports the offending region and value. The `BodyChart` constructor validates before mounting (a rejected construction leaves the container empty) and `update()` validates before mutating any internal state (a rejected update leaves options and rendering untouched). Colour helpers keep rounding and clamping defensively, now documented as deliberate because consumers own the mapping and may mutate it between updates.
- **Policy chosen:** one validity rule (finite integers 0–10) enforced at the API boundary, with tolerant rendering; the review's recommendation was adopted.
- **Verification:** `npm run typecheck`, `npm run build`, `npm run verify-build`, `npm run test:types`, and 28 browser tests pass. The new browser regression covers `0` and `10` as accepted boundaries, the guard's verdicts for `0, 10, 5.5, -1, 11, NaN, Infinity`, factory messages for each rejection, a rejected construction mounting nothing, a rejected `update()` leaving the fill and `aria-pressed` unchanged, and a subsequent valid update still applying. The earlier resolver regression was rewritten so the clamping assertion targets the colour scale itself rather than a chart accepted out-of-range input.
- **Compatibility:** breaking for consumers who passed fractional or out-of-range intensities and relied on silent rounding or clamping; recorded as **BREAKING** in the CHANGELOG with the migration (validate or clamp before calling `update()`).

### B5 — Localization and shared label resolution

- **Completed:** 2026-10-09.
- **Commit:** `feat(i18n): add shared label resolution` (see git history for the hash).
- **Changes:** new `ChartLabels` option (`labels`) with `chart`, `regionName`, `region`, `intensity`, `tooltip`, and `viewLabel` members, resolved through private `chartName`/`regionName`/`intensityPhrase`/`regionLabel`/`tooltipText`/`viewLabelText` helpers so one mechanism feeds the visual overlay, the tooltip, the accessible names, and the `onMuscleClick` name argument. `tooltipFormatter` is now stored unresolved so the documented precedence (`tooltipFormatter` → `labels.tooltip` → default, and `ariaLabel` → `labels.chart` → default) can be applied at render time. `update()` re-applies the chart label, view labels, every region name, and an open tooltip when `labels` changes, in place and without dropping focus.
- **Precedence and ownership:** documented in the option JSDoc, README, and site reference. `labels` follows the same whole-object replacement rule as `bodyState` (spread to change one member), which keeps the two consistent rather than introducing a second merge rule. Selection needs no wording: it is exposed as `aria-pressed`, so no label member was invented for it.
- **Verification:** `npm run typecheck`, `npm run build`, `npm run verify-build`, `npm run test:types`, and 30 browser tests pass. The localization regression renders a German configuration and asserts the chart name, region accessible names (with and without intensity), the overlay label, the `labels.tooltip` content, precedence for both `tooltipFormatter` and `ariaLabel`, a runtime member change applied without a rebuild while focus is retained, the localized name reaching `onMuscleClick`, and the localized name appearing in Playwright's accessibility-tree snapshot. A second regression pins the English defaults, including the two `BOTH`-view labels. The type fixture adds a `ChartLabels` usage plus a rejected non-string `regionName`.
- **Compatibility:** additive; defaults are byte-identical to the previous English wording, verified by the defaults regression.

### B6 — Explicit anatomy metadata and terminology

- **Completed:** 2026-10-09.
- **Commit:** `feat(data): expose canonical anatomy metadata` (see git history for the hash).
- **Changes:** `MUSCLE_GROUPS` is now `as const satisfies Record<string, readonly MuscleId[]>`, so its names become the `MuscleGroup` literal union and every listed identifier is checked against the dataset at compile time. New `MuscleMetadata` (`id`, `name`, `view`, `side`, `group`), the canonical `MUSCLE_METADATA` record keyed by identifier, and `getMuscleMetadata(id)` for dynamic input. `side` is derived through the existing `extractMuscleSide` (one implementation, so metadata and helper cannot disagree) and `group` is inverted from `MUSCLE_GROUPS`, so the table is not a second source of truth. README and site documentation state that sides are the subject's own left/right (anatomical convention, `biceps-left` drawn on the viewer's right in the anterior view), that the dataset describes regions rather than only individual muscles, and that `extractMuscleGroup` returns the identifier prefix rather than the display group.
- **Verification:** `npm run build`, `npm run verify-build` (now additionally asserts metadata/group consistency across all 89 regions, single-group coverage, and no prototype leakage from the lookups), `npm run test:types` (typed side/group access, rejected unknown keys and group names), and 31 browser tests pass. The new browser regression pins representative front, bilateral, back, and central regions, group membership for every region, exactly one group per region, the eight group names, and undefined results for unknown and prototype keys. Identifier values and geometry are unchanged (89 regions, 11 intensity colours).
- **Compatibility:** additive for metadata; `MUSCLE_GROUPS` values are now `readonly` and its keys are a literal union, so in-place mutation of that canonical table stops compiling. No identifier changed.

### B7 — Searchable developer anatomy catalog

- **Completed:** 2026-10-09.
- **Commit:** `feat(docs): add a searchable anatomy catalog` (see git history for the hash).
- **Changes:** new "Anatomy Catalog" section on the documentation site (`docs/index.html`, `docs/style.css`, `docs/app.js`), reachable from the header nav. It renders one row per region — identifier, display name, group, side, and view — built from `MUSCLE_MAP` + `MUSCLE_METADATA`, with the group filter options taken from `MUSCLE_GROUPS`, so it is generated from the exported data rather than a second manual list. Controls are a labelled search input plus labelled native group/side/view selects inside a `role="search"` form; results are buttons in a list, with a `role="status"` result count, and the preview follows keyboard focus and marks the active row with `aria-current`. The preview draws both views from the canonical geometry (40 anterior paths, 49 posterior paths) and highlights the active region, with the SVG marked `aria-hidden` so the text caption carries the description. Layout stacks to a single column below 768px.
- **Verification:** 35 browser tests pass (4 new: canonical coverage and order, text/group/side/view filtering including the empty state, preview-follows-focus with exactly one `aria-current` and one highlighted path in the correct view, and a 390px check that controls and rows fit the viewport, stay tappable, and stack). Manual browser inspection confirmed 89 rows, correct filtering, keyboard preview updates, and responsive stacking; axe-core 4.13.0 on the served page reports 0 violations, 1 incomplete, and 50 passes in both themes (up from 45 passes with no new violations). The pre-existing narrow-screen overflow in the site header and install tabs is unrelated to the catalog and unchanged.
- **Compatibility:** documentation site only; no package API, changelog, or behaviour change. The README now links to the catalog from the anatomy-data section.

### B8 — Supported data-only package entry point

- **Completed:** 2026-10-09.
- **Commit:** `feat(package): publish data-only entry points` (see git history for the hash).
- **Changes:** `package.json` `exports` now publishes `./data` (the compiled `src/data` module: ESM, CommonJS, and types) and `./data.json` (the JSON artifact), plus `./package.json` for tooling. `scripts/export-data.js` writes `schemaVersion: 1` into the JSON and documents the versioning policy (additions keep the version; only an incompatible shape change bumps it). New `scripts/verify-package.mjs` (`npm run test:package`, wired into CI) packs the tarball, unpacks it into an isolated consumer directory, checks that every documented entry point is inside the tarball, and runs ESM and CommonJS consumers that import the module subpath, import the JSON with an attribute / require it, and assert the canonical counts, colours, metadata, and schema version — with no browser globals defined. `scripts/verify-build.mjs` additionally asserts the schema version in dist. README and site document the subpaths, the JSON schema, and the runtime requirements.
- **Design decision resolved:** `./data` as the documented subpath with a typed JSON-backed artifact, ESM + CommonJS + types, schema-versioned.
- **Verification:** `npm run build`, `npm run verify-build` (89 regions, 11 intensity colours, schema version checked), `npm run test:package` (`verified package: emmorts-body-muscles-1.1.1.tgz serves ./data and ./data.json to ESM and CommonJS`), `npm run test:types`, and 35 browser tests pass. The ESM consumer also imports the root entry in Node, proving no browser global is touched at import time.
- **Compatibility:** additive. The `exports` map already restricted undeclared subpaths, and only new subpaths were added, so existing imports are unaffected. `schemaVersion`, `./data`, and `./data.json` are recorded in the CHANGELOG.

### B9 — Runnable TypeScript and framework integration examples

- **Completed:** 2026-10-09.
- **Commit:** `docs: add runnable integration examples` (see git history for the hash).
- **Changes:** new `examples/vanilla-typescript` and `examples/react` projects, each with its own `package.json` (lockfile committed), `tsconfig.json`, esbuild build script, and a small static server; they install the library through `file:../..`, so they consume the published entry points rather than sources. `examples/README.md` documents the build and run commands. The vanilla example covers the DOM null check, application-owned state, view switching, callback replacement, and `destroy()` plus rebuild. The React example constructs the chart in an effect (never during render), applies prop and callback changes through `update()`, destroys on cleanup (including a `key`-driven remount), keeps visible mounted/unmounted counters, and is served both server-rendered with `renderToString` plus `hydrateRoot` and client-only with `createRoot`. The README quick start now null-checks its container, the README framework snippets were rewritten to the final API (null checks in every snippet, ref-based React pattern, SSR and StrictMode notes), and the site's example snippets match. CI gains a separate `Examples` job that installs and builds both examples.
- **Verification:** `npm run build` in both examples (esbuild + `tsc --noEmit`) after a clean `npm ci --prefix` each, matching the CI commands. Real-browser checks on the served pages: the vanilla page rendered 40 anterior regions, toggled a region through `onMuscleClick` state updates, switched to the both-views chart (89 regions), and — after `Rebuild chart` — a click still toggled exactly once, proving the previous chart's listeners were detached, with exactly one container and one tooltip in the DOM throughout. The React page hydrated from server markup, updated state on click, rebuilt on a view change (mounted 2 / unmounted 1), reached the chart with a replaced callback prop, and after `Remount the chart` reported mounted 3 / unmounted 2 with exactly one container and tooltip. The server response for `/` contains 0 chart SVGs, one empty `.chart` container, the rendered controls, the injected initial props, and the client script; `/client-only` mounts the same component with `createRoot`.
- **Compatibility:** repository-only additions plus documentation; no package API, changelog, or behaviour change. Examples are excluded from the published package by the `files` field.

## Phase 2 review corrections

Review baseline: `051005a`. Corrections are implemented and committed separately.

- [x] **P2-R1 — Back/forward-cache restoration.** Removed document-navigation teardown from the vanilla example and both snippets; explicit widget removal/rebuild still calls `destroy()`. Verification: built the vanilla example; actual Chromium navigation away and Back returned `pageshow.persisted=true`, one container, 40 regions, and a working keyboard toggle. Commit: `fix(examples): preserve charts across cached navigation`.
- [x] **P2-R2 — Browser-resolvable vanilla HTML example.** Replaced the site's bare npm import with the same CDN UMD loading pattern as the README. Verification: copied the HTML verbatim into Chromium; the actual CDN script loaded, one chart/40 regions rendered, and no page errors occurred. Commit: `fix(docs): make vanilla HTML example runnable`.
- [x] **P2-R3 — Prevent catalog search submission.** Cancelled the search form's submit action and added a regression for preserving filters and demo selection. Verification: Chromium Enter retained `biceps`, four results, selected Head, the document marker, and the unchanged URL. Commit: `fix(docs): prevent catalog search navigation`.
- [x] **P2-R4 — Remove stale catalog preview highlights.** Preserved the previous active ID until `setActive()` clears its highlight; extended filter regressions to assert the highlighted region. Verification: fresh Chromium assets showed only `biceps-left`, then only `lats-upper-left` after switching searches/views. Commit: `fix(docs): clear previous catalog preview on filtering`.
- [x] **P2-R5 — Refresh explicitly resubmitted labels.** Explicit label updates refresh all label-dependent output regardless of object identity. Added a reused-object/focus regression, replacing an incidental default-wording test, and documented the contract. Verification: rebuilt library; Chromium showed German chart/region/overlay/open tooltip labels with focus retained. Commit: `fix(i18n): refresh explicitly resubmitted labels`.
- [x] **P2-R6 — Consistent optional state for label callbacks.** Kept rendering defaults separate from the consumer's optional state passed to `labels.region`; documented omitted vs explicit-zero state and added a transition regression. Verification: rebuilt library; Chromium accessible names and open tooltips agreed through omitted → explicit zero → omitted state. Commit: `fix(i18n): preserve optional state in region labels`.
- [x] **P2-R7 — Restore current-row annotations after filtering.** Replacement buttons inherit `aria-current` when their region remains active; extended keyboard regression through retained-result filtering and subsequent navigation. Verification: Chromium narrowing `biceps` to `biceps-left` retained exactly one current row and one preview highlight, including after focus. Commit: `fix(docs): retain current catalog row across filters`.
- [x] **P2-R8 — Document TypeScript 5 consumer minimum.** Documented TypeScript 5.0+ in installation/migration guidance, site types, examples prerequisites, and breaking changelog notes; JavaScript requirements remain unchanged. Verification: TypeScript 5.0.4 compiled the representative declaration consumer fixture, including expected invalid-ID errors. The prior TypeScript 4.9 syntax failure establishes the migration need. Commit: `docs: declare TypeScript 5 consumer requirement`.
- [ ] **P2-R9 — Qualify rejected-update guarantees for aliased state.**
- [ ] **P2-R10 — Correct CSS-variable resolver documentation.**
- [ ] **P2-R11 — Genuine vanilla callback replacement.**
