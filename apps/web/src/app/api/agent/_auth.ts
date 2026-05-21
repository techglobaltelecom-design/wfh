import { fail } from "@/server/http";

export function validateAgentToken(request: Request) {
  const expected = process.env.AGENT_INGEST_TOKEN?.trim();
  if (!expected || expected === "optional-shared-agent-token") return null;
  const token = request.headers.get("x-agent-token");
  if (token !== expected) {
    return fail("Unauthorized agent", 401);
  }
  return null;
}
