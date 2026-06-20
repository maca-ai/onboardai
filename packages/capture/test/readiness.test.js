import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNativeCaptureReady, fixtureCaptureReadiness } from "../dist/index.js";

test("fixture capture readiness is explicit and not native", () => {
  const readiness = fixtureCaptureReadiness();

  assert.equal(readiness.adapterKind, "fixture");
  assert.equal(readiness.platform, "fixture");
  assert.equal(readiness.screenRecording, true);
  assert.equal(readiness.keyboardEventLog, true);
  assert.equal(readiness.mouseEventLog, true);
  assert.throws(() => assertNativeCaptureReady(readiness), /native adapter/);
});

test("native capture readiness fails closed until docs and all capture inputs are verified", () => {
  assert.throws(
    () =>
      assertNativeCaptureReady({
        adapterKind: "native",
        platform: "macos",
        docsVerified: false,
        screenRecording: false,
        keyboardEventLog: false,
        mouseEventLog: false,
        redactedFrameOutput: false,
        rawArtifactsIgnored: true,
        blockers: ["macos screen recording permission flow unverified"]
      }),
    /screen recording/
  );
});

test("native capture readiness accepts a fully verified adapter contract", () => {
  assert.doesNotThrow(() =>
    assertNativeCaptureReady({
      adapterKind: "native",
      platform: "windows",
      docsVerified: true,
      screenRecording: true,
      keyboardEventLog: true,
      mouseEventLog: true,
      redactedFrameOutput: true,
      rawArtifactsIgnored: true,
      blockers: []
    })
  );
});
