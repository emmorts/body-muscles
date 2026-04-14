const esbuild = require("esbuild");

esbuild.buildSync({
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "iife",
  globalName: "BodyMuscles",
  outfile: "dist/umd/body-muscles.umd.js",
  target: ["es2018"],
  minify: false,
});

esbuild.buildSync({
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "iife",
  globalName: "BodyMuscles",
  outfile: "dist/umd/body-muscles.umd.min.js",
  target: ["es2018"],
  minify: true,
});

console.log("UMD build complete → dist/umd/");
