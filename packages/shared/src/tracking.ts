export interface ActivityPayload {
  employeeId: string;
  activeSeconds: number;
  idleSeconds: number;
  capturedAt: string;
}

export interface ScreenshotPayload {
  employeeId: string;
  capturedAt: string;
  filename: string;
  contentType: string;
  imageBase64: string;
}

export interface AgentHeartbeatPayload {
  employeeId: string;
  status: "ONLINE" | "BUSY" | "AWAY";
  idleSeconds: number;
  sentAt: string;
}
