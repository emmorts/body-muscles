import esbuild from "esbuild";

const shared = {
  bundle: true,
  jsx: "automatic",
  target: ["es2020"],
  sourcemap: true,
};

// Browser bundle: React is bundled in, the chart comes from the package entry.
await esbuild.build({
  ...shared,
  entryPoints: ["src/client.tsx"],
  format: "esm",
  outfile: "dist/client.js",
  define: { "process.env.NODE_ENV": '"production"' },
});

// Server bundle: React stays external so Node resolves the installed copy.
await esbuild.build({
  ...shared,
  entryPoints: ["src/server.tsx"],
  format: "esm",
  platform: "node",
  outfile: "dist/server.js",
  external: ["react", "react-dom", "react-dom/client", "react-dom/server"],
});

console.log("built examples/react/dist/{client.js,server.js}");
