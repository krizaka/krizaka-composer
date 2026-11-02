import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// The release job runs the Changesets action v2, which needs CLI v3: with the CLI pinned at ^2 on main the job failed.
const MIN_MAJOR = 3;
const major = (range) => Number.parseInt(String(range).replace(/^[^\d]*/, ""), 10);
const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

test("package.json pins @changesets/cli at v3 or later", () => {
  const range = read("../package.json").devDependencies["@changesets/cli"];
  assert.ok(major(range) >= MIN_MAJOR, `@changesets/cli is pinned at ${range}, the release action needs v${MIN_MAJOR}+`);
});

test("the installed Changesets CLI is v3 or later and offers version and status", () => {
  const installed = read("../node_modules/@changesets/cli/package.json").version;
  assert.ok(major(installed) >= MIN_MAJOR, `installed @changesets/cli ${installed}`);
  const bin = new URL("../node_modules/@changesets/cli/bin.js", import.meta.url).pathname;
  const help = execFileSync(process.execPath, [bin, "--help"], { encoding: "utf8" });
  assert.match(help, /\bversion\b/);
  assert.match(help, /\bstatus\b/);
});
