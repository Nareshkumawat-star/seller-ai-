import { checkHealth } from "@/lib/ai/ollama-client";
import { getServerConfig, publicConfigSummary } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await checkHealth();
  const config = publicConfigSummary();

  return Response.json(
    {
      runtime: "ollama",
      status: report.status,
      connected: report.status === "connected",
      model: report.model,
      modelInstalled: report.modelInstalled,
      latencyMs: report.latencyMs,
      availableModels: report.availableModels,
      vision: {
        configured: report.vision.configured,
        supported: report.vision.supported,
        model: report.vision.model,
        reason: report.vision.reason,
        source: report.vision.source,
      },
      limits: {
        maxImageSizeMb: config.maxImageSizeMb,
        timeoutSeconds: config.timeoutSeconds,
        rateLimitPerMinute: config.rateLimitPerMinute,
      },
      deploymentMode: config.deploymentMode,
      hostedInference: getServerConfig().deploymentMode === "remote",
      message: report.message,
      hint: report.hint,
      checkedAt: report.checkedAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
