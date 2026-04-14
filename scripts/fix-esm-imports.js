// Fixes ESM imports by adding .js extensions to relative specifiers.
// tsc outputs `from "./foo"` which browsers can't resolve without extensions.

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
console.log("Fixed ESM import extensions in dist/esm/");
