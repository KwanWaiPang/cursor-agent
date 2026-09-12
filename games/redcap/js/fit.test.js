import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFitScale } from "./fit.js";

test("fit scale considers both width and height", () => {
  assert.equal(computeFitScale(1024, 960), 4);
  // 1280×800 desktop: chrome leaves ~600px height → scale 2, not width-only 4
  assert.equal(computeFitScale(1280, 600), 2);
  assert.equal(computeFitScale(256, 240), 1);
  assert.equal(computeFitScale(200, 200), 1);
  assert.ok(computeFitScale(1920, 400) <= 1);
});
