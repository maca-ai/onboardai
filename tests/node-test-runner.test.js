import { test } from "node:test";
import assert from "node:assert/strict";

test("node built-in test runner is available", () => {
  assert.equal(typeof test, "function");
});
