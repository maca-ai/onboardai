import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNativeCaptureReady, fixtureCaptureReadiness, validateNativeCaptureReadiness } from "../dist/index.js";

test("fixture capture readiness is explicit and not native", () => {
  const readiness = fixtureCaptureReadiness();

  assert.equal(readiness.adapterKind, "fixture");
  assert.equal(readiness.adapterName, "onboardai-fixture-capture");
  assert.equal(readiness.adapterVersion, "0.0.0-local");
  assert.equal(readiness.platform, "fixture");
  assert.equal(readiness.verifiedDocReferences.length, 0);
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
        adapterName: "",
        adapterVersion: "",
        platform: "macos",
        docsVerified: false,
        verifiedDocReferences: [],
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

test("native capture readiness rejects docs without exact behavior and version coverage", () => {
  const validation = validateNativeCaptureReadiness({
    adapterKind: "native",
    adapterName: "candidate-native-capture",
    adapterVersion: "1.2.3",
    platform: "macos",
    docsVerified: true,
    verifiedDocReferences: [
      {
        sourceType: "blog-post",
        reference: "https://example.invalid/native-capture",
        appliesToAdapterVersion: "1.2.3",
        behaviors: ["raw-artifacts-ignored"]
      },
      {
        sourceType: "official-docs",
        reference: "not-a-url",
        appliesToAdapterVersion: "1.2.2",
        behaviors: ["screen-recording"]
      },
      {
        sourceType: "context7",
        reference: "websites/native-capture",
        appliesToAdapterVersion: "1.2.3",
        behaviors: ["keyboard-event-log", "dom-selector"]
      }
    ],
    screenRecording: true,
    keyboardEventLog: true,
    mouseEventLog: true,
    redactedFrameOutput: true,
    rawArtifactsIgnored: true,
    blockers: []
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.errors.includes("verifiedDocReferences[0] source type"), true);
  assert.equal(validation.errors.includes("verifiedDocReferences[1] official docs URL"), true);
  assert.equal(validation.errors.includes("verifiedDocReferences[1] adapter version attribution"), true);
  assert.equal(validation.errors.includes("verifiedDocReferences[2] context7 library id"), true);
  assert.equal(validation.errors.includes("verified documentation for mouse-event-log"), true);

  assert.throws(
    () =>
      assertNativeCaptureReady({
        adapterKind: "native",
        adapterName: "candidate-native-capture",
        adapterVersion: "1.2.3",
        platform: "macos",
        docsVerified: true,
        verifiedDocReferences: [
          {
            sourceType: "blog-post",
            reference: "https://example.invalid/native-capture",
            appliesToAdapterVersion: "1.2.3",
            behaviors: ["raw-artifacts-ignored"]
          },
          {
            sourceType: "official-docs",
            reference: "not-a-url",
            appliesToAdapterVersion: "1.2.2",
            behaviors: ["screen-recording"]
          },
          {
            sourceType: "context7",
            reference: "websites/native-capture",
            appliesToAdapterVersion: "1.2.3",
            behaviors: ["keyboard-event-log", "dom-selector"]
          }
        ],
        screenRecording: true,
        keyboardEventLog: true,
        mouseEventLog: true,
        redactedFrameOutput: true,
        rawArtifactsIgnored: true,
        blockers: []
      }),
    /verifiedDocReferences\[0\] source type/
  );
});

test("native capture readiness accepts a fully verified adapter contract", () => {
  const readiness = {
    adapterKind: "native",
    adapterName: "candidate-native-capture",
    adapterVersion: "1.2.3",
    platform: "windows",
    docsVerified: true,
    verifiedDocReferences: [
      {
        sourceType: "official-docs",
        reference: "https://vendor.example/native-capture/windows",
        appliesToAdapterVersion: "1.2.3",
        behaviors: ["screen-recording", "keyboard-event-log", "mouse-event-log"]
      },
      {
        sourceType: "context7",
        reference: "/vendor/native-capture",
        appliesToAdapterVersion: "1.2.3",
        behaviors: ["redacted-frame-output", "raw-artifacts-ignored"]
      }
    ],
    screenRecording: true,
    keyboardEventLog: true,
    mouseEventLog: true,
    redactedFrameOutput: true,
    rawArtifactsIgnored: true,
    blockers: []
  };

  assert.deepEqual(validateNativeCaptureReadiness(readiness), { valid: true, errors: [] });
  assert.doesNotThrow(() =>
    assertNativeCaptureReady(readiness)
  );
});
