import type {
  ActivityPayload,
  AgentHeartbeatPayload,
  ScreenshotPayload
} from "@wfh/shared";

interface SenderConfig {
  apiBaseUrl: string;
  agentToken?: string;
}

interface QueueItem {
  path: string;
  body: unknown;
}

export class AgentApiClient {
  private readonly queue: QueueItem[] = [];
  private flushing = false;

  constructor(private readonly config: SenderConfig) {}

  private async post(path: string, body: unknown) {
    const response = await fetch(`${this.config.apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.agentToken ? { "x-agent-token": this.config.agentToken } : {})
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`Agent API ${path} failed: ${response.status} ${payload}`);
    }
  }

  private enqueue(path: string, body: unknown) {
    this.queue.push({ path, body });
  }

  private async flushQueue() {
    if (this.flushing || this.queue.length === 0) return;
    this.flushing = true;
    try {
      const pending = [...this.queue];
      this.queue.length = 0;
      for (const item of pending) {
        try {
          await this.post(item.path, item.body);
        } catch {
          this.queue.push(item);
        }
      }
    } finally {
      this.flushing = false;
    }
  }

  private async sendOrQueue(path: string, body: unknown) {
    try {
      await this.post(path, body);
      await this.flushQueue();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[desktop-agent] upload failed ${path}: ${message}`);
      this.enqueue(path, body);
    }
  }

  sendActivity(payload: ActivityPayload) {
    return this.sendOrQueue("/api/agent/activity", payload);
  }

  sendHeartbeat(payload: AgentHeartbeatPayload) {
    return this.sendOrQueue("/api/agent/heartbeat", payload);
  }

  sendScreenshot(payload: ScreenshotPayload) {
    return this.sendOrQueue("/api/agent/screenshot", payload);
  }

  async verifyEmployee(employeeId: string) {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/api/agent/break-status?employeeId=${encodeURIComponent(employeeId)}`,
        {
          headers: {
            ...(this.config.agentToken ? { "x-agent-token": this.config.agentToken } : {})
          }
        }
      );
      if (response.status === 404) {
        console.error(
          `[desktop-agent] employee ID "${employeeId}" not found on server. Check AGENT_EMPLOYEE_ID in .env matches admin Employee ID.`
        );
        return false;
      }
      if (!response.ok) {
        console.error(`[desktop-agent] server check failed (${response.status}). Check AGENT_INGEST_TOKEN.`);
        return false;
      }
      console.log(`[desktop-agent] employee ID "${employeeId}" verified on server`);
      return true;
    } catch (error) {
      console.error("[desktop-agent] cannot reach server:", error);
      return false;
    }
  }

  async isEmployeeOnBreak(employeeId: string) {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/api/agent/break-status?employeeId=${encodeURIComponent(employeeId)}`,
        {
          headers: {
            ...(this.config.agentToken ? { "x-agent-token": this.config.agentToken } : {})
          }
        }
      );
      if (!response.ok) return false;

      const payload = (await response.json()) as { ok?: boolean; data?: { onBreak?: boolean } };
      return Boolean(payload.ok && payload.data?.onBreak);
    } catch {
      return false;
    }
  }
}
