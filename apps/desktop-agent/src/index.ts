import { loadConfig } from "./config";
import { AgentApiClient } from "./http";
import { DesktopTracker } from "./tracker";

async function main() {
  const config = loadConfig();
  const api = new AgentApiClient({
    apiBaseUrl: config.apiBaseUrl,
    agentToken: config.agentToken
  });
  const tracker = new DesktopTracker(config, api);

  tracker.start();
  console.log("[desktop-agent] tracking started");

  process.on("SIGINT", () => {
    tracker.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("[desktop-agent] fatal:", error);
  process.exit(1);
});
