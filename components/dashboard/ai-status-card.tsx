"use client";

import Link from "next/link";
import { Activity, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useAiHealth } from "@/components/ai/use-ai-health";

export function AiStatusCard() {
  const { data, loading, error, refresh } = useAiHealth();

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-semibold">AI runtime</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refresh()}
          aria-label="Re-check AI runtime"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
        </Button>
      </div>

      {error && !data ? (
        <p className="mt-3 flex items-start gap-2 text-sm text-danger">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      {data ? (
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              tone={data.status === "connected" ? "success" : data.status === "model_missing" ? "warning" : "danger"}
            >
              {data.status === "connected" ? "Connected" : data.status === "model_missing" ? "Model missing" : "Offline"}
            </Badge>
            <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">{data.model}</code>
          </div>
          <p className="text-muted-foreground">{data.message}</p>
          {data.hint ? <p className="text-xs text-muted-foreground">{data.hint}</p> : null}
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Round trip</dt>
              <dd className="font-medium">{data.latencyMs === null ? "—" : `${data.latencyMs} ms`}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Vision</dt>
              <dd className="font-medium">
                {data.vision.supported ? "Available" : data.vision.configured ? "Configured, unconfirmed" : "Not configured"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Mode</dt>
              <dd className="font-medium">{data.deploymentMode === "local" ? "Local inference" : "Remote inference host"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Hosted</dt>
              <dd className="font-medium">{data.hostedInference ? "Yes" : "No"}</dd>
            </div>
          </dl>
          <Link href="/status" className="inline-block text-xs text-primary underline-offset-2 hover:underline">
            Setup and troubleshooting
          </Link>
        </div>
      ) : loading ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Checking the inference server…
        </p>
      ) : null}
    </Card>
  );
}
