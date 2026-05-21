export interface AgentConfig {
  apiBaseUrl: string;
  agentToken?: string;
  employeeId: string;
  screenshotIntervalMinutes: number;
  heartbeatIntervalSeconds: number;
  idleThresholdSeconds: number;
}

export function loadConfig(): AgentConfig {
  return {
    apiBaseUrl: process.env.AGENT_API_BASE_URL ?? "http://localhost:3000",
    agentToken: process.env.AGENT_INGEST_TOKEN,
    employeeId: process.env.AGENT_EMPLOYEE_ID ?? "employee-id-required",
    screenshotIntervalMinutes: Number(process.env.AGENT_SCREENSHOT_INTERVAL_MINUTES ?? 30),
    heartbeatIntervalSeconds: Number(process.env.AGENT_HEARTBEAT_SECONDS ?? 60),
    idleThresholdSeconds: Number(process.env.AGENT_IDLE_THRESHOLD_SECONDS ?? 300)
  };
}
