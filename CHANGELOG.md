# Changelog

## 1.1.0 (Unreleased)

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
