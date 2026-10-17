"use client";

import * as React from "react";
import Link from "next/link";
import { Database, Moon, Palette, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, SectionHeading, Separator } from "@/components/ui/primitives";
import { useAiHealth } from "@/components/ai/use-ai-health";
import { clearHistory } from "@/lib/storage/history";

export default function SettingsPage() {
  const { data, loading } = useAiHealth();
  const [message, setMessage] = React.useState<string | null>(null);

  const clearLocal = () => {
    if (!window.confirm("Delete all listings saved in this browser? Exports are not affected.")) return;
    clearHistory();
    setMessage("Local listings cleared.");
    setTimeout(() => setMessage(null), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Seller AI has no accounts and no server-side preferences. Everything here is local or deployment configuration.
        </p>
      </div>

      <Card className="space-y-4 p-4 sm:p-5">
        <SectionHeading
          title="Appearance"
          description="Use the theme button in the top bar. The choice is stored in this browser and respects your OS preference on first visit."
        />
        <div className="flex flex-wrap gaps-2 gap-2 text-xs text-muted-foreground">
          <Badge tone="neutral"><Palette className="h-3 w-3" aria-hidden /> Light and dark</Badge>
          <Badge tone="neutral"><Moon className="h-3 w-3" aria-hidden /> Respects reduced motion</Badge>
        </div>
      </Card>

      <Card className="space-y-4 p-4 sm:p-5">
        <SectionHeading
          title="Local data"
          description="Saved listings live in localStorage under a versioned key. They are never uploaded."
        />
        <div className="rounded-lg border border-border bg-surface-muted/40 p-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <Database className="h-3.5 w-3.5" aria-hidden />
            seller-ai:listings:v1
          </p>
          <p className="mt-1">
            Anyone with access to this browser profile can read saved drafts. Export anything important; clearing
            browser data deletes it permanently.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearLocal}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Clear local listings
          </Button>
          <Link href="/listings" className="text-xs text-primary underline-offset-2 hover:underline">
            Manage saved listings
          </Link>
          <span aria-live="polite" className="text-xs text-muted-foreground">{message ?? ""}</span>
        </div>
      </Card>

      <Card className="space-y-4 p-4 sm:p-5">
        <SectionHeading
          title="AI configuration"
          description="Read-only summary. Change these environment variables on the server, then restart the app."
          action={
            <Link href="/status" className="text-xs text-primary underline-offset-2 hover:underline">
              Full status
            </Link>
          }
        />
        {loading && !data ? (
          <div className="skeleton h-24 rounded-lg" />
        ) : data ? (
          <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <Item label="Runtime" value="Ollama (server-side)" />
            <Item label="Text model" value={data.model} />
            <Item label="Vision model" value={data.vision.model ?? "not configured"} />
            <Item label="Inference mode" value={data.deploymentMode === "local" ? "Local" : "Remote host"} />
            <Item label="Request timeout" value={`${data.limits.timeoutSeconds}s`} />
            <Item label="Max image size" value={`${data.limits.maxImageSizeMb} MB`} />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Runtime status is unavailable right now.</p>
        )}
        <Separator />
        <p className="text-xs text-muted-foreground">
          Configuration lives in the server environment (<code className="rounded bg-surface-muted px-1">.env.local</code>{" "}
          locally, environment variables on your host). The browser never receives the inference URL or API key.
        </p>
      </Card>

      <Card className="space-y-3 p-4 sm:p-5">
        <SectionHeading title="Policy" />
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          <li>No analytics, telemetry, or third-party AI calls are built into the MVP.</li>
          <li>Generated copy is untrusted text: it is rendered as plain text, never HTML.</li>
          <li>Seller AI does not publish to any marketplace.</li>
          <li>Uploaded images are not persisted; optional analysis sends them to your configured inference host.</li>
        </ul>
        <Link href="/privacy" className="text-xs text-primary underline-offset-2 hover:underline">
          Read the full privacy notes
        </Link>
      </Card>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted/40 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  );
}
