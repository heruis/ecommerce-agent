import Link from "next/link";
import { plans } from "@/lib/billing";
import { Card } from "@/components/ui";

/** Landing page. Owner: WS3. */
export default function LandingPage() {
  const p = plans();
  return (
    <div className="space-y-16">
      <section className="space-y-6 pt-6 text-center">
        <p className="text-sm font-medium text-brand">
          For Chinese cross-border sellers · Amazon US
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Turn Chinese product info into a listing you can actually publish.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted">
          ShelfPass localizes your product for US shoppers, checks every marketing claim against
          marketplace and US rules, and scores the result, so
          &ldquo;FDA认证，100%安全，美国销量第一&rdquo; doesn&apos;t become a suppressed listing.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/listings/new"
            className="rounded-lg bg-brand px-5 py-2.5 font-medium text-brand-foreground"
          >
            Try it free — {p.free.runs} runs
          </Link>
          <a href="#how" className="rounded-lg border border-border px-5 py-2.5 font-medium">
            How it works
          </a>
        </div>
      </section>

      <section id="how" className="grid gap-4 md:grid-cols-3">
        {[
          [
            "Localize, not translate",
            "Agents extract facts, suggest US keywords and write a platform-specific title, bullets, description and search terms.",
          ],
          [
            "Verify every claim",
            "Each claim is checked against your evidence and a policy knowledge base, with citations: verified, needs evidence, or restricted.",
          ],
          [
            "Score and fix",
            "A 0-100 quality score from explicit rules plus an LLM judge, with a before/after comparison and one-click export.",
          ],
        ].map(([t, d]) => (
          <Card key={t}>
            <h3 className="font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-muted">{d}</p>
          </Card>
        ))}
      </section>

      <section id="pricing" className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
        <Card>
          <h3 className="font-semibold">Free</h3>
          <p className="mt-1 text-3xl font-semibold">$0</p>
          <p className="mt-2 text-sm text-muted">
            {p.free.runs} listing runs to try the full pipeline.
          </p>
        </Card>
        <Card className="border-brand">
          <h3 className="font-semibold">Pro</h3>
          <p className="mt-1 text-3xl font-semibold">
            ${p.pro.priceUsd}
            <span className="text-base font-normal text-muted">/month</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            {p.pro.runs} listing runs per month, compliance review and exports.
          </p>
        </Card>
      </section>

      <p className="text-center text-xs text-muted">
        Risk screening only — not legal advice, and no guarantee of marketplace approval.
      </p>
    </div>
  );
}
