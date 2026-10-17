import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info, Store } from "lucide-react";
import { Badge, Card, SectionHeading } from "@/components/ui/primitives";
import { MARKETPLACE_OPTIONS } from "@/lib/config/marketplaces";
import { STARTER_TEMPLATES } from "@/lib/config/templates";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Templates &amp; marketplace formats</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Templates shape the prompt — title length, description structure, and tag conventions. They are guidance, not
          live marketplace policy. Check current requirements in your seller dashboard before publishing.
        </p>
      </div>

      <Card className="flex gap-3 p-4 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          Platform limits change without notice, and categories on eBay or Etsy can impose extra rules. Override the
          defaults in <code className="rounded bg-surface-muted px-1 py-0.5">lib/config/marketplaces.ts</code> if your
          category needs different guidance.
        </p>
      </Card>

      <section className="space-y-3">
        <SectionHeading title="Marketplace formats" description="Choose one in the create form to change the generated structure." />
        <div className="grid gap-4 md:grid-cols-2">
          {MARKETPLACE_OPTIONS.map((market) => (
            <Card key={market.id} className="space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Store className="h-4 w-4 text-primary" aria-hidden />
                <h3 className="text-sm font-semibold">{market.label}</h3>
                <Badge tone="neutral">≤ {market.titleMaxChars} chars title</Badge>
                <Badge tone="neutral">{market.maxTags} tags</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{market.tagline}</p>
              <dl className="space-y-2 text-xs">
                <div>
                  <dt className="font-medium">Title</dt>
                  <dd className="text-muted-foreground">{market.titleGuidance}</dd>
                </div>
                <div>
                  <dt className="font-medium">Description structure</dt>
                  <dd className="text-muted-foreground">{market.descriptionStructure}</dd>
                </div>
                <div>
                  <dt className="font-medium">Keywords</dt>
                  <dd className="text-muted-foreground">{market.keywordGuidance}</dd>
                </div>
              </dl>
              <p className="rounded-md bg-surface-muted/60 px-2.5 py-2 text-[11px] text-muted-foreground">{market.notes}</p>
              <Link
                href={`/create?platform=${market.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Start with this format <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading title="Starter content templates" description="Fill in realistic example details so you can see the shape of a complete listing." />
        <div className="grid gap-4 md:grid-cols-3">
          {STARTER_TEMPLATES.map((template) => (
            <Card key={template.id} className="flex flex-col gap-2 p-4 sm:p-5">
              <h3 className="text-sm font-semibold">{template.title}</h3>
              <p className="flex-1 text-xs leading-relaxed text-muted-foreground">{template.description}</p>
              <Link
                href={`/create?template=${template.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Load template <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Seller AI never publishes to a marketplace. You copy or export the copy and paste it into your own listing
        workflow.
      </p>
    </div>
  );
}
