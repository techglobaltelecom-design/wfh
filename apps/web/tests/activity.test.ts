import assert from "node:assert/strict";
import test from "node:test";
import { calculateActiveWorkPercentage } from "../src/server/services/activity";

test("calculateActiveWorkPercentage computes ratio", () => {
  assert.equal(calculateActiveWorkPercentage(90, 10), 90);
  assert.equal(calculateActiveWorkPercentage(0, 0), 0);
});
