import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { HTML_LANG } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ShelfPass — publish-ready listings for Amazon, TikTok Shop and Shopify",
    template: "%s · ShelfPass",
  },
  description:
    "Paste Chinese product notes, get one compliance-checked report with every field each marketplace's add-product form asks for — plus listing audits, takedown help and an evidence library.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2563eb" };

/** Root shell: header, page, footer. Pages own their own width (see Container). */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={HTML_LANG[locale]} className={jakarta.variable}>
      <body className="flex min-h-screen flex-col antialiased">
        <LocaleProvider locale={locale}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </LocaleProvider>
      </body>
    </html>
  );
}
