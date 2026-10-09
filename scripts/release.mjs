#!/usr/bin/env node
// One-command release for @emmorts/body-muscles:
//
//   npm run release -- 1.1.1
//
// It refuses to run unless the working tree is clean apart from the changelog, the changelog
// already documents the version, the branch is main and level with origin/main, and the tag is
// free. It then bumps the version, commits, tags and pushes; CI publishes to npm and opens the
// GitHub release from the same changelog section.
//
// Only plain `X.Y.Z` versions are accepted: a prerelease would have to be published under a
// different npm dist-tag, which this pipeline deliberately does not do.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { readReleaseNotes } from "./release-notes.mjs";

const PACKAGE_JSON = "package.json";
const CHANGELOG = "CHANGELOG.md";

const fail = (message) => {
  console.error(`release: ${message}`);
  process.exit(1);
};

const gitOut = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const runGit = (...args) => execFileSync("git", args, { stdio: "inherit" });

const argv = process.argv.slice(2);
const assumeYes = argv.includes("--yes");
const args = argv.filter((arg) => arg !== "--yes");
if (args.length !== 1) fail("usage: npm run release -- <version> [--yes]");
const [version] = args;

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  fail(`'${version}' is not a plain X.Y.Z version (prereleases are not supported)`);
}

const rank = (value) => value.split(".").map((part) => Number(part));
const [major, minor, patch] = rank(version);
const [curMajor, curMinor, curPatch] = rank(JSON.parse(readFileSync(PACKAGE_JSON, "utf8")).version);
const isNewer =
  major > curMajor ||
  (major === curMajor && minor > curMinor) ||
  (major === curMajor && minor === curMinor && patch > curPatch);
if (!isNewer) fail(`${version} is not newer than the version in ${PACKAGE_JSON}`);

const dirty = gitOut("status", "--porcelain")
  .split("\n")
  .filter(Boolean)
  .filter((line) => !line.endsWith(CHANGELOG));
if (dirty.length > 0) {
  fail(`the working tree has changes other than ${CHANGELOG}:\n  ${dirty.join("\n  ")}`);
}

if (!readReleaseNotes(CHANGELOG, version)) {
  fail(`${CHANGELOG} has no '## ${version}' section with any content — document it first`);
}

if (gitOut("rev-parse", "--abbrev-ref", "HEAD") !== "main") fail("releases are cut from main");
gitOut("fetch", "origin", "main");
if (gitOut("rev-parse", "HEAD") !== gitOut("rev-parse", "origin/main")) {
  fail("main is not level with origin/main — push or pull first");
}
if (gitOut("tag", "--list", `v${version}`)) fail(`tag v${version} already exists locally`);
if (gitOut("ls-remote", "--tags", "origin", `refs/tags/v${version}`)) {
  fail(`tag v${version} already exists on origin`);
}

if (!assumeYes) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Release v${version}? It will bump, commit, tag and push. [y/N] `);
  rl.close();
  if (answer.trim().toLowerCase() !== "y") fail("aborted");
}

const manifest = readFileSync(PACKAGE_JSON, "utf8");
const bumped = manifest.replace(/("version"\s*:\s*")[^"]+(")/, `$1${version}$2`);
if (bumped === manifest) fail(`could not find a version field in ${PACKAGE_JSON}`);
writeFileSync(PACKAGE_JSON, bumped);

runGit("add", PACKAGE_JSON, CHANGELOG);
runGit("commit", "-m", `chore(release): ${version}`);
runGit("tag", `v${version}`);
runGit("push", "origin", "main");
runGit("push", "origin", `v${version}`);

console.log(`\nv${version} pushed. CI publishes it to npm and creates the GitHub release.`);
console.log("Follow it with: gh run list -R emmorts/body-muscles --workflow=release.yml --limit 3");
