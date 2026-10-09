<div align="center">

<img src="https://raw.githubusercontent.com/emmorts/body-muscles/main/docs/favicon.svg" width="64" height="64" alt="" />

# Body Muscles

An interactive, accessible SVG body map for the web.

[![npm](https://img.shields.io/npm/v/@emmorts/body-muscles)](https://www.npmjs.com/package/@emmorts/body-muscles)
[![types](https://img.shields.io/npm/types/@emmorts/body-muscles)](https://www.npmjs.com/package/@emmorts/body-muscles)
[![CI](https://github.com/emmorts/body-muscles/actions/workflows/ci.yml/badge.svg)](https://github.com/emmorts/body-muscles/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@emmorts/body-muscles)](LICENSE)

[Documentation](https://emmorts.github.io/body-muscles/) ·
[Live playground](https://emmorts.github.io/body-muscles/#playground) ·
[Examples](examples/README.md) ·
[Changelog](CHANGELOG.md)

</div>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/emmorts/body-muscles/main/.github/assets/preview-dark.png" />
    <img src="https://raw.githubusercontent.com/emmorts/body-muscles/main/.github/assets/preview-light.png" width="840" alt="The Body Muscles playground: front and back body views with the chest and shoulders shaded by intensity, beside an inspector showing the selected region, its intensity, and the state passed to the chart." />
  </picture>
</p>

You own the state — an intensity from 0 to 10 and a selected flag per region — and Body Muscles
draws it, handles pointer and keyboard interaction, and labels every region. It is plain DOM, so it
works with React, Vue, Svelte, Angular, or no framework at all.

- **89 anatomical regions** across anterior and posterior views, with name, side, and group metadata
- **Accessible by default** — one tab stop, arrow-key navigation, toggle-button semantics, focus tooltips
- **Typed identifiers** — a misspelled region identifier is a compile error
- **Selection helpers** — pure functions that select a whole group or both sides of a region
- **Themeable and localizable** — `--bm-*` CSS custom properties and replaceable labels
- **Data without a DOM** — `/data` and `/data.json` entry points for servers and custom renderers
- **Zero dependencies** — ESM, CommonJS, and a browser build (about 23 KB gzipped)

This is a maintained fork of [vulovix/body-muscles](https://github.com/vulovix/body-muscles) — see [Credits](#credits).

## Installation

```sh
npm install @emmorts/body-muscles
pnpm add @emmorts/body-muscles
yarn add @emmorts/body-muscles
bun add @emmorts/body-muscles
```

> [!NOTE]
> TypeScript consumers need **TypeScript 5.0 or later**: the declarations use const type
> parameters, which older compilers cannot parse even with `skipLibCheck`. JavaScript needs no
> compiler, and the runtime supports Node 16+.

### Without a build step

```html
<!-- Native ES module -->
<script type="module">
  import { BodyChart, ViewSide } from "https://esm.sh/@emmorts/body-muscles";
</script>

<!-- Classic script exposing a BodyMuscles global; also works from file:// -->
<script src="https://unpkg.com/@emmorts/body-muscles/dist/umd/body-muscles.umd.min.js"></script>
```

## Quick start

```ts
import { BodyChart, ViewSide, type BodyState } from "@emmorts/body-muscles";

const container = document.querySelector<HTMLElement>("#body-map");
if (!container) throw new Error("Missing #body-map");

let state: BodyState = {
  "biceps-left": { intensity: 7, selected: true },
  "quads-right": { intensity: 3, selected: false },
};

const chart = new BodyChart(container, {
  view: ViewSide.BOTH,
  bodyState: state,
  onMuscleClick(id) {
    const current = state[id] ?? { intensity: 0, selected: false };
    state = { ...state, [id]: { ...current, selected: !current.selected } };
    chart.update({ bodyState: state });
  },
});

// Later: switch views in place, and destroy the chart when its widget is removed.
chart.update({ view: ViewSide.FRONT });
chart.destroy();
```

The chart fills its container's width. Leave it mounted across page navigation so the browser's
back/forward cache can restore it; call `destroy()` only when you remove the widget.

## Guides

### State

`update()` merges options shallowly and ignores `undefined` values. `bodyState`, however, is
**replaced as a whole**: a region missing from the new mapping returns to intensity 0, unselected.
The chart never mutates your mapping and keeps no selection state of its own, so your application
remains the single source of truth.

```ts
// Keep every other region and change one.
chart.update({ bodyState: { ...state, "biceps-left": { intensity: 7, selected: true } } });

// Remove one region's state.
const { "biceps-left": removed, ...rest } = state;
chart.update({ bodyState: rest });
```

There is deliberately no separate patch method: a spread expresses both preservation and removal,
and a second entry point with different merge rules would be easy to mix up. Changing `view` or
`interactive` rebuilds the chart; every other update applies in place and keeps keyboard focus and
any open tooltip.

#### Intensity values

An intensity is a **finite integer from 0 to 10**. The constructor, `update()`, and
`createBodyPartState()` throw a descriptive error for fractions, negatives, values above 10, `NaN`,
or infinities, and a rejected `update()` applies none of the submitted options.

```ts
isValidIntensity(9); // true
isValidIntensity(9.5); // false

// Error: Invalid bodyState entry for "biceps-left": intensity 12. Expected an integer from 0 to 10.
chart.update({ bodyState: { "biceps-left": { intensity: 12, selected: true } } });
```

> [!IMPORTANT]
> The chart holds your mapping by reference, so a rejected update cannot undo mutations you already
> made to an accepted object. Validate before mutating shared state, or submit a new mapping.

The colour helpers (`resolveIntensityColor`, `createIntensityColorScale`, `getMuscleColor`) never
throw: they round and clamp into 0–10, because they also render mappings mutated after the chart
accepted them.

### Group and bilateral selection

Two pure helpers return a new state for a whole group, or for a region and its opposite side:

```ts
import { setBilateralSelection, setGroupSelection } from "@emmorts/body-muscles";

state = setGroupSelection(state, "Arms", "toggle");
state = setBilateralSelection(state, "biceps-right", "select");
chart.update({ bodyState: state });
```

- Actions are explicit: `"select"`, `"deselect"`, or `"toggle"`. Toggle deselects a fully selected
  target and otherwise selects all of it.
- Groups span both views. Pairs come from `MUSCLE_PAIRS`, never identifier substitution; either
  side addresses the same pair, and central regions such as `spine` act alone.
- Existing intensities and unrelated entries are kept. Selecting a missing entry creates
  `{ intensity: 0, selected: true }`; deselecting a missing entry leaves it absent.
- Inputs are never mutated. A no-op returns the same mapping, and unchanged entries are shared.

### Typed identifiers

`MuscleId` is a union derived from the dataset, so state keys, callbacks, and helpers are checked at
compile time:

```ts
const state: BodyState = {
  "biceps-left": { intensity: 7, selected: true }, // ok
  "bicepz-left": { intensity: 7, selected: true }, // error: not a region identifier
};
```

Identifiers that only exist at runtime — URL parameters, stored state, user input — must be
narrowed before they are used as keys:

```ts
const raw = new URLSearchParams(location.search).get("muscle") ?? "";

const state: BodyState = isMuscleId(raw) ? { [raw]: createBodyPartState(5) } : {};
const name = getMuscleDef(raw)?.name ?? "unknown"; // accepts any string
```

Identifiers follow `{group}-{side}` (`biceps-left`), `{group}-{part}-{side}`
(`shoulder-front-left`), or a single word for central regions (`spine`). Read side and group from
the metadata rather than parsing identifiers.

### Accessibility

An interactive chart is one composite widget with a **single tab stop**. Each region is a toggle
button whose pressed state follows `selected`, so selection is never conveyed by colour alone, and
keyboard focus has its own high-contrast halo.

| Key                         | Action                                       |
| --------------------------- | -------------------------------------------- |
| <kbd>Tab</kbd>              | Enter or leave the chart in one step         |
| <kbd>→</kbd> <kbd>↓</kbd>   | Next region                                  |
| <kbd>←</kbd> <kbd>↑</kbd>   | Previous region                              |
| <kbd>Home</kbd> / <kbd>End</kbd> | First / last region                     |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Activate the focused region (fires `onMuscleClick`) |
| <kbd>Esc</kbd>              | Dismiss the tooltip                          |

Set `interactive: false` for a display-only chart, announced as a single labelled image: regions
are not focusable or clickable, callbacks never fire, and no tooltip renders. Use `ariaLabel` to
name the chart in either mode.

> [!NOTE]
> Verified with keyboard interaction, Chromium's accessibility tree, and automated audits.
> Screen-reader announcements and browse-mode behaviour have not been verified, and these checks do
> not establish full WCAG conformance.

### Theming

Every chart style reads a `--bm-*` custom property with the built-in value as its fallback, so
nothing changes until you override one. Set them on the container or any ancestor:

```css
.body-map {
  --bm-max-height: 55vh;
  --bm-region-stroke: #0f172a;
  --bm-region-stroke-selected: #f8fafc;
  --bm-region-inactive-opacity: 0.4;
  --bm-tooltip-bg: rgb(15 23 42 / 0.95);
}
```

Selection draws its own outline and glow, and keyboard focus a separate dual-tone halo, so both stay
distinguishable from any intensity palette.

<details>
<summary>All CSS custom properties</summary>

| Property                            | Applies to                          | Default                                      |
| ----------------------------------- | ----------------------------------- | -------------------------------------------- |
| `--bm-padding`                      | Wrapper padding                     | `1rem`                                       |
| `--bm-max-height`                   | Chart height limit                  | `70vh`                                       |
| `--bm-max-width`                    | Width limit, single view            | `400px`                                      |
| `--bm-max-width-both`               | Width limit, `BOTH` view            | `760px`                                      |
| `--bm-svg-shadow`                   | Chart drop shadow                   | `drop-shadow(0 4px 20px rgba(0, 0, 0, 0.3))` |
| `--bm-transition-duration`          | Transition timing                   | `200ms`                                      |
| `--bm-region-stroke`                | Region outline                      | `#1e293b`                                    |
| `--bm-region-stroke-width`          | Region outline weight               | `0.1`                                        |
| `--bm-region-stroke-selected`       | Selected outline                    | `#ffffff`                                    |
| `--bm-region-stroke-width-selected` | Selected outline weight             | `0.3`                                        |
| `--bm-region-stroke-focus`          | Keyboard-focus outline              | `#1d4ed8`                                    |
| `--bm-region-stroke-width-focus`    | Keyboard-focus outline weight       | `0.5`                                        |
| `--bm-region-focus-shadow`          | Keyboard-focus halo                 | dual `drop-shadow(…)` ring                   |
| `--bm-region-active-shadow`         | Selected or hovered filter          | `url(#glow)`                                 |
| `--bm-region-inactive-opacity`      | Opacity of untouched regions        | `0.6`                                        |
| `--bm-background-fill`              | Silhouette fill                     | `#cbd5e1`                                    |
| `--bm-background-opacity`           | Silhouette opacity                  | `0.1`                                        |
| `--bm-tooltip-bg`                   | Tooltip background                  | `rgba(15, 23, 42, 0.92)`                     |
| `--bm-tooltip-color`                | Tooltip text                        | `#f8fafc`                                    |
| `--bm-tooltip-padding`              | Tooltip padding                     | `0.35rem 0.65rem`                            |
| `--bm-tooltip-radius`               | Tooltip corner radius               | `0.5rem`                                     |
| `--bm-tooltip-font-size`            | Tooltip font size                   | `0.75rem`                                    |
| `--bm-tooltip-font-weight`          | Tooltip font weight                 | `500`                                        |
| `--bm-tooltip-line-height`          | Tooltip line height                 | `1.2`                                        |
| `--bm-tooltip-shadow`               | Tooltip shadow                      | two-layer `box-shadow`                       |
| `--bm-tooltip-border`               | Tooltip border                      | `1px solid rgba(255, 255, 255, 0.15)`        |
| `--bm-tooltip-backdrop-filter`      | Tooltip backdrop                    | `blur(8px)`                                  |
| `--bm-view-label-color`             | View label text                     | `#64748b`                                    |
| `--bm-view-label-bg`                | View label background               | `rgba(15, 23, 42, 0.5)`                      |
| `--bm-view-label-padding`           | View label padding                  | `0.25rem 0.75rem`                            |
| `--bm-view-label-radius`            | View label corner radius            | `9999px`                                     |
| `--bm-view-label-font-size`         | View label font size                | `0.875rem`                                   |

</details>

#### Colour mapping

Region fill comes from the `intensityColor` resolver, which defaults to the `INTENSITY_COLORS`
palette (slate → yellow → orange → red). Build one from your own stops; intensities are rounded and
clamped into 0–10, and missing levels fall back to the default palette:

```ts
const chart = new BodyChart(container, {
  view: ViewSide.FRONT,
  bodyState: {},
  intensityColor: createIntensityColorScale({ 0: "var(--app-rest, #e5e7eb)", 5: "#f59e0b", 10: "#dc2626" }),
});
```

A resolver may return any valid CSS colour, including `var()` expressions. The browser resolves them
on each region, so they follow theme changes without an `update()`. `getAttribute("fill")` returns
the expression; `getComputedStyle(region).fill` returns the resolved colour.

#### Reduced motion

Transitions are on by default. When the system requests reduced motion, chart and tooltip
transitions are disabled regardless of `enableTransitions`, and the preference is re-evaluated if it
changes at runtime. `--bm-transition-duration` changes timing but never re-enables motion.

### Localization

Every rendered string comes from the optional `labels` members, falling back to English. A dedicated
option beats the matching member: `ariaLabel` over `labels.chart`, and `tooltipFormatter` over
`labels.tooltip`.

```ts
const labels: ChartLabels = {
  chart: () => "Körperkarte",
  regionName: (muscle) => GERMAN_NAMES[muscle.id] ?? muscle.name,
  intensity: (value) => `Intensität ${value}`,
  viewLabel: (view) => (view === ViewSide.FRONT ? "Vorderansicht" : "Rückansicht"),
};

chart.update({ labels: { ...labels, intensity: (value) => `${value} von 10` } });
```

| Member                   | Renders                                                     | Default                                      |
| ------------------------ | ----------------------------------------------------------- | -------------------------------------------- |
| `chart(view)`            | Accessible name of the chart                                | “Anterior body map view” and variants        |
| `regionName(muscle)`     | Base name used by labels, tooltip, and `onMuscleClick`      | `muscle.name`                                |
| `region(muscle, state)`  | Complete accessible name of a region                        | name, plus “- intensity N” above 0           |
| `intensity(value)`       | How an intensity is written                                 | “intensity 7”                                |
| `tooltip(muscle, state)` | Tooltip content                                             | name, plus “- intensity N” when state exists |
| `viewLabel(view)`        | Overlay label for one side                                  | “Anterior View” / “Posterior View”           |

Like `bodyState`, `labels` is replaced as a whole and applied in place without dropping focus.
Explicitly passing `labels` refreshes every label, even when you mutate and resubmit the same object.
`region`, `tooltip`, and `tooltipFormatter` receive `undefined` for regions missing from state, and
the supplied object otherwise — including an explicit intensity 0.

### Anatomy and terminology

The dataset describes **regions**, not a muscle-by-muscle inventory: alongside individual muscles
it includes areas such as `head`, `nape`, `spine`, and `knee-left`. Sides are the **subject's own**,
as in an anatomy atlas, so `biceps-left` is drawn on the viewer's right.

```ts
MUSCLE_METADATA["biceps-left"];
// { id: "biceps-left", name: "Left Biceps", view: "FRONT", side: "left", group: "Arms" }

getMuscleMetadata(input); // MuscleMetadata | undefined, for untrusted strings
```

`MUSCLE_GROUPS` is checked at compile time against the dataset and verified at build time to cover
every region exactly once. `extractMuscleGroup(id)` returns the identifier prefix (`"biceps"`), not
the display group — use `MUSCLE_METADATA[id].group` for that. The
[region catalog](https://emmorts.github.io/body-muscles/#catalog) lists every region with
front/back previews, generated from these exports.

### Data without a DOM

Server code, native apps, and custom renderers can import the anatomy alone. The `/data` subpath
never loads chart code or touches browser globals:

```ts
import { MUSCLE_MAP, MUSCLE_METADATA, INTENSITY_COLORS } from "@emmorts/body-muscles/data";
const { MUSCLE_MAP } = require("@emmorts/body-muscles/data"); // CommonJS
```

It exports `MUSCLE_MAP`, `MUSCLE_DEFS`, `MUSCLE_METADATA`, `MUSCLE_GROUPS`, `MUSCLE_PAIRS`,
`FRONT_MUSCLES`, `BACK_MUSCLES`, `INTENSITY_COLORS`, and the `getMuscleDef` / `getMuscleMetadata` /
`isMuscleId` lookups. For consumers that cannot run JavaScript, the geometry and palette also ship as
JSON at `@emmorts/body-muscles/data.json`:

```jsonc
{
  "schemaVersion": 1, // bumped only when the shape changes incompatibly
  "intensityColors": ["#94a3b8", "…"], // 11 CSS colours, index 0–10
  "frontMuscles": [{ "id": "head", "name": "Head", "view": "FRONT", "path": "M 11.639,…" }],
  "backMuscles": [{ "id": "head-back", "name": "Head (Posterior)", "view": "BACK", "path": "M …" }]
}
```

Import it with `import data from "@emmorts/body-muscles/data.json" with { type: "json" }` (Node
20.10+ or Bun), `require()`, or read the file from any language. The module subpaths work in Node 16+.

## Frameworks

The chart is plain DOM, so every framework integrates the same way: create it once the container
exists, forward state with `update()`, and destroy it on unmount. Runnable vanilla TypeScript and
React projects, including a server-rendered path, live in [`examples/`](examples/README.md).

<details open>
<summary><strong>React</strong></summary>

```jsx
import { useEffect, useRef, useState } from "react";
import { BodyChart, ViewSide } from "@emmorts/body-muscles";

export function BodyMap({ view = ViewSide.FRONT }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [bodyState, setBodyState] = useState({});

  // Read state through a ref so the instance effect depends only on `view`.
  const latest = useRef(bodyState);
  latest.current = bodyState;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const chart = new BodyChart(container, {
      view,
      bodyState: latest.current,
      onMuscleClick(id) {
        setBodyState((prev) => ({
          ...prev,
          [id]: { intensity: prev[id]?.intensity ?? 0, selected: !prev[id]?.selected },
        }));
      },
    });
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [view]);

  // State changes apply in place, preserving focus.
  useEffect(() => {
    chartRef.current?.update({ bodyState });
  }, [bodyState]);

  return <div ref={containerRef} />;
}
```

The chart is created in an effect, never during render, so the component is safe to server-render
and survives StrictMode's double-invoked effects.

</details>

<details>
<summary><strong>Vue</strong></summary>

```vue
<script setup>
import { onMounted, onUnmounted, ref, watch } from "vue";
import { BodyChart, ViewSide } from "@emmorts/body-muscles";

const container = ref(null);
const bodyState = ref({});
let chart;

onMounted(() => {
  chart = new BodyChart(container.value, {
    view: ViewSide.FRONT,
    bodyState: bodyState.value,
    onMuscleClick(id) {
      const current = bodyState.value[id] ?? { intensity: 0, selected: false };
      bodyState.value = { ...bodyState.value, [id]: { ...current, selected: !current.selected } };
    },
  });
});

watch(bodyState, (state) => chart?.update({ bodyState: state }));
onUnmounted(() => chart?.destroy());
</script>

<template>
  <div ref="container" />
</template>
```

</details>

<details>
<summary><strong>Svelte</strong></summary>

```svelte
<script>
  import { onDestroy, onMount } from "svelte";
  import { BodyChart, ViewSide } from "@emmorts/body-muscles";

  let container;
  let chart;
  let bodyState = {};

  onMount(() => {
    chart = new BodyChart(container, {
      view: ViewSide.FRONT,
      bodyState,
      onMuscleClick(id) {
        const current = bodyState[id] ?? { intensity: 0, selected: false };
        bodyState = { ...bodyState, [id]: { ...current, selected: !current.selected } };
        chart.update({ bodyState });
      },
    });
  });

  onDestroy(() => chart?.destroy());
</script>

<div bind:this={container} />
```

</details>

<details>
<summary><strong>Plain HTML</strong></summary>

```html
<div id="body-map"></div>
<script src="https://unpkg.com/@emmorts/body-muscles/dist/umd/body-muscles.umd.min.js"></script>
<script>
  const { BodyChart, ViewSide } = BodyMuscles;

  let state = {};
  const chart = new BodyChart(document.getElementById("body-map"), {
    view: ViewSide.FRONT,
    bodyState: state,
    onMuscleClick(id) {
      const current = state[id] ?? { intensity: 0, selected: false };
      state = { ...state, [id]: { ...current, selected: !current.selected } };
      chart.update({ bodyState: state });
    },
  });
</script>
```

</details>

## API reference

### `new BodyChart(container, options)`

Mounts a chart inside `container`. Options set to `undefined` use their defaults; an explicit
`false` is kept.

| Option              | Type                                   | Default            | Description                                         |
| ------------------- | -------------------------------------- | ------------------ | --------------------------------------------------- |
| `view`              | `ViewSide`                             | required           | `FRONT`, `BACK`, or `BOTH`                          |
| `bodyState`         | `BodyState`                            | required           | Intensity and selection per region                  |
| `onMuscleClick`     | `(id: MuscleId, name: string) => void` | no-op              | A region was activated by pointer or keyboard       |
| `onMuscleHover`     | `(id: MuscleId \| null) => void`       | no-op              | Pointer entered a region, or left the chart         |
| `interactive`       | `boolean`                              | `true`             | `false` renders a static labelled image             |
| `intensityColor`    | `(intensity: number) => string`        | default palette    | Fill colour for an intensity                        |
| `labels`            | `ChartLabels`                          | `{}`               | Localized strings; see [Localization](#localization) |
| `ariaLabel`         | `string`                               | per view           | Accessible name of the chart                        |
| `showTooltip`       | `boolean`                              | `true`             | Tooltip on hover and keyboard focus                 |
| `tooltipFormatter`  | `(muscle, state) => string`            | name and intensity | Tooltip content                                     |
| `showViewLabel`     | `boolean`                              | `false`            | Anterior / Posterior overlay labels                 |
| `enableTransitions` | `boolean`                              | `true`             | Animate state changes, unless reduced motion is set |
| `className`         | `string`                               | `""`               | Extra class on the chart wrapper                    |

| Method            | Description                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| `update(options)` | Merge partial options; `undefined` is ignored. `view` and `interactive` rebuild; the rest applies in place. |
| `destroy()`       | Remove the chart and all of its listeners.                                                                |

### Types

```ts
enum ViewSide { FRONT = "FRONT", BACK = "BACK", BOTH = "BOTH" }

type MuscleId = "head" | "face" | "neck-left" | /* … 89 in total … */ "foot-back-right";

interface BodyPartState {
  intensity: number; // integer 0–10
  selected: boolean;
}
type BodyState = Partial<Record<MuscleId, BodyPartState>>;

type IntensityColorResolver = (intensity: number) => string;
type SelectionAction = "select" | "deselect" | "toggle";
type MuscleGroup = keyof typeof MUSCLE_GROUPS;
type MuscleSide = "left" | "right" | "central";

interface MuscleMetadata {
  id: MuscleId;
  name: string;
  view: ViewSide;
  side: MuscleSide; // the subject's own side
  group: MuscleGroup;
}
```

### Data exports

Available from the package root and from `/data`.

| Export                          | Contents                                                         |
| ------------------------------- | ---------------------------------------------------------------- |
| `MUSCLE_MAP`                    | All 89 region definitions, front then back                       |
| `FRONT_MUSCLES`, `BACK_MUSCLES` | Definitions for one view                                         |
| `MUSCLE_DEFS`                   | Definitions keyed by identifier                                  |
| `MUSCLE_METADATA`               | Name, view, side, and group keyed by identifier                  |
| `MUSCLE_GROUPS`                 | The eight canonical groups; each region belongs to exactly one   |
| `MUSCLE_PAIRS`                  | Readonly `[left, right]` counterparts within the same view       |
| `INTENSITY_COLORS`              | Default palette, levels 0–10                                     |

### Utilities

| Function                                      | Description                                                    |
| --------------------------------------------- | -------------------------------------------------------------- |
| `setGroupSelection(state, group, action)`     | New state with a whole group selected, deselected, or toggled  |
| `setBilateralSelection(state, id, action)`    | The same for a region and its counterpart                      |
| `createBodyPartState(intensity?, selected?)`  | Validated state entry                                          |
| `isValidIntensity(value)`                     | Whether a value is an integer from 0 to 10                     |
| `isMuscleId(value)`                           | Type guard for a known region identifier                       |
| `getMuscleDef(id)`                            | Region definition, or `undefined`                              |
| `getMuscleMetadata(id)`                       | Region metadata, or `undefined`                                |
| `filterMuscles(view)`                         | Definitions drawn in a view                                    |
| `getMuscleColor(state, isHovered, resolver?)` | Fill colour for a state entry                                  |
| `resolveIntensityColor(intensity)`            | The default colour resolver                                    |
| `createIntensityColorScale(colors)`           | Resolver from custom palette stops                             |
| `extractMuscleSide(id)`                       | `"left"`, `"right"`, or `"central"`                            |
| `extractMuscleGroup(id)`                      | Identifier prefix such as `"biceps"` — not the display group   |

## Contributing

Development needs **Node 20+** (Playwright's minimum) and a downloaded Chromium; this is separate
from the library's Node 16+ runtime support.

```sh
npm install
npx playwright install chromium

npm run typecheck
npm run build          # ESM, CommonJS, UMD, and dist/data/body-muscles-data.json
npm run verify-build   # assert the built artifacts are complete
npm run test:types     # compile a consumer against the built declarations
npm run test:selection # selection helper behaviour
npm run test:package   # pack the package and import it from ESM and CommonJS
npm run test:browser   # chart, docs, and accessibility tests in headless Chromium
npm run docs           # assemble docs/lib and serve the site on :3000
```

Commands after `build` test the built output, and the [examples](examples/README.md) install the
library from this checkout, so build first.

<details>
<summary>Repository layout</summary>

```
src/
  BodyChart.ts   the chart
  types.ts       public types
  data/          region geometry, metadata, groups, and pairs
  utils/         colour, lookup, validation, and selection helpers
docs/            documentation site: static HTML, one layered stylesheet, ES modules
examples/        runnable vanilla TypeScript and React projects
tests/           browser, selection, and consumer type tests
scripts/         build, verification, docs, and release scripts
```

The documentation site themes the chart only through the public `--bm-*` properties and is deployed
to GitHub Pages by [`docs.yml`](.github/workflows/docs.yml) on every push to `main` that touches it.

</details>

<details>
<summary>Releasing</summary>

Releases publish to npm from GitHub Actions with provenance.

1. Add a `## <version>` section to [`CHANGELOG.md`](CHANGELOG.md).
2. Run `npm run release -- <version>`. It checks the tree, changelog, and tag, then bumps
   `package.json`, commits, tags `v<version>`, and pushes.
3. CI verifies the build, publishes the package, and opens a GitHub release from that changelog
   section.

</details>

## Credits

Body Muscles was created by [Ivan Vulović](https://github.com/vulovix) as
[vulovix/body-muscles](https://github.com/vulovix/body-muscles). The anatomical artwork, the region
dataset, and the chart's original design and API are his work.

This fork is maintained by [@emmorts](https://github.com/emmorts) and published as
[`@emmorts/body-muscles`](https://www.npmjs.com/package/@emmorts/body-muscles). It adds keyboard and
screen-reader semantics, typed identifiers and metadata, input validation, theming and localization
hooks, selection helpers, a data-only entry point, browser tests, and runnable examples; the
[changelog](CHANGELOG.md) lists every change.

## License

[Apache-2.0](LICENSE). The original copyright notice is kept in [NOTICE](NOTICE), as the license
requires.
