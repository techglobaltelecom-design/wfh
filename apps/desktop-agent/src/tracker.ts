import readline from "node:readline";
import screenshot from "screenshot-desktop";
import { AgentApiClient } from "./http";
import type { AgentConfig } from "./config";

/**
 * Node-only fallback activity tracker.
 * For production-grade keyboard/mouse hooks, replace with native OS APIs or Tauri plugins.
 */
export class DesktopTracker {
  private lastInteractionAt = Date.now();
  private activeSeconds = 0;
  private idleSeconds = 0;
  private heartbeatTimer?: NodeJS.Timeout;
  private screenshotTimer?: NodeJS.Timeout;
  private flushTimer?: NodeJS.Timeout;

  constructor(
    private readonly config: AgentConfig,
    private readonly api: AgentApiClient
  ) {}

  start() {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.on("keypress", () => {
        this.lastInteractionAt = Date.now();
      });
    }

    void this.api.verifyEmployee(this.config.employeeId);
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.config.heartbeatIntervalSeconds * 1000);
    this.screenshotTimer = setInterval(
      () => this.captureScreenshot(),
      this.config.screenshotIntervalMinutes * 60 * 1000
    );
    setTimeout(() => {
      void this.captureScreenshot();
    }, 30_000);
    this.flushTimer = setInterval(() => this.tick(), 1000);
  }

  stop() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.screenshotTimer) clearInterval(this.screenshotTimer);
    if (this.flushTimer) clearInterval(this.flushTimer);
  }

  private async tick() {
    const idleFor = Math.floor((Date.now() - this.lastInteractionAt) / 1000);
    if (idleFor >= this.config.idleThresholdSeconds) {
      this.idleSeconds += 1;
    } else {
      this.activeSeconds += 1;
    }

    if ((this.activeSeconds + this.idleSeconds) % 60 === 0) {
      await this.sendActivitySnapshot();
    }
  }

  private async sendActivitySnapshot() {
    if (this.activeSeconds === 0 && this.idleSeconds === 0) return;
    const payload = {
      employeeId: this.config.employeeId,
      activeSeconds: this.activeSeconds,
      idleSeconds: this.idleSeconds,
      capturedAt: new Date().toISOString()
    };
    this.activeSeconds = 0;
    this.idleSeconds = 0;
    await this.api.sendActivity(payload);
  }

  private async sendHeartbeat() {
    const idleFor = Math.floor((Date.now() - this.lastInteractionAt) / 1000);
    const status =
      idleFor >= this.config.idleThresholdSeconds
        ? "AWAY"
        : idleFor > Math.floor(this.config.idleThresholdSeconds / 2)
          ? "BUSY"
          : "ONLINE";

    await this.api.sendHeartbeat({
      employeeId: this.config.employeeId,
      status,
      idleSeconds: idleFor,
      sentAt: new Date().toISOString()
    });
  }

  private async captureScreenshot() {
    try {
      const onBreak = await this.api.isEmployeeOnBreak(this.config.employeeId);
      if (onBreak) {
        console.log("[desktop-agent] skipping screenshot while employee is on break");
        return;
      }

      const image = await screenshot({ format: "png" });
      await this.api.sendScreenshot({
        employeeId: this.config.employeeId,
        filename: `capture-${Date.now()}.png`,
        contentType: "image/png",
        imageBase64: image.toString("base64"),
        capturedAt: new Date().toISOString()
      });
      console.log("[desktop-agent] screenshot uploaded");
    } catch (error) {
      console.error("[desktop-agent] screenshot failed:", error);
    }
  }
}
