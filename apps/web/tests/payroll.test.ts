import assert from "node:assert/strict";
import test from "node:test";
import { computePayroll } from "../src/server/payroll/math";

test("computePayroll calculates overtime and deductions", () => {
  const result = computePayroll({
    totalMinutes: 600,
    activeSeconds: 28800,
    idleSeconds: 7200
  });

  assert.equal(result.totalHours, 10);
  assert.equal(result.overtimeHours, 2);
  assert.equal(result.activeWorkPct, 80);
  assert.ok(result.estimatedSalary > 0);
});
