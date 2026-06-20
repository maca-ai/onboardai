import { test } from "node:test";
import assert from "node:assert/strict";
import { notionLikeFixture, odooLikeFixture } from "../dist/index.js";

test("clean odoo-like and notion-like fixture contracts exist", () => {
  assert.equal(odooLikeFixture.tool, "odoo");
  assert.equal(odooLikeFixture.terminalBusinessState, "demo opportunity visible with stage qualified");
  assert.equal(notionLikeFixture.tool, "notion");
  assert.equal(notionLikeFixture.terminalBusinessState, "demo task visible with status ready for review");
});
