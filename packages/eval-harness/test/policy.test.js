import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoPrivilegedProofAccess, deterministicHarnessPolicy } from "../dist/index.js";

test("deterministic harness policy forbids privileged proof access", () => {
  assert.throws(() => assertNoPrivilegedProofAccess(["screen-observation", "dom-inspection"]), /dom-inspection/);
  assert.doesNotThrow(() => assertNoPrivilegedProofAccess(["screen-observation", "simulated-low-level-input"]));
  assert.equal(deterministicHarnessPolicy.forbidden.includes("api-access"), true);
});
