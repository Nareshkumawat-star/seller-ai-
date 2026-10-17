"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleDot, Loader2, RefreshCw, ServerCrash, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, SectionHeading, Separator } from "@/components/ui/primitives";
import { useAiHealth } from "@/components/ai/use-ai-health";

const ENV_VARS = [
  ["OLLAMA_BASE_URL", "http://localhost:11434", "Inference host reachable from the app server."],
  ["OLLAMA_MODEL", "qwen3:4b", "Any installed Qwen-compatible instruction model."],
  ["OLLAMA_VISION_MODEL", "(empty)", "Optional vision model for image analysis."],
  ["OLLAMA_TIMEOUT_MS", "120000", "Per-request timeout (5s–600s)."],
  ["MAX_IMAGE_SIZE_MB", "5", "Upload limit for optional image analysis (1–20)."],
  ["OLLAMA_API_KEY", "(empty)", "Bearer token when the inference host requires auth."],
  ["RATE_LIMIT_PER_MINUTE", "12", "Per-IP generation limit on this instance."],
];

export default function StatusPage() {
  const { data, loading, error, refresh } = useAiHealth();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">AI runtime status</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Seller AI talks to Ollama from the server. A reachable URL is not enough — the configured model must also be
            installed.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
          Re-check
        </Button>
      </div>

      {error ? (
        <div role="alert" className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm">
          {error} The app itself may be unreachable.
        </div>
      ) : null}

      <Card className="p-4 sm:p-5">
        {!data ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Checking the inference server…
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {data.status === "connected" ? (
                <Badge tone="success"><CheckCircle2 className="h-3 w-3" aria-hidden /> Connected</Badge>
              ) : data.status === "model_missing" ? (
                <Badge tone="warning"><AlertTriangle className="h-3 w-3" aria-hidden /> Model missing</Badge>
              ) : (
                <Badge tone="danger"><ServerCrash className="h-3 w-3" aria-hidden /> Offline</Badge>
              )}
              <Badge tone="neutral">model · {data.model}</Badge>
              <Badge tone="neutral">{data.deploymentMode === "local" ? "local inference" : "remote inference host"}</Badge>
              {data.hostedInference ? <Badge tone="warning">hosted deployment</Badge> : null}
              <span className="text-xs text-muted-foreground">
                checked {new Date(data.checkedAt).toLocaleTimeString()}
              </span>
            </div>

            <p className="text-sm">{data.message}</p>
            {data.hint ? <p className="text-xs text-muted-foreground">{data.hint}</p> : null}

            <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Model installed" value={data.modelInstalled ? "Yes" : "No"} />
              <Stat label="Round trip" value={data.latencyMs === null ? "—" : `${data.latencyMs} ms`} />
              <Stat label="Timeout" value={`${data.limits.timeoutSeconds}s`} />
              <Stat label="Rate limit" value={`${data.limits.rateLimitPerMinute}/min`} />
              <Stat label="Max image" value={`${data.limits.maxImageSizeMb} MB`} />
              <Stat label="Vision" value={data.vision.supported ? "Available" : "Unavailable"} />
              <Stat label="Vision model" value={data.vision.model ?? "not configured"} />
              <Stat label="Vision source" value={data.vision.source} />
            </dl>

            <p className="rounded-md bg-surface-muted/60 px-3 py-2 text-xs text-muted-foreground">
              <CircleDot className="mr-1 inline h-3 w-3" aria-hidden />
              Vision: {data.vision.reason}
            </p>

            {data.availableModels.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Installed models ({data.availableModels.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.availableModels.map((name) => (
                    <code key={name} className="rounded border border-border bg-surface-muted px-2 py-1 text-[11px]">
                      {name}
                    </code>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4 p-4 sm:p-5">
          <SectionHeading title="Local setup" description="Run inference on the same machine as the app." />
          <ol className="space-y-3 text-sm">
            <li>
              <p className="font-medium">1. Install Ollama</p>
              <p className="text-xs text-muted-foreground">
                Download from ollama.com. Keep it bound to loopback (<code className="rounded bg-surface-muted px-1">127.0.0.1:11434</code>).
              </p>
            </li>
            <li>
              <p className="font-medium">2. Pull a model</p>
              <pre className="mt-1 overflow-x-auto rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs">
                <code>ollama pull qwen3:4b</code>
              </pre>
              <p className="mt-1 text-xs text-muted-foreground">
                Confirm it is there with <code className="rounded bg-surface-muted px-1">ollama list</code>.
              </p>
            </li>
            <li>
              <p className="font-medium">3. Start the app</p>
              <pre className="mt-1 overflow-x-auto rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs">
                <code>cp .env.example .env.local{"\n"}npm run dev</code>
              </pre>
            </li>
            <li>
              <p className="font-medium">4. Re-check this page</p>
              <p className="text-xs text-muted-foreground">
                It should read Connected. If not, see Troubleshooting below.
              </p>
            </li>
          </ol>
        </Card>

        <Card className="space-y-4 p-4 sm:p-5">
          <SectionHeading title="Hosted deployments (Render, Vercel, etc.)" />
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              A hosted app cannot reach <code className="rounded bg-surface-muted px-1">localhost:11434</code> on your
              laptop. On Render, either:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs">
              <li>Run the app locally for free local inference, or</li>
              <li>
                Deploy a separate, secured Ollama host (private network or authenticated endpoint) and set
                <code className="mx-1 rounded bg-surface-muted px-1">OLLAMA_BASE_URL</code> to it.
              </li>
            </ul>
            <p className="text-xs">
              Render&apos;s free web instances are CPU-only and cannot host multi-gigabyte GPU models comfortably. Do not
              expose port 11434 to the public internet without authentication, TLS, and a proxy that limits requests.
            </p>
            <p className="text-xs">
              When Ollama is offline, the UI says so instead of showing fake output. Text generation stays unavailable
              until a model is reachable.
            </p>
          </div>
        </Card>
      </div>

      <Card className="space-y-4 p-4 sm:p-5">
        <SectionHeading title="Environment variables" description="Server-side only. Never expose these to the browser." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Variable</th>
                <th className="py-2 pr-3 font-medium">Default</th>
                <th className="py-2 font-medium">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {ENV_VARS.map(([name, fallback, purpose]) => (
                <tr key={name} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 font-mono text-[11px]">{name}</td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-muted-foreground">{fallback}</td>
                  <td className="py-2 text-muted-foreground">{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Separator />
        <div className="space-y-2 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <Terminal className="h-3.5 w-3.5" aria-hidden />
            Troubleshooting
          </p>
          <p><strong className="text-foreground">Offline:</strong> Ollama is not running, or the URL is wrong for the server process. Check <code className="rounded bg-surface-muted px-1">curl http://localhost:11434/api/tags</code> on the same machine that runs Next.js.</p>
          <p><strong className="text-foreground">Model missing:</strong> pull the exact tag shown above. Tags matter — <code className="rounded bg-surface-muted px-1">qwen3:4b</code> is not the same as <code className="rounded bg-surface-muted px-1">qwen3:8b</code>.</p>
          <p><strong className="text-foreground">Timeouts:</strong> raise <code className="rounded bg-surface-muted px-1">OLLAMA_TIMEOUT_MS</code> or use a smaller quantized model. Local latency depends on hardware, context length, and model size.</p>
          <p><strong className="text-foreground">Malformed output:</strong> small models sometimes break JSON. Retry, or switch to a stronger instruction model.</p>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Text output is schema-validated before display. <Link href="/privacy" className="underline underline-offset-2">Read what leaves this machine</Link>.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted/40 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  );
}
