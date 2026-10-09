// Exports the muscle geometry and the intensity colour scale as one JSON artifact, so a
// consumer that renders the map without a browser (for example a backend that rasterises it
// into an image) can use exactly the same data as the runtime library.
//
// Written to dist/data/body-muscles-data.json and shipped with the package; `build` runs it.
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const tempDir = path.resolve(__dirname, "../.tmp");
const tempFile = path.join(tempDir, "data-export.cjs");

async function main() {
  fs.mkdirSync(tempDir, { recursive: true });
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, "../src/data/index.ts")],
    bundle: true,
    format: "cjs",
    platform: "node",
    target: ["es2020"],
    outfile: tempFile,
  });

  const { FRONT_MUSCLES, BACK_MUSCLES, INTENSITY_COLORS } = require(tempFile);
  const intensityColors = Array.from(
    { length: 11 },
    (_, i) => INTENSITY_COLORS[i],
  );

  const outPath = path.resolve(
    __dirname,
    "../dist/data/body-muscles-data.json",
  );
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      { intensityColors, frontMuscles: FRONT_MUSCLES, backMuscles: BACK_MUSCLES },
      null,
      2,
    ),
  );
  console.log(`Exported body-muscles data to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
