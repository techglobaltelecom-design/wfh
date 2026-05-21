import assert from "node:assert/strict";
import test from "node:test";
import { employeeIdCandidates } from "../src/lib/employeeId";

test("employeeIdCandidates matches numeric and EMP-prefixed IDs", () => {
  assert.deepEqual(employeeIdCandidates("1005"), ["1005", "EMP1005"]);
  assert.deepEqual(employeeIdCandidates("EMP1005"), ["EMP1005", "1005"]);
});
