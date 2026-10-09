import esbuild from "esbuild";

// Bundles the example the way an application would: the library is resolved
// through its published entry points, not from source.
await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "esm",
  target: ["es2020"],
  sourcemap: true,
  outfile: "dist/app.js",
});

console.log("built examples/vanilla-typescript/dist/app.js");
