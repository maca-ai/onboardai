import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoPrivilegedProofAccess, deterministicHarnessPolicy } from "../dist/index.js";

test("deterministic harness policy forbids privileged proof access", () => {
  assert.throws(() => assertNoPrivilegedProofAccess(["screen-observation", "dom-inspection"]), /dom-inspection/);
  assert.throws(() => assertNoPrivilegedProofAccess(["screen-observation", "computer-use-automation"]), /computer-use-automation/);
  assert.doesNotThrow(() => assertNoPrivilegedProofAccess(["screen-observation", "simulated-low-level-input"]));
  assert.equal(deterministicHarnessPolicy.forbidden.includes("api-access"), true);
  assert.equal(deterministicHarnessPolicy.forbidden.includes("playwright-selectors"), true);
  assert.equal(deterministicHarnessPolicy.forbidden.includes("computer-use-automation"), true);
});
