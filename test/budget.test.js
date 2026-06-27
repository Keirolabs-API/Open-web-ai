import { test } from "node:test";
import assert from "node:assert/strict";
import { remainingOf, wouldExceed } from "../src/budget.js";

test("no budget → infinite remaining, never exceeds", () => {
  assert.equal(remainingOf(99, null), Infinity);
  assert.equal(wouldExceed(99, null, 1000), false);
});

test("under budget → not exceeded", () => {
  assert.equal(wouldExceed(0.2, 1, 0.5), false);
});

test("at/over budget → exceeded", () => {
  assert.equal(wouldExceed(1, 1, 0), true);    // exactly at cap + any next call
  assert.equal(wouldExceed(0.9, 1, 0.2), true); // next call pushes over
});

test("remaining clamps to 0", () => {
  assert.equal(remainingOf(5, 1), 0);
});