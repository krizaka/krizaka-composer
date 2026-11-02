import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// « chore: version packages » opened with GITHUB_TOKEN starts no workflow, so its required checks never run and the PR is stuck
// (#13, #9). The action must be given the GitHub App token, with GITHUB_TOKEN only as the fallback.
test("the changesets action opens its PR with the app token", () => {
  const text = readFileSync(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");
  assert.match(text, /actions\/create-github-app-token@/);
  assert.match(text, /github-token: \$\{\{ steps\.app\.outputs\.token \|\| secrets\.GITHUB_TOKEN \}\}/);
});
