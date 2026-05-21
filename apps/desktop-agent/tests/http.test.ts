import assert from "node:assert/strict";
import test from "node:test";
import { AgentApiClient } from "../src/http";

test("isEmployeeOnBreak returns true when API reports active break", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ ok: true, data: { onBreak: true } }), { status: 200 })) as typeof fetch;

  try {
    const client = new AgentApiClient({
      apiBaseUrl: "http://example.com",
      agentToken: "token"
    });
    assert.equal(await client.isEmployeeOnBreak("EMP001"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("isEmployeeOnBreak returns false when API is unavailable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("error", { status: 500 })) as typeof fetch;

  try {
    const client = new AgentApiClient({ apiBaseUrl: "http://example.com" });
    assert.equal(await client.isEmployeeOnBreak("EMP001"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
