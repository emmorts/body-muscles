# Examples

Runnable integrations that consume the published entry points of `@emmorts/body-muscles` — the same
files a consumer installs — rather than the library sources. Each example installs the package from
this repository (`"@emmorts/body-muscles": "file:../.."`), so **build the library first**:

```bash
npm install && npm run build   # from the repository root
```

| Example | Shows |
| --- | --- |
| [`vanilla-typescript`](vanilla-typescript) | DOM null checks, application-owned state, view switching, replacing callbacks, and destroying/rebuilding the chart |
| [`react`](react) | Construction in an effect, prop and callback updates, cleanup on unmount, remounts, and server rendering with hydration |

## Vanilla TypeScript

```bash
cd examples/vanilla-typescript
npm install
npm start                 # builds, then serves http://127.0.0.1:5173
```

`npm run build` bundles and type-checks without serving. The page has buttons for each view, a
callback-replacement button, and a rebuild button that calls `destroy()` before constructing a new
chart.
The callback button swaps between distinct baseline and decorated functions through `update()`;
rebuilding preserves the currently chosen handler.

## React

```bash
cd examples/react
npm install
npm start                 # builds, then serves http://127.0.0.1:5174
```

- `/` — server-rendered with `renderToString` and hydrated in the browser. The chart is constructed
  in an effect, so the server markup contains the controls and an empty chart container only.
- `/client-only` — the same component mounted with `createRoot` and no server markup.

The page keeps counters for charts mounted and unmounted, so remounting and cleanup are visible: the
"Remount the chart" button changes the component `key`, which destroys the previous chart and its
listeners.

## Notes

- Both examples use esbuild and TypeScript 5.0+. Use Node 20+ for the repository's development tooling.
- The examples are not part of the published package (the `files` field ships only `dist` plus the
  root documentation), and they are not workspaces of the root package, so installing them never
  affects the library's dependencies.
