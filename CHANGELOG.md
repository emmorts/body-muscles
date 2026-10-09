# Changelog

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
