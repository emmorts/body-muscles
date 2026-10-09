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
| `interactive`       | `boolean`                              | `true`      | Enable pointer/keyboard interaction         |

#### Methods

| Method                              | Description                                       |
| ----------------------------------- | ------------------------------------------------- |
| `update(options: Partial<Options>)` | Merge new options. View change triggers re-render. |
| `destroy()`                         | Remove all DOM elements and event listeners.       |

### Types

```typescript
enum ViewSide {
  FRONT = "FRONT",
  BACK = "BACK",
  BOTH = "BOTH",
}

type MuscleId = string;

interface BodyPartState {
  intensity: number; // 0-10
  selected: boolean;
}

type BodyState = Partial<Record<MuscleId, BodyPartState>>;
```

### Data Exports

| Export             | Description                                                                            |
| ------------------ | -------------------------------------------------------------------------------------- |
| `MUSCLE_MAP`       | All 70+ muscle definitions (front + back)                                              |
| `FRONT_MUSCLES`    | Anterior-view muscle definitions                                                       |
| `BACK_MUSCLES`     | Posterior-view muscle definitions                                                      |
| `MUSCLE_GROUPS`    | Named groups: Head & Neck, Shoulders, Arms, Chest, Back, Abdominals, Legs, Hands & Feet |
| `INTENSITY_COLORS` | Color map (0-10) from slate → yellow → orange → red                                    |

### Utility Functions

| Function                                     | Description                              |
| -------------------------------------------- | ---------------------------------------- |
| `getMuscleColor(state, isHovered)`           | Returns hex color for a `BodyPartState`   |
| `filterMuscles(view)`                        | Returns `MuscleDef[]` for the given view  |
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

```bash
npm install
npm run build          # ESM, CommonJS, UMD and dist/data/body-muscles-data.json
npm run verify-build   # load the built artifacts and assert they are complete
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
