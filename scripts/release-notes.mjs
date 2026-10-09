// Reads the notes for a single version out of a CHANGELOG, so the release workflow and
// scripts/release.mjs agree on what a release documents.
//
// Imported as `readReleaseNotes`, or run directly by the release workflow:
//   node scripts/release-notes.mjs 1.1.1 CHANGELOG.md > release-notes.md
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * Returns the body of the `## <version>` section, or null when the changelog does not document
 * that version or documents it with an empty body. The heading may carry a date after the
 * version (`## 1.1.1 (2026-10-09)`); matching on `## <version> ` rather than a prefix keeps
 * `1.1.1` from matching `1.1.10`.
 */
export function readReleaseNotes(changelogPath, version) {
  const heading = `## ${version}`;
  const lines = readFileSync(changelogPath, "utf8").split(/\r?\n/);
  const start = lines.findIndex((line) => line === heading || line.startsWith(`${heading} `));
  if (start === -1) return null;

  const body = [];
  for (let i = start + 1; i < lines.length && !lines[i].startsWith("## "); i += 1) {
    body.push(lines[i]);
  }
  return body.join("\n").trim() || null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [version, changelogPath = "CHANGELOG.md"] = process.argv.slice(2);
  const notes = version ? readReleaseNotes(changelogPath, version) : null;
  if (!notes) {
    console.error(
      `release-notes: ${changelogPath} has no '## ${version ?? "<version>"}' section with any content.`,
    );
    process.exit(1);
  }
  process.stdout.write(`${notes}\n`);
}
