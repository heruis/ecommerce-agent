/**
 * Strings for the "marketing" area: landing page, pricing page, legal pages and
 * the marketplace-style previews. Owner: WS3 (marketing site).
 * zh/marketing.ts must have the same shape (TypeScript and the i18n test check it).
 * Comparison values "yes" / "no" / "partial" are keywords, not shown as text.
 */
export const marketing = {
  meta: {
    title: "Publish-ready listings for Amazon, TikTok Shop and Shopify",
    description:
      "Paste Chinese supplier notes and get one compliance-checked report with every field each marketplace's add-product form asks for.",
    pricingTitle: "Pricing",
    pricingDescription:
      "Start free, buy a one-time credit pack, or go Pro. One credit covers a multi-channel report, a listing audit or a takedown analysis.",
    termsTitle: "Terms of service",
    privacyTitle: "Privacy policy",
    refundsTitle: "Refund policy",
    legalDescription: "The plain-language rules for using ShelfPass.",
  },
  hero: {
    eyebrow: "For Chinese cross-border sellers",
    title: "From supplier notes to listings you can publish",
    titleAccent: "on Amazon, TikTok Shop and Shopify",
    subtitle:
      "Paste product info in Chinese. ShelfPass writes each channel's listing, checks every claim against marketplace and US rules, and hands you every field of each site's add-product form — ready to copy.",
    ctaStart: "Start free — {n} credits",
    ctaSignedIn: "Create a report",
    ctaHow: "See how it works",
    note: "No credit card needed.",
    chips: ["Chinese in, US-ready out", "Every claim checked", "3 storefronts, 1 run"],
  },
  beforeAfter: {
    label: "Example: the same product, before and after",
    before: "Supplier copy",
    after: "Amazon-ready listing",
    rewritten: "rewritten",
    removed: "removed",
    gate: "Policy gate: PASS",
    fixes: "{n} risky claims caught",
  },
  channels: {
    label: "One report for",
  },
  problem: {
    eyebrow: "The problem",
    title: "Good products get stuck before they reach the shelf",
    items: [
      {
        title: "Supplier copy breaks marketplace rules",
        body: "Literal translations turn 「FDA认证」「100%安全」「销量第一」 into “FDA Approved”, “100% Safe” and “#1 Best Seller” — claims marketplaces restrict and can suppress a listing for.",
      },
      {
        title: "Every storefront wants a different form",
        body: "Amazon wants five bullets and backend search terms, TikTok Shop wants short selling points and hashtags, Shopify wants an SEO title and meta description. Rewriting by hand takes hours per product.",
      },
      {
        title: "The rules are scattered and in English",
        body: "Seller help pages, FTC, FDA and EPA guidance all apply. Reading them in a second language to decide whether one word is allowed is slow and risky.",
      },
    ],
  },
  how: {
    eyebrow: "How it works",
    title: "One run, three storefronts, every field filled",
    subtitle:
      "A team of AI agents does the writing and the checking. You review, copy, and publish.",
    steps: [
      {
        title: "Paste your product info",
        body: "Supplier notes in Chinese, specs, any certificates you hold, and up to 4 photos. Pick Amazon US, TikTok Shop US, Shopify — or all three.",
      },
      {
        title: "Agents write each channel",
        body: "One agent per storefront writes in that site's style and fixes its own rule errors: title length, banned words, bullet count, search-term bytes.",
      },
      {
        title: "Every claim is checked",
        body: "A compliance agent looks up the policy behind each claim and your evidence. Restricted claims are rewritten or removed — with the source cited.",
      },
      {
        title: "Copy it into the form",
        body: "Each tab lists the site's add-product fields in order, with copy buttons, photo rules and a shot list. Download CSV, print the report, or preview the page.",
      },
    ],
    demoLabel: "What your listing looks like",
    demoDescription:
      "Demo picture: the Chinese supplier note on the left, ShelfPass in the middle, and the finished listing shown as an Amazon-style product page, a TikTok Shop-style phone page and a Google search result for a Shopify store.",
    supplier: "Supplier note",
    photos: "Photos",
    pipeline: ["Extract facts", "Write 3 listings", "Check every claim", "Policy gate"],
    closer: "Look closer",
    tabs: {
      amazon: "Amazon US",
      tiktok: "TikTok Shop US",
      shopify: "Shopify + Google",
    },
  },
  previews: {
    disclaimer:
      "Illustrative marketplace-style preview — not affiliated with Amazon, TikTok or Shopify.",
  },
  features: {
    eyebrow: "What you get",
    title: "Everything between “I have a product” and “it's live”",
    items: [
      {
        title: "A report per storefront",
        body: "Every field of each site's add-product form in order — generated, taken from your input, or marked “you fill in” — with copy buttons and CSV/TXT export.",
      },
      {
        title: "Claim review with citations",
        body: "FDA, FTC, EPA and marketplace rules, retrieved and cited for each claim. Restricted phrases can't reach the final listing.",
      },
      {
        title: "Photo check",
        body: "We check your photos against each site's main-image rules and give you a shot list for the rest of the gallery.",
      },
      {
        title: "Audit a live listing",
        body: "Paste a listing that's already up. See what's risky, the smallest fix, and the risk before and after.",
      },
      {
        title: "Takedown and appeal help",
        body: "Paste the notice you received. Get the likely cause, the fix, the documents to gather and a draft appeal in English.",
      },
      {
        title: "Evidence library",
        body: "Store your test reports and certificates once. A claim stays in your listing only when a document backs it.",
      },
      {
        title: "Works in 中文",
        body: "Use the whole product in Simplified Chinese, and get risks explained in Chinese while the listing stays in natural US English.",
      },
    ],
  },
  compare: {
    eyebrow: "Why ShelfPass",
    title: "Built for the part that gets listings removed",
    columns: {
      shelfpass: "ShelfPass",
      chat: "General AI chat",
      builtIn: "A marketplace's built-in AI listing tool",
      keywords: "Keyword research tools",
    },
    rows: [
      { label: "Writes from Chinese supplier notes", values: ["yes", "yes", "partial", "no"] },
      {
        label: "Fills every field of each site's add-product form",
        values: ["yes", "no", "partial", "no"],
      },
      { label: "Amazon, TikTok Shop and Shopify in one run", values: ["yes", "no", "no", "no"] },
      {
        label: "Checks each claim and cites the policy behind it",
        values: ["yes", "no", "no", "no"],
      },
      {
        label: "Keeps a claim only when your documents back it",
        values: ["yes", "no", "no", "no"],
      },
      { label: "Audits live listings and drafts appeals", values: ["yes", "partial", "no", "no"] },
      { label: "Search-volume data", values: ["no", "no", "no", "yes"] },
    ],
    legend: { yes: "Core feature", partial: "Partly, with manual work", no: "Not its focus" },
    footnote:
      "Based on what each type of tool is generally built for; individual products differ and change often. ShelfPass does not provide search-volume data — pair it with a keyword tool if you need it.",
  },
  pricingTeaser: {
    title: "Simple credits, no surprises",
    body: "Start with {free} free credits. Then buy a one-time pack of {pack} credits for ${packPrice}, or go Pro for ${proPrice}/month.",
    cta: "See pricing",
  },
  faq: {
    eyebrow: "FAQ",
    title: "Questions sellers ask",
    items: [
      {
        q: "Does ShelfPass publish the listing for me?",
        a: "Not yet. You get a report with every field ready to copy into Seller Central, TikTok Shop Seller Center or your Shopify admin, plus CSV/TXT downloads. Direct publishing is on our roadmap.",
      },
      {
        q: "Is this legal advice? Will my listing be approved?",
        a: "No and we can't promise that. ShelfPass screens for risk using summarized marketplace and US rules and shows the source for each decision. Marketplaces make the final call.",
      },
      {
        q: "What languages can I write in?",
        a: "Chinese or English product notes work best. The interface is available in English and 简体中文, and risks can be explained in Chinese.",
      },
      {
        q: "Where do the keywords come from?",
        a: "They're suggested from your product facts and how shoppers describe similar products. We don't show search volume.",
      },
      {
        q: "What happens to my data and photos?",
        a: "They're stored in your account so you can come back to your reports. You can download everything or delete your account from the Account page.",
      },
      {
        q: "What does one credit get me?",
        a: "One multi-channel report (up to three storefronts), one listing audit, or one takedown analysis. Explanations in Chinese and edits are free.",
      },
    ],
  },
  finalCta: {
    title: "Get your next product shelf-ready today",
    body: "Your first {n} credits are free. No credit card needed.",
    cta: "Start free",
    secondary: "See pricing",
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Pay for what you list",
    subtitle:
      "Every plan includes every feature. Credits are the only difference: one credit = one report, one audit, or one takedown analysis.",
    testMode: {
      title: "Payments run in Stripe test mode",
      body: "This is a course project: no real money moves. Use the test card 4242 4242 4242 4242, any future expiry date and any CVC.",
    },
    bestValue: "Best value",
    selected: "Selected",
    tiers: {
      free: {
        name: "Free",
        tagline: "Try the whole product",
        price: "$0",
        cadence: "",
        credits: "{n} credits to start",
        cta: "Start free",
        ctaSignedIn: "Create a report",
        features: ["No credit card", "All three storefronts", "Every feature included"],
      },
      pack: {
        name: "Credit pack",
        tagline: "Pay once, use when you need",
        price: "${price}",
        cadence: "one-time",
        credits: "{n} credits",
        cta: "Buy {n} credits",
        features: ["No subscription", "Credits don't expire", "Stack packs anytime"],
      },
      pro: {
        name: "Pro",
        tagline: "For sellers launching every month",
        price: "${price}",
        cadence: "/ month",
        credits: "{n} credits every month",
        cta: "Go Pro",
        features: [
          "Credits refresh monthly",
          "Cancel anytime in the billing portal",
          "Best price per credit",
        ],
      },
    },
    credit: {
      title: "What is a credit?",
      body: "Credits are spent only when the AI does a full job. If a run fails on our side, the credit comes back automatically.",
      items: [
        {
          title: "1 multi-channel report",
          body: "Up to three storefronts, photo check, claim review and every form field.",
        },
        {
          title: "1 listing audit",
          body: "Findings, the smallest fix, and the risk before and after for a live listing.",
        },
        {
          title: "1 takedown analysis",
          body: "Cause, fix steps, documents to gather and a draft appeal.",
        },
      ],
      free: "Always free: editing and re-checking your listings, explanations in Chinese, exports and the evidence library.",
    },
    table: {
      title: "Compare plans",
      feature: "Feature",
      credits: "Credits",
      included: "Included",
      rows: [
        "Amazon US, TikTok Shop US and Shopify reports",
        "Claim review with policy citations",
        "Photo check and shot list",
        "Listing audit",
        "Takedown and appeal help",
        "Evidence library",
        "CSV, TXT, JSON, Markdown and printable exports",
        "English and 简体中文 interface",
      ],
    },
    faq: {
      title: "Billing questions",
      items: [
        {
          q: "Can I cancel Pro?",
          a: "Yes, anytime from Billing → Manage subscription. You keep your credits until the end of the period.",
        },
        {
          q: "Do pack credits expire?",
          a: "No. Pack credits stay in your account until you use them.",
        },
        {
          q: "What if a run fails?",
          a: "If the failure is on our side, the credit is refunded automatically. If your input is blocked (for example, a prohibited product), no credit is used.",
        },
        {
          q: "Can I get a refund?",
          a: "Unused pack credits can be refunded within 14 days of purchase. See the refund policy for details.",
        },
      ],
    },
  },
  legal: {
    updated: "Last updated {date}",
    contact: "Questions? Write to support@shelfpass.app.",
    note: "ShelfPass is a student capstone project. These pages are written in plain language and are not legal advice.",
    terms: {
      intro:
        "By creating an account or using ShelfPass, you agree to these terms. If you don't agree, please don't use the service.",
      sections: [
        {
          h: "What ShelfPass does",
          p: [
            "ShelfPass helps you write and review product listings for online marketplaces. It suggests copy, checks it against summarized marketplace and US rules, and explains the risks it finds.",
            "It does not publish listings for you, does not guarantee approval by any marketplace, and is not legal, regulatory or tax advice. You are responsible for what you publish.",
          ],
        },
        {
          h: "Your account",
          p: [
            "Keep your login details safe and tell us if you think someone else has access. One person per account.",
            "You must give accurate product information. Don't use ShelfPass for products that are illegal, prohibited by the marketplaces, or that you don't have the right to sell.",
          ],
        },
        {
          h: "Your content",
          p: [
            "You own the product information, photos and documents you upload, and the listings we generate for you. You give us permission to process them only to provide the service.",
            "AI output can be wrong. Check every fact, claim and field before you publish.",
          ],
        },
        {
          h: "Fair use",
          p: [
            "Don't try to break, overload or reverse-engineer the service, or to get around credit limits. We may limit or suspend accounts that do.",
          ],
        },
        {
          h: "Payments",
          p: [
            "Paid plans are billed by Stripe. During the course project, Stripe runs in test mode and no real payments are taken.",
            "Pro renews monthly until you cancel. Credit packs are one-time purchases.",
          ],
        },
        {
          h: "Changes and ending",
          p: [
            "We may update the service or these terms; we'll show the date of the latest change on this page. You can delete your account at any time from the Account page.",
          ],
        },
      ],
    },
    privacy: {
      intro:
        "We collect only what we need to run ShelfPass, and we never sell your data. Here's what we keep and why.",
      sections: [
        {
          h: "What we store",
          p: [
            "Account: your email address and, if you add one, your phone number — managed by Supabase Auth.",
            "Your work: product information, photos, evidence documents, reports, audits and appeals — stored in our Supabase Postgres database and visible only to your account.",
            "Payments: handled by Stripe. We store your plan, credits and Stripe customer ID, never your card number.",
          ],
        },
        {
          h: "How we process it",
          p: [
            "Your product text and photos are sent to Anthropic's Claude API to generate and review listings. Contact details (emails, phone numbers) in product text are removed before any AI model sees them.",
            "We keep technical logs of each run (timing, cost, which steps ran) to fix problems and measure quality, with personal details masked.",
          ],
        },
        {
          h: "Your choices",
          p: [
            "Download all your data or delete your account at any time from the Account page. Deleting your account removes your reports, audits, appeals and evidence.",
            "We use cookies only to keep you signed in and to remember your language.",
          ],
        },
      ],
    },
    refunds: {
      intro: "We want you to pay only for what's useful. Here's how refunds work.",
      sections: [
        {
          h: "Failed runs",
          p: [
            "If a report, audit or takedown analysis fails because of a problem on our side, the credit is returned to your account automatically.",
            "If your input is blocked before any AI runs (for example, a prohibited product or instructions aimed at the AI), no credit is used.",
          ],
        },
        {
          h: "Credit packs",
          p: [
            "Unused credit packs can be refunded within 14 days of purchase. Credits you've already used can't be refunded.",
          ],
        },
        {
          h: "Pro subscription",
          p: [
            "Cancel anytime from Billing → Manage subscription; you won't be charged again. We don't refund partial months, and your credits stay usable until the period ends.",
          ],
        },
        {
          h: "Test mode",
          p: [
            "While ShelfPass runs as a course project, Stripe is in test mode and no real money is charged.",
          ],
        },
      ],
    },
  },
};
