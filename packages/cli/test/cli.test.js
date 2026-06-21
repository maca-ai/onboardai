import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const packageRoot = new URL("..", import.meta.url);
const workspaceRoot = new URL("../../..", import.meta.url);

test("cli prints usage for empty invocation", () => {
  const output = execFileSync("node", ["dist/index.js"], {
    cwd: packageRoot,
    encoding: "utf8"
  });

  assert.match(output, /onboardai flow validate/);
});

test("proof fixtures materializes referenced shareable frame artifacts", () => {
  const output = execFileSync("node", ["dist/index.js", "proof", "fixtures"], {
    cwd: packageRoot,
    encoding: "utf8"
  });

  assert.match(output, /fixture proof passed: 2\/2 tools/);
  assert.equal(existsSync(new URL("captures/redacted/odoo-qualify-opportunity/frame-0001.png", workspaceRoot)), true);
  assert.equal(existsSync(new URL("evals/fixtures/notion-update-task-status/held-out-frame-0001.png", workspaceRoot)), true);
});
