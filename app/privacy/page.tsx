import type { Metadata } from "next";
import Link from "next/link";
import { Card, SectionHeading } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Privacy & About" };

const FLOW = [
  ["Product details", "Sent from your browser to this app's own /api/generate route on the server."],
  ["Prompt", "Built server-side, then sent to the Ollama endpoint in OLLAMA_BASE_URL."],
  ["Model output", "Parsed and validated with Zod on the server before it reaches the browser."],
  ["Saved listings", "Stored only in your browser's localStorage. Never uploaded."],
  ["Images (optional)", "Held in memory for preview. Sent only if you press “Analyze image”, and never stored."],
];

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Privacy &amp; About</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Seller AI is an open-source product-listing generator built for the Hacktoberfest Open-Source AI Challenge.
          Its design goal is simple: useful listings from an open-weight model you control, without a paid proprietary
          AI API.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="space-y-4 p-4 sm:p-5">
          <SectionHeading title="What happens to your data" />
          <ol className="space-y-3">
            {FLOW.map(([title, body], index) => (
              <li key={title} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="rounded-lg border border-border bg-surface-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Important limits.</strong> Local inference does not make every part of
            the browser private. Hosting providers, reverse proxies, logs, browser extensions, and third-party scripts
            can still observe traffic. A remotely hosted copy of this app sends your input to its configured inference
            server — which is not your laptop unless you deploy it that way. No analytics or telemetry is built in, but
            your host may keep access logs. This deployment&apos;s server logs record request metadata and error codes, not
            full product descriptions.
          </p>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-3 p-4 text-sm sm:p-5">
            <SectionHeading title="Local-first, honestly" />
            <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>• Inference works offline once the app, Ollama, and the model are installed.</li>
              <li>• Internet access is still needed for initial installs, hosting, and dependency updates.</li>
              <li>• Hardware, electricity, and maintenance cost money. A local model is not free to run at scale.</li>
              <li>• Model licences differ. Check the licence of the model you pull — it is separate from this app&apos;s MIT licence.</li>
              <li>• Hindi and bilingual output use the same model, not a separate translation service.</li>
              <li>• Vision analysis runs only when you configure a vision-capable model and press the button.</li>
            </ul>
          </Card>

          <Card className="space-y-3 p-4 sm:p-5">
            <SectionHeading title="What this app will not do" />
            <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>• Publish directly to Etsy, eBay, or Shopify.</li>
              <li>• Invent certifications, reviews, or sales figures (prompted not to, and you should still verify).</li>
              <li>• Pretend an image was analyzed when no vision model is available.</li>
              <li>• Add a silent cloud AI fallback. If inference is unavailable, generation fails visibly.</li>
            </ul>
          </Card>
        </div>
      </div>

      <Card className="space-y-3 p-4 sm:p-5">
        <SectionHeading title="About the project" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Built with Next.js (App Router), TypeScript, Tailwind CSS, Zod, and Ollama. The default model tag is
          <code className="mx-1 rounded bg-surface-muted px-1.5 py-0.5 text-xs">qwen3:4b</code>, configurable through
          environment variables. Tests mock Ollama so the suite never downloads a model. See the repository README for
          setup, deployment modes, and known limitations.
        </p>
        <div className="flex flex-wrap gap-4 text-xs">
          <Link href="/status" className="text-primary underline-offset-2 hover:underline">Runtime status</Link>
          <Link href="/templates" className="text-primary underline-offset-2 hover:underline">Marketplace templates</Link>
          <Link href="/create" className="text-primary underline-offset-2 hover:underline">Create a listing</Link>
        </div>
      </Card>
    </div>
  );
}
