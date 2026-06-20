import { execFileSync } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";

const packageRoot = new URL("..", import.meta.url);

test("cli prints usage for empty invocation", () => {
  const output = execFileSync("node", ["dist/index.js"], {
    cwd: packageRoot,
    encoding: "utf8"
  });

  assert.match(output, /onboardai flow validate/);
});
