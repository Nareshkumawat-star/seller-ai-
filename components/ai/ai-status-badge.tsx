"use client";

import { CircleDot, Loader2, ServerCrash, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import type { AiHealth } from "@/components/ai/use-ai-health";

export function AiStatusBadge({
  health,
  loading,
  error,
}: {
  health: AiHealth | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading && !health) {
    return (
      <Badge tone="neutral" aria-live="polite">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Checking AI
      </Badge>
    );
  }

  if (error && !health) {
    return (
      <Badge tone="warning" title={error}>
        <TriangleAlert className="h-3 w-3" aria-hidden />
        Status unknown
      </Badge>
    );
  }

  if (!health) return null;

  if (health.status === "connected") {
    return (
      <Badge tone="success" title={`Model ${health.model} is installed`}>
        <CircleDot className="h-3 w-3" aria-hidden />
        AI connected
      </Badge>
    );
  }

  if (health.status === "model_missing") {
    return (
      <Badge tone="warning" title={health.hint ?? "Model not installed"}>
        <TriangleAlert className="h-3 w-3" aria-hidden />
        Model missing
      </Badge>
    );
  }

  return (
    <Badge tone="danger" title={health.hint ?? "Inference host unreachable"}>
      <ServerCrash className="h-3 w-3" aria-hidden />
      AI offline
    </Badge>
  );
}
