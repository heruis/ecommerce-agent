import { fmt, type Dictionary } from "@/lib/i18n";
import { Container } from "@/components/ui";

/** Date shown on every legal page; bump it when the text changes. */
export const LEGAL_UPDATED = "2026-10-20";

/** Shared layout for Terms, Privacy and Refunds. Owner: WS3. */
export function LegalDoc({
  title,
  doc,
  t,
}: {
  title: string;
  doc: { intro: string; sections: { h: string; p: string[] }[] };
  t: Dictionary["marketing"]["legal"];
}) {
  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <article className="space-y-8">
        <header className="space-y-3 border-b border-border pb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="text-sm text-muted">{fmt(t.updated, { date: LEGAL_UPDATED })}</p>
          <p className="text-lg text-muted">{doc.intro}</p>
        </header>
        {doc.sections.map((s) => (
          <section key={s.h} className="space-y-3">
            <h2 className="text-xl font-semibold">{s.h}</h2>
            {s.p.map((para) => (
              <p key={para} className="leading-relaxed text-foreground/90">
                {para}
              </p>
            ))}
          </section>
        ))}
        <footer className="space-y-2 rounded-xl bg-subtle p-5 text-sm text-muted">
          <p>{t.contact}</p>
          <p>{t.note}</p>
        </footer>
      </article>
    </Container>
  );
}
