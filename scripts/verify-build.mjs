// Release gate: exercises the built artifacts rather than the sources, so a broken build step
// (TypeScript emit, `scripts/fix-esm-imports.js`, the UMD bundle, `scripts/export-data.js`)
// fails the release instead of shipping. Run after `npm run build`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

const {
  BodyChart,
  ViewSide,
  filterMuscles,
  FRONT_MUSCLES,
  BACK_MUSCLES,
  MUSCLE_MAP,
  MUSCLE_GROUPS,
  MUSCLE_METADATA,
  getMuscleMetadata,
  extractMuscleSide,
  INTENSITY_COLORS,
} = await import(path.join(dist, "esm", "index.js"));

assert.equal(typeof BodyChart, "function");
assert.deepEqual(Object.keys(ViewSide).sort(), ["BACK", "BOTH", "FRONT"]);

// Metadata must agree with the group table and the identifier convention, so the
// three cannot drift apart in a release.
const grouped = Object.values(MUSCLE_GROUPS).flat();
assert.equal(new Set(grouped).size, grouped.length, "a region appears in more than one group");
assert.equal(grouped.length, MUSCLE_MAP.length, "group coverage does not match the dataset");
assert.equal(Object.keys(MUSCLE_METADATA).length, MUSCLE_MAP.length);
for (const muscle of MUSCLE_MAP) {
  const metadata = MUSCLE_METADATA[muscle.id];
  assert.ok(MUSCLE_GROUPS[metadata.group].includes(muscle.id), `${muscle.id} is not in its own group`);
  assert.equal(metadata.side, extractMuscleSide(muscle.id), `${muscle.id} side disagrees with its id`);
  assert.equal(metadata.name, muscle.name);
  assert.equal(metadata.view, muscle.view);
}
assert.equal(getMuscleMetadata("not-a-region"), undefined);
assert.equal(getMuscleMetadata("constructor"), undefined);

// A side-by-side view must render every region from both sides, once each.
const both = filterMuscles(ViewSide.BOTH);
assert.equal(both.length, FRONT_MUSCLES.length + BACK_MUSCLES.length);
assert.ok(both.length > 0);
assert.equal(new Set(both.map((muscle) => muscle.id)).size, both.length);

// Every emitted module must be resolvable as ESM: relative specifiers need their extension.
for (const file of readdirSync(path.join(dist, "esm"), { recursive: true })) {
  if (!String(file).endsWith(".js")) continue;
  const source = readFileSync(path.join(dist, "esm", String(file)), "utf8");
  for (const [, specifier] of source.matchAll(/\bfrom\s+"([^"]+)"/g)) {
    if (specifier.startsWith(".") && !specifier.endsWith(".js")) {
      throw new Error(`${file} imports extensionless "${specifier}"`);
    }
  }
}

// The JSON artifact a non-browser consumer renders from.
const data = JSON.parse(readFileSync(path.join(dist, "data", "body-muscles-data.json"), "utf8"));
const expectedColors = Array.from({ length: 11 }, (_, i) => INTENSITY_COLORS[i]);
assert.equal(data.schemaVersion, 1, "the JSON artifact must declare its schema version");
assert.deepEqual(data.intensityColors, expectedColors);
assert.deepEqual(
  data.frontMuscles.map((muscle) => muscle.id),
  FRONT_MUSCLES.map((muscle) => muscle.id),
);
assert.deepEqual(
  data.backMuscles.map((muscle) => muscle.id),
  BACK_MUSCLES.map((muscle) => muscle.id),
);

console.log(
  `verified dist: ${both.length} regions across both views, ${data.intensityColors.length} intensity colours`,
);
