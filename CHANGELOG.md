# Changelog

## Unreleased

### Fixed

- `BodyChart.update()` now applies every option it accepts. It previously refreshed only the
  region colours (and rebuilt on `view`), so changes to `ariaLabel`, `className`,
  `showViewLabel`, `showTooltip`, `tooltipFormatter`, or `enableTransitions` were silently
  ignored until the view changed.
- `update()` ignores `undefined` values, so passing a spread object no longer clobbers options
  that were not meant to change.
- Constructor defaults now apply when optional fields are explicitly `undefined`, including
  `interactive`; explicit `false` options remain respected.
- A visible tooltip now reflects explicit `bodyState` updates, including mutations to a reused
  state mapping, or a new `tooltipFormatter`, without waiting for pointer movement.
- The chart no longer marks its interactive SVG `aria-hidden`, and the container no longer uses
  `role="img"`, so muscle regions are reachable by assistive technology instead of being hidden
  focusable content nested inside an image. Regions are exposed as toggle buttons whose
  `aria-pressed` state tracks `selected`, and keyboard focus shows a high-contrast indicator.

### Changed

- Keyboard navigation now uses a roving tab index: the chart is a single tab stop and regions are
  reached with the arrow keys (`Home`/`End` jump to the ends), instead of placing every region in
  the tab order.
- Added the `interactive` option (default `true`). When `false` the chart is a static, single
  labelled graphic with no focusable regions, tooltip, or callbacks.
- In-place `update()` calls preserve focus; changing `view` or `interactive` rebuilds the chart
  and therefore drops focus.

## 1.1.1 (2026-10-09)

No functional change. This release exists to exercise the release pipeline end to end: the tag
`v1.1.1` is picked up by GitHub Actions, which type-checks, builds and verifies the artifacts,
publishes the package over npm trusted publishing, then opens this GitHub release from this
changelog section.

## 1.1.0 (2026-10-09)

### Features

- Added `ViewSide.BOTH` to render anterior and posterior views side-by-side in a single chart,
  with view labels centred over each half
- Added an instant floating tooltip (`showTooltip`, on by default) with a customisable
  `tooltipFormatter`, positioned near the cursor and clamped to the container
- Muscle hover/focus now uses pointer events with `focus`/`blur` support and
  `aria-describedby` for keyboard and assistive-technology users
- Redrew every muscle region as smoothed bezier paths (`scripts/smooth-raw-paths.ts`)

## 1.0.0 (2026-04-14)

### Features

- Interactive SVG body chart with 70+ individually targetable muscles
- Front and back body views
- Muscle intensity visualization with customizable color mapping
- Muscle group definitions and filtering utilities
- CJS, ESM, and UMD builds
- Zero dependencies
- Framework-agnostic (works with React, Vue, Svelte, or vanilla JS)
