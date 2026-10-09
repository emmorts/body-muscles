// Assemble the documentation site's generated assets in `docs/lib/` (git-ignored):
// the freshly built browser bundle and the self-hosted web fonts.
//
// Requires `npm run build`. Pass `--serve` to start a local static server afterwards.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = path.join(root, "docs", "lib");
const modules = path.join(root, "node_modules");

const assets = [
  ["dist/umd/body-muscles.umd.js", "body-muscles.umd.js"],
  ["@fontsource-variable/newsreader/files/newsreader-latin-standard-normal.woff2", "fonts/newsreader.woff2"],
  ["@fontsource-variable/newsreader/files/newsreader-latin-standard-italic.woff2", "fonts/newsreader-italic.woff2"],
  ["@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-standard-normal.woff2", "fonts/ibm-plex-sans.woff2"],
  ["@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2", "fonts/ibm-plex-mono-400.woff2"],
  ["@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2", "fonts/ibm-plex-mono-500.woff2"],
];

rmSync(lib, { recursive: true, force: true });
mkdirSync(path.join(lib, "fonts"), { recursive: true });

for (const [source, target] of assets) {
  const from = source.startsWith("dist/") ? path.join(root, source) : path.join(modules, source);
  if (!existsSync(from)) {
    console.error(`Missing ${path.relative(root, from)}. Run \`npm ci\` and \`npm run build\` first.`);
    process.exit(1);
  }
  copyFileSync(from, path.join(lib, target));
}
const { version } = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
writeFileSync(path.join(lib, "site.json"), `${JSON.stringify({ version })}\n`);
console.log(`docs/lib: ${assets.length} assets, version ${version}`);

if (process.argv.includes("--serve")) {
  spawn("npx", ["--yes", "serve", "docs"], { cwd: root, stdio: "inherit" });
}
