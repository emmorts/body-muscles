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

const { BodyChart, ViewSide, filterMuscles, FRONT_MUSCLES, BACK_MUSCLES, INTENSITY_COLORS } =
  await import(path.join(dist, "esm", "index.js"));

assert.equal(typeof BodyChart, "function");
assert.deepEqual(Object.keys(ViewSide).sort(), ["BACK", "BOTH", "FRONT"]);

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
