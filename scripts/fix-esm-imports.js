// Post-processes the `tsc --module esnext` output in dist/esm so it can be loaded as modules:
// adds .js extensions to relative specifiers (tsc emits `from "./foo"`, which neither browsers
// nor Node can resolve) and marks the directory as ESM, since this package is untyped and
// `exports.import` points here.

const fs = require("fs");
const path = require("path");

const dir = path.resolve(__dirname, "../dist/esm");

function walk(d) {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith(".js")) {
      let src = fs.readFileSync(full, "utf8");
      const fileDir = path.dirname(full);
      // Match: from "./something"  or  from "../something" (without .js)
      const updated = src.replace(/(from\s+["'])(\.\.?\/[^"']+)(["'])/g, (match, pre, specifier, post) => {
        if (specifier.endsWith(".js")) return match;
        // Check if the specifier points to a directory with an index.js
        const resolved = path.resolve(fileDir, specifier);
        if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
          return `${pre}${specifier}/index.js${post}`;
        }
        return `${pre}${specifier}.js${post}`;
      });
      if (updated !== src) {
        fs.writeFileSync(full, updated, "utf8");
      }
    }
  }
}

walk(dir);
fs.writeFileSync(
  path.join(dir, "package.json"),
  `${JSON.stringify({ type: "module" }, null, 2)}\n`,
);
console.log("Fixed ESM import extensions in dist/esm/");
