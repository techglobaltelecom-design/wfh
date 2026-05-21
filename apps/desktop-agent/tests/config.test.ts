import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config";

test("loadConfig reads defaults", () => {
  const config = loadConfig();
  assert.ok(config.apiBaseUrl.length > 0);
  assert.ok(config.screenshotIntervalMinutes >= 1);
});
