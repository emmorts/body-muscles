// Release gate for the published package: packs the tarball, unpacks it into an isolated
// consumer directory, and exercises the documented entry points the way a non-browser consumer
// would — the module subpath and the JSON artifact, from both ESM and CommonJS. This catches
// files-array and `exports` map mistakes that the in-repo tests cannot see.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(path.join(tmpdir(), "body-muscles-pack-"));

const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });

const ESM_CONSUMER = `
import assert from "node:assert/strict";
// The root entry must be importable without browser globals.
import { BodyChart } from "@emmorts/body-muscles";
import {
  BACK_MUSCLES,
  FRONT_MUSCLES,
  INTENSITY_COLORS,
  MUSCLE_GROUPS,
  MUSCLE_MAP,
  MUSCLE_METADATA,
  getMuscleMetadata,
} from "@emmorts/body-muscles/data";
import data from "@emmorts/body-muscles/data.json" with { type: "json" };

assert.equal(typeof BodyChart, "function");
assert.equal(FRONT_MUSCLES.length, 40);
assert.equal(BACK_MUSCLES.length, 49);
assert.equal(MUSCLE_MAP.length, 89);
assert.equal(Object.keys(MUSCLE_METADATA).length, 89);
assert.equal(Object.keys(MUSCLE_GROUPS).length, 8);
assert.equal(Object.keys(INTENSITY_COLORS).length, 11);
assert.equal(getMuscleMetadata("biceps-left").group, "Arms");
assert.deepEqual(data.frontMuscles, FRONT_MUSCLES);
assert.deepEqual(data.backMuscles, BACK_MUSCLES);
assert.deepEqual(data.intensityColors, Array.from({ length: 11 }, (_, i) => INTENSITY_COLORS[i]));
assert.equal(data.schemaVersion, 1);
console.log("esm consumer ok");
`;

const CJS_CONSUMER = `
const assert = require("node:assert/strict");
const { FRONT_MUSCLES, BACK_MUSCLES, MUSCLE_MAP, MUSCLE_METADATA, INTENSITY_COLORS, getMuscleMetadata } =
  require("@emmorts/body-muscles/data");
const data = require("@emmorts/body-muscles/data.json");

assert.equal(FRONT_MUSCLES.length, 40);
assert.equal(BACK_MUSCLES.length, 49);
assert.equal(MUSCLE_MAP.length, 89);
assert.equal(MUSCLE_METADATA.spine.side, "central");
assert.equal(getMuscleMetadata("knee-back-left").view, "BACK");
assert.equal(INTENSITY_COLORS[10], "#7f1d1d");
assert.equal(data.schemaVersion, 1);
assert.deepEqual(data.backMuscles, BACK_MUSCLES);
console.log("cjs consumer ok");
`;

try {
  const packed = run("npm", ["pack", "--pack-destination", work, "--silent"], root)
    .trim()
    .split("\n")
    .pop();
  const tarball = path.join(work, path.basename(packed));

  const consumer = path.join(work, "consumer");
  const installed = path.join(consumer, "node_modules", "@emmorts", "body-muscles");
  mkdirSync(installed, { recursive: true });
  run("tar", ["-xzf", tarball, "--strip-components=1", "-C", installed]);

  // The documented entry points must be inside the tarball, not just in dist/.
  for (const file of [
    "dist/index.js",
    "dist/esm/index.js",
    "dist/data/index.js",
    "dist/esm/data/index.js",
    "dist/data/index.d.ts",
    "dist/data/body-muscles-data.json",
  ]) {
    readFileSync(path.join(installed, file));
  }

  writeFileSync(path.join(consumer, "esm-consumer.mjs"), ESM_CONSUMER);
  writeFileSync(path.join(consumer, "cjs-consumer.cjs"), CJS_CONSUMER);
  writeFileSync(path.join(consumer, "package.json"), `${JSON.stringify({ private: true }, null, 2)}\n`);

  const esm = run("node", ["esm-consumer.mjs"], consumer);
  const cjs = run("node", ["cjs-consumer.cjs"], consumer);
  assert.match(esm, /esm consumer ok/);
  assert.match(cjs, /cjs consumer ok/);
  assert.equal(readFileSync(path.join(installed, "package.json"), "utf8").includes('"./data"'), true);

  console.log(`verified package: ${path.basename(tarball)} serves ./data and ./data.json to ESM and CommonJS`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
