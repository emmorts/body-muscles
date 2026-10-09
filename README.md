# Body Muscles

**Interactive SVG body map with 70+ muscles, intensity visualization, and zero dependencies.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@emmorts%2Fbody-muscles)](https://www.npmjs.com/package/@emmorts/body-muscles)

**Documentation:** <https://emmorts.github.io/body-muscles/>

Works with React, Vue, Svelte, Angular, or vanilla JavaScript. No framework required.

## Features

- **70+ Anatomical Regions** — Granular muscle mapping, every region drawn as a smoothed bezier path
- **Multiple Views** — Anterior (front), posterior (back), and side-by-side with automatic viewport switching
- **Intensity Scale** — 0–10 gradient color mapping (yellow → orange → red)
- **Instant Tooltips** — Region names follow hover and keyboard focus in an instant floating tooltip, with `tooltipFormatter` for custom content
- **Interactive** — Hover effects, selection states, glow filters
- **Zero Dependencies** — Pure TypeScript, ~40KB UMD / ~29KB minified
- **Three Build Formats** — ESM, CommonJS, UMD (works with `file://` too)
- **TypeScript First** — Full type safety with exported types and interfaces

## Installation

```bash
npm install @emmorts/body-muscles
```

```bash
yarn add @emmorts/body-muscles
```

```bash
pnpm add @emmorts/body-muscles
```

**CDN (ESM):**

```html
<script type="module">
  import { BodyChart, ViewSide } from "https://esm.sh/@emmorts/body-muscles";
</script>
```

**CDN (UMD) — no bundler needed, works from filesystem:**

```html
<script src="https://unpkg.com/@emmorts/body-muscles/dist/umd/body-muscles.umd.min.js"></script>
<script>
  const { BodyChart, ViewSide } = BodyMuscles;
</script>
```

## Quick Start

```typescript
import { BodyChart, ViewSide } from "@emmorts/body-muscles";

const chart = new BodyChart(document.getElementById("container"), {
  view: ViewSide.FRONT,
  bodyState: {},
  onMuscleClick: (id, name) => {
    console.log(`Clicked: ${name} (${id})`);
  },
  onMuscleHover: (id) => {
    console.log("Hovered:", id);
  },
});

// Update body state
chart.update({
  bodyState: {
    "biceps-left": { intensity: 7, selected: true },
    "chest-upper-right": { intensity: 4, selected: false },
  },
});

// Switch to back view
chart.update({ view: ViewSide.BACK });

// Show both views side-by-side
chart.update({ view: ViewSide.BOTH });

// Cleanup when done
chart.destroy();
```

## API Reference

### `new BodyChart(container, options)`

Creates an interactive body map inside the given DOM element.

#### Options

| Option              | Type                                   | Default     | Description                                 |
| ------------------- | -------------------------------------- | ----------- | ------------------------------------------- |
| `view`              | `ViewSide`                             | —           | `FRONT`, `BACK`, or `BOTH` anatomical view  |
| `bodyState`         | `BodyState`                            | —           | Map of muscle IDs to intensity & selection   |
| `onMuscleClick`     | `(id: MuscleId, name: string) => void` | `() => {}`  | Click handler                               |
| `onMuscleHover`     | `(id: MuscleId \| null) => void`       | `() => {}`  | Hover state change handler                  |
| `className`         | `string`                               | `""`        | CSS class for the container wrapper          |
| `ariaLabel`         | `string`                               | `""`        | Accessibility label for the SVG             |
| `showViewLabel`     | `boolean`                              | `false`     | Show "Front / Back / Both" view indicator   |
| `enableTransitions` | `boolean`                              | `true`      | Smooth CSS transitions on state changes     |
| `showTooltip`       | `boolean`                              | `true`      | Display custom instant floating tooltip     |
| `tooltipFormatter`  | `(muscle, state) => string`            | default     | Custom tooltip content formatter callback   |
| `intensityColor`    | `(intensity: number) => string`        | `INTENSITY_COLORS` | Fill-colour resolver for region intensity |
| `interactive`       | `boolean`                              | `true`      | Enable pointer/keyboard interaction         |

Optional constructor fields set to `undefined` use their documented defaults; explicit `false` values are preserved.

The default `tooltipFormatter` renders the region name, plus `- intensity N` when the region has state. Supply your own to change that wording.

#### Methods

| Method                              | Description                                       |
| ----------------------------------- | ------------------------------------------------- |
| `update(options: Partial<Options>)` | Merge new options. `view`/`interactive` changes rebuild; `undefined` values are ignored. |
| `destroy()`                         | Remove all DOM elements and event listeners.       |

#### State updates

`update()` merges the options object shallowly, and `undefined` values are ignored. `bodyState`,
however, is **replaced as a whole** — it is not merged region by region, so a region omitted from
the new mapping returns to its default (intensity 0, unselected). The chart never mutates the
mapping you pass and keeps no selection state of its own, so your application remains the single
source of truth.

```ts
// Keep every other region and change one.
chart.update({ bodyState: { ...current, "biceps-left": { intensity: 7, selected: true } } });

// Apply a patch you built elsewhere to the current mapping.
const patch: BodyState = { "biceps-left": { intensity: 7, selected: true } };
chart.update({ bodyState: { ...current, ...patch } });

// Remove one region's state.
const { "biceps-left": removed, ...rest } = current;
chart.update({ bodyState: rest });
```

There is deliberately no separate patch method: a spread expresses both preservation and removal,
and a second entry point with different merge rules would only make the two easy to mix up.

### Types

```typescript
enum ViewSide {
  FRONT = "FRONT",
  BACK = "BACK",
  BOTH = "BOTH",
}

// Derived from the dataset: the union of every region identifier.
type MuscleId = "head" | "face" | "neck-left" | /* … 89 in total … */ "foot-back-right";

interface BodyPartState {
  intensity: number; // 0-10
  selected: boolean;
}

type BodyState = Partial<Record<MuscleId, BodyPartState>>;

type IntensityColorResolver = (intensity: number) => string;
```

### Data Exports

| Export             | Description                                                                            |
| ------------------ | -------------------------------------------------------------------------------------- |
| `MUSCLE_MAP`       | All 70+ muscle definitions (front + back)                                              |
| `MUSCLE_DEFS`      | The same definitions keyed by identifier, for direct typed access (`MUSCLE_DEFS["biceps-left"]`) |
| `FRONT_MUSCLES`    | Anterior-view muscle definitions                                                       |
| `BACK_MUSCLES`     | Posterior-view muscle definitions                                                      |
| `MUSCLE_GROUPS`    | Named groups: Head & Neck, Shoulders, Arms, Chest, Back, Abdominals, Legs, Hands & Feet |
| `INTENSITY_COLORS` | Color map (0-10) from slate → yellow → orange → red                                    |

### Utility Functions

| Function                                     | Description                              |
| -------------------------------------------- | ---------------------------------------- |
| `getMuscleColor(state, isHovered, resolver?)` | Returns the fill colour for a `BodyPartState` |
| `resolveIntensityColor(intensity)`           | Default intensity → colour resolver       |
| `createIntensityColorScale(colors)`          | Build a resolver from a custom palette    |
| `filterMuscles(view)`                        | Returns `MuscleDef[]` for the given view  |
| `getMuscleDef(id)`                           | Region lookup by any string; `undefined` when unknown |
| `isMuscleId(value)`                          | Type guard narrowing a string to `MuscleId` |
| `createBodyPartState(intensity?, selected?)` | Factory with validation                   |
| `isValidIntensity(value)`                    | Type guard for 0-10 integer               |
| `extractMuscleSide(id)`                      | Returns `"left" \| "right" \| "central"`  |
| `extractMuscleGroup(id)`                     | Returns base group string                 |

## Accessibility

The chart is a composite widget with a **single tab stop**. `Tab` enters the chart on the first
region and leaves it in one step — a keyboard user never has to tab through all regions to reach
the next control.

- `ArrowRight` / `ArrowDown` — next region in reading order
- `ArrowLeft` / `ArrowUp` — previous region in reading order
- `Home` / `End` — first / last region
- `Enter` / `Space` — activate the focused region (fires `onMuscleClick`)
- `Escape` — dismiss the tooltip

Each region is exposed as a toggle button: its name is available to assistive technology and its
pressed state tracks `selected`, so selection is not conveyed by colour alone. Keyboard focus shows
a high-contrast indicator that is independent of the selection/hover styling.

Set `interactive: false` for a display-only chart. It is then announced as a single labelled
graphic: regions are not focusable, hoverable, or clickable, `onMuscleClick` / `onMuscleHover`
never fire, and no tooltip is rendered. Use `ariaLabel` to name the chart in either mode.

Verification covers keyboard interaction, Chromium's accessibility tree, and targeted automated audits.
Screen-reader announcements and browse/focus-mode behavior remain unverified; these checks do not establish full WCAG conformance.

## Styling and Theming

The chart renders with inline styles that reference `--bm-*` CSS custom properties. Every variable
falls back to the built-in default, so existing output is unchanged until you override one. Set them
on the chart container or any ancestor:

```css
.my-chart {
  --bm-padding: 0.5rem;
  --bm-max-height: 55vh;
  --bm-max-width: 320px;
  --bm-region-stroke: #0f172a;
  --bm-region-stroke-selected: #f8fafc;
  --bm-region-inactive-opacity: 0.4;
  --bm-tooltip-bg: rgba(15, 23, 42, 0.95);
  --bm-tooltip-color: #f8fafc;
}
```

| Variable                         | Applies to                             | Default                          |
| -------------------------------- | -------------------------------------- | -------------------------------- |
| `--bm-padding`                   | Wrapper padding                        | `1rem`                           |
| `--bm-max-height`                | SVG height limit                       | `70vh`                           |
| `--bm-max-width`                 | SVG width limit, single-view charts    | `400px`                          |
| `--bm-max-width-both`            | SVG width limit, `BOTH` view           | `760px`                          |
| `--bm-svg-shadow`                | SVG drop shadow                        | `drop-shadow(0 4px 20px rgba(0, 0, 0, 0.3))` |
| `--bm-transition-duration`       | Transition timing                      | `200ms`                          |
| `--bm-region-stroke`             | Unselected region outline              | `#1e293b`                        |
| `--bm-region-stroke-width`       | Unselected outline weight              | `0.1`                            |
| `--bm-region-stroke-selected`    | Selected region outline                | `#ffffff`                        |
| `--bm-region-stroke-width-selected` | Selected outline weight             | `0.3`                            |
| `--bm-region-stroke-focus`       | Keyboard-focus outline                 | `#1d4ed8`                        |
| `--bm-region-stroke-width-focus` | Keyboard-focus outline weight          | `0.5`                            |
| `--bm-region-focus-shadow`       | Keyboard-focus halo filter             | dual `drop-shadow(...)` ring     |
| `--bm-region-active-shadow`      | Selected / hovered filter              | `url(#glow)`                     |
| `--bm-region-inactive-opacity`   | Fill opacity of an untouched region    | `0.6`                            |
| `--bm-background-fill`           | Decorative silhouette fill             | `#cbd5e1`                        |
| `--bm-background-opacity`        | Decorative silhouette opacity          | `0.1`                            |
| `--bm-tooltip-bg`                | Tooltip background                     | `rgba(15, 23, 42, 0.92)`         |
| `--bm-tooltip-color`             | Tooltip text                           | `#f8fafc`                        |
| `--bm-tooltip-padding`           | Tooltip padding                        | `0.35rem 0.65rem`                |
| `--bm-tooltip-radius`            | Tooltip corner radius                  | `0.5rem`                         |
| `--bm-tooltip-font-size`         | Tooltip font size                      | `0.75rem`                        |
| `--bm-tooltip-font-weight`       | Tooltip font weight                    | `500`                            |
| `--bm-tooltip-line-height`       | Tooltip line height                    | `1.2`                            |
| `--bm-tooltip-shadow`            | Tooltip shadow                         | two-layer `box-shadow`           |
| `--bm-tooltip-border`            | Tooltip border                         | `1px solid rgba(255, 255, 255, 0.15)` |
| `--bm-tooltip-backdrop-filter`   | Tooltip backdrop filter                | `blur(8px)`                      |
| `--bm-view-label-color`          | View label text                        | `#64748b`                        |
| `--bm-view-label-bg`             | View label background                  | `rgba(15, 23, 42, 0.5)`          |
| `--bm-view-label-padding`        | View label padding                     | `0.25rem 0.75rem`                |
| `--bm-view-label-radius`         | View label corner radius               | `9999px`                         |
| `--bm-view-label-font-size`      | View label font size                   | `0.875rem`                       |

Selection is drawn as its own outline and glow, and keyboard focus as a dual-tone halo, so both stay
distinguishable from the intensity fill regardless of which palette you use.

### Colour mapping

Region fill comes from an intensity resolver. The default is the exported `INTENSITY_COLORS` palette
(0-10, slate → yellow → orange → red): intensities are rounded and clamped into 0-10, and levels
missing from a custom palette fall back to the default one. Pass `intensityColor`, either as a
function or built from your own palette:

```ts
import { BodyChart, ViewSide, createIntensityColorScale } from "@emmorts/body-muscles";

const chart = new BodyChart(container, {
  view: ViewSide.FRONT,
  bodyState: {},
  intensityColor: createIntensityColorScale({ 0: "#e5e7eb", 5: "#f59e0b", 10: "#dc2626" }),
});
```

The resolver must return a concrete CSS colour value; `var()` references are not resolved in the SVG
`fill` attribute.

### Reduced motion

Transitions are on by default (`enableTransitions: true`). When the user's system requests reduced
motion (`prefers-reduced-motion: reduce`), chart and tooltip transitions are disabled regardless of
`enableTransitions` — the OS preference wins, and it is re-evaluated if the preference changes at
runtime. Overriding `--bm-transition-duration` changes the timing but never re-enables motion.

## Framework Examples

### Vanilla JavaScript

```html
<div id="body-map"></div>
<script src="https://unpkg.com/@emmorts/body-muscles/dist/umd/body-muscles.umd.min.js"></script>
<script>
  const { BodyChart, ViewSide } = BodyMuscles;
  const state = {};

  const chart = new BodyChart(document.getElementById("body-map"), {
    view: ViewSide.FRONT,
    bodyState: state,
    onMuscleClick(id, name) {
      const cur = state[id] || { intensity: 0, selected: false };
      state[id] = { ...cur, selected: !cur.selected };
      chart.update({ bodyState: state });
    },
  });
</script>
```

### React

```jsx
import { useRef, useEffect, useState } from "react";
import { BodyChart, ViewSide } from "@emmorts/body-muscles";

function BodyMap() {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const [bodyState, setBodyState] = useState({});

  useEffect(() => {
    chartRef.current = new BodyChart(ref.current, {
      view: ViewSide.FRONT,
      bodyState,
      onMuscleClick(id) {
        setBodyState((prev) => ({
          ...prev,
          [id]: {
            intensity: prev[id]?.intensity ?? 0,
            selected: !prev[id]?.selected,
          },
        }));
      },
    });
    return () => chartRef.current?.destroy();
  }, []);

  useEffect(() => {
    chartRef.current?.update({ bodyState });
  }, [bodyState]);

  return <div ref={ref} />;
}
```

### Vue 3

```vue
<template>
  <div ref="container" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { BodyChart, ViewSide } from "@emmorts/body-muscles";

const container = ref(null);
const bodyState = ref({});
let chart;

onMounted(() => {
  chart = new BodyChart(container.value, {
    view: ViewSide.FRONT,
    bodyState: bodyState.value,
    onMuscleClick(id) {
      const cur = bodyState.value[id] || { intensity: 0, selected: false };
      bodyState.value = {
        ...bodyState.value,
        [id]: { ...cur, selected: !cur.selected },
      };
    },
  });
});

watch(bodyState, (s) => chart?.update({ bodyState: s }), { deep: true });
onUnmounted(() => chart?.destroy());
</script>
```

### Svelte

```svelte
<script>
  import { onMount, onDestroy } from "svelte";
  import { BodyChart, ViewSide } from "@emmorts/body-muscles";

  let container;
  let chart;
  let bodyState = {};

  onMount(() => {
    chart = new BodyChart(container, {
      view: ViewSide.FRONT,
      bodyState,
      onMuscleClick(id) {
        const cur = bodyState[id] || { intensity: 0, selected: false };
        bodyState = { ...bodyState, [id]: { ...cur, selected: !cur.selected } };
        chart.update({ bodyState });
      },
    });
  });

  onDestroy(() => chart?.destroy());
</script>

<div bind:this={container} />
```

## Muscle ID Naming

```
{muscle_group}-{side}             →  biceps-left
{muscle_group}-{sub_group}-{side} →  shoulder-front-left
{singular}                        →  spine
```

### Typed identifiers

`MuscleId` is a union derived from the dataset, so `bodyState` keys, callbacks, and helpers are
checked at compile time:

```ts
const state: BodyState = {
  "biceps-left": { intensity: 7, selected: true }, // ok
  "bicepz-left": { intensity: 7, selected: true }, // error: not a region identifier
};
```

Identifiers that only exist at runtime — URL parameters, stored state, user input — are not
narrowed automatically, so validate them before using them as keys:

```ts
import { getMuscleDef, isMuscleId, createBodyPartState, type BodyState } from "@emmorts/body-muscles";

const raw: string = new URLSearchParams(location.search).get("muscle") ?? "";

// Narrow first when the value becomes a state key…
const state: BodyState = isMuscleId(raw) ? { [raw]: createBodyPartState(5) } : {};

// …or look the definition up, which accepts any string and returns undefined.
const name = getMuscleDef(raw)?.name ?? "unknown";
```

`MUSCLE_DEFS` is the same data as `MUSCLE_MAP`, keyed by identifier for direct access
(`MUSCLE_DEFS["biceps-left"]`); TypeScript rejects unknown literal keys on it.

## Project Structure

```
body-muscles/
├── src/
│   ├── BodyChart.ts          # Main class
│   ├── types.ts              # TypeScript types & utilities
│   ├── index.ts              # Public exports
│   ├── data/                 # SVG path data & muscle definitions
│   └── utils/                # getMuscleColor, filterMuscles
├── dist/
│   ├── esm/                  # ESM build
│   └── umd/                  # UMD build (browser/CDN)
├── docs/                     # Documentation site
├── scripts/                  # Build scripts
├── package.json
└── tsconfig.json
```

## Development

Development and browser tests require **Node 20+** (Playwright 1.64's minimum) and a downloaded Chromium.
This tooling requirement is separate from the published library's unchanged Node `>=16` consumer contract.

```bash
npm install
npm run build          # ESM, CommonJS, UMD and dist/data/body-muscles-data.json
npm run verify-build   # load the built artifacts and assert they are complete
npm run test:browser   # run the built bundle in headless Chromium
                       # (needs `npm run build` and `npx playwright install chromium` first)
npm run typecheck
npm run smooth-paths   # redraw src/data/muscles.*.ts as bezier paths (idempotent)
npm run docs           # build the browser bundle and serve the docs site on :3000
```

The site in [`docs/`](./docs) is published to <https://emmorts.github.io/body-muscles/> by
[`.github/workflows/docs.yml`](./.github/workflows/docs.yml), which builds the library and uploads
the `docs` directory as the Pages artifact on every push to `main` that touches it.

## License

Apache 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Releasing

This repository publishes
[`@emmorts/body-muscles`](https://www.npmjs.com/package/@emmorts/body-muscles) from GitHub Actions.

1. Add a `## <version>` section to [`CHANGELOG.md`](./CHANGELOG.md) describing the change.
2. Run `npm run release -- <version>`. It checks the tree, the changelog and the tag, then bumps
   `package.json`, commits, tags `v<version>` and pushes.
3. CI type-checks, builds and verifies the artifacts, publishes the package, then opens a GitHub
   release whose notes are that changelog section.
