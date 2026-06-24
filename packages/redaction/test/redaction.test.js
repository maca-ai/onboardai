import { test } from "node:test";
import assert from "node:assert/strict";
import { containsForbiddenPersistedSecret, redactShareableText } from "../dist/index.js";

test("forbidden secret strings and email addresses are redacted from shareable artifacts", () => {
  const artifact = [
    "email: senior@example.com",
    "password=hunter2",
    "token sk-live-1234567890abcdef",
    "authorization: Bearer sk-live-abcdefghijkl",
    "api_key=abcdef1234567890",
    "secret_key=secret1234567890",
    "session_secret=local-session-secret",
    "sessionid=session1234567890",
    "url: https://example.test/customer/opp-123",
    "customer name: demo account",
    "internal object name: approval queue"
  ].join("\n");

  const result = redactShareableText(artifact);

  assert.equal(result.text.includes("senior@example.com"), false);
  assert.equal(result.text.includes("hunter2"), false);
  assert.equal(result.text.includes("sk-live-1234567890abcdef"), false);
  assert.equal(result.text.includes("sk-live-abcdefghijkl"), false);
  assert.equal(result.text.includes("abcdef1234567890"), false);
  assert.equal(result.text.includes("secret1234567890"), false);
  assert.equal(result.text.includes("local-session-secret"), false);
  assert.equal(result.text.includes("session1234567890"), false);
  assert.equal(containsForbiddenPersistedSecret(result.text), false);
  assert.equal(result.businessSensitiveTags.some((tag) => tag.kind === "browser-url"), true);
  assert.equal(result.businessSensitiveTags.some((tag) => tag.kind === "business-record-id"), true);
  assert.equal(result.businessSensitiveTags.some((tag) => tag.kind === "customer-name"), true);
  assert.equal(result.businessSensitiveTags.some((tag) => tag.kind === "internal-object-name"), true);
});
