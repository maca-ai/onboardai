import { test } from "node:test";
import assert from "node:assert/strict";
import { deterministicFixtures, notionLikeFixture, odooLikeFixture } from "../dist/index.js";

test("clean odoo-like and notion-like fixture contracts exist", () => {
  assert.equal(odooLikeFixture.tool, "odoo");
  assert.equal(odooLikeFixture.terminalBusinessState, "demo opportunity visible with stage qualified");
  assert.equal(notionLikeFixture.tool, "notion");
  assert.equal(notionLikeFixture.terminalBusinessState, "demo task visible with status ready for review");
});

test("deterministic fixtures provide three manual screen-observation transitions per tool", () => {
  assert.equal(deterministicFixtures.odoo.observations.length, 4);
  assert.equal(deterministicFixtures.odoo.transitions.length, 3);
  assert.equal(deterministicFixtures.notion.observations.length, 4);
  assert.equal(deterministicFixtures.notion.transitions.length, 3);
  assert.equal(deterministicFixtures.odoo.transitions.every((transition) => transition.action.kind === "click"), true);
  assert.equal(deterministicFixtures.notion.transitions.every((transition) => transition.action.kind === "click"), true);
});
