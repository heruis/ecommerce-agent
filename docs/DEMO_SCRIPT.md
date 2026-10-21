# 7-minute class presentation: five speakers

Goal: in 7 minutes, show a real problem, a working paid product, and AI the grader can trust, following the rubric's order (problem → implementation → AI design → trust → production → lessons). The deck has 11 slides; the same lines are in its speaker notes. About 5 minutes are spoken; the rest is demo actions and hand-offs. Rehearse twice with a timer.

Speakers follow the workstreams: **Speaker 1** lead · **Speaker 2** WS3 product UI · **Speaker 3** WS1 AI pipeline · **Speaker 4** WS2 trust layer · **Speaker 5** WS4 platform. Write your names here before rehearsing.

## Run of show

| Time      | Speaker            | Slide                                              | Screen                                 |
| --------- | ------------------ | -------------------------------------------------- | -------------------------------------- |
| 0:00–0:20 | 1 · Lead           | 1 ShelfPass 上架通                                 | Deck                                   |
| 0:20–0:55 | 1 · Lead           | 2 China-ready copy gets US listings removed        | Deck                                   |
| 0:55–1:15 | 1 · Lead           | 3 Built for a 1–10 person seller on three channels | Deck                                   |
| 1:15–1:40 | 2 · WS3 Product UI | 4 One run, three marketplace-ready listings        | Deck                                   |
| 1:40–3:00 | 2 · WS3 Product UI | 5 Demo                                             | **Live: https://shelfpass.vercel.app** |
| 3:00–3:45 | 3 · WS1 AI         | 6 Agents where they earn it, code everywhere else  | Deck                                   |
| 3:45–4:15 | 3 · WS1 AI         | 7 It stops, asks or refunds; it never guesses      | Deck                                   |
| 4:15–4:50 | 4 · WS2 Trust      | 8 A restricted claim cannot reach the listing      | Deck                                   |
| 4:50–5:30 | 4 · WS2 Trust      | 9 Evals caught a real gap before a seller did      | Deck                                   |
| 5:30–6:30 | 5 · WS4 Platform   | 10 Live, paid and production-ready                 | Deck                                   |
| 6:30–7:00 | 1 · Lead           | 11 What we learned, and what's next                | Deck, then questions                   |

## Script

**Speaker 1 · Lead (0:00–1:15)**

- _Slide 1._ Hi, we're Team 9, and this is ShelfPass, 上架通. Chinese sellers list thousands of products on Amazon, TikTok Shop and Shopify. ShelfPass takes the Chinese supplier note they already have and turns it into listings for every channel that they can publish today. On the right: supplier copy on top, the Amazon-ready listing below.
- _Slide 2._ Here's the problem. Supplier copy is written for Chinese shoppers. Translated literally, FDA认证 becomes "FDA certified", 100%安全 becomes "100% safe", 美国销量第一 becomes "#1 in the US". The FDA doesn't certify cups, and none of these can be proven. These are exactly the phrases that get listings removed. And every channel wants different fields. Amazon even changed its rules during our course: since July 27, titles are capped at 75 characters.
- _Slide 3._ Our user owns a small seller in Shenzhen or Yiwu, with hundreds of SKUs on three channels. AI is the right tool because the job is reading Chinese, writing natural English and judging claims. But ChatGPT alone writes "FDA Approved". So in ShelfPass, models write and code enforces. → _Speaker 2_

**Speaker 2 · WS3 Product UI (1:15–3:00)**

- _Slide 4._ Here's what the seller gets. One run gives a tab per marketplace, and each tab is that site's own "add product" form, in order, with a copy button on every field. Note the title within Amazon's 75 characters, with Item Highlights under it. Every claim is checked with a cited source, and each channel gets a quality and a takedown-risk score. Let me show you.
- _Slide 5, live demo (switch to the browser; fall back to the slide's screenshots if the network fails)._
  1. "Every new account starts with three free credits; I'm already signed in." _(Sign up beforehand to save time. If the live sign-up sends an email code, say so.)_
  2. Paste the thin input: title `杯子`, description `质量很好，很好用，欢迎购买。` → Generate. "ShelfPass stops before writing and asks three questions, in English and Chinese. No credit used: we won't invent a listing."
  3. New report → _Example: Collapsible silicone cup_ → Generate. While it streams: "extraction, keywords, three localization agents in parallel, then compliance."
  4. Amazon tab: "the title fits 75 characters, the extra details moved into Item Highlights" → **Show preview**.
  5. In the editor, add "FDA approved" to a bullet → **Save & re-check**: "the checks re-run and the gate flips to FAIL."
  6. Pricing → Buy 20 credits → Stripe test card `4242 4242 4242 4242` → "the balance updates through the webhook." → _Speaker 3_

**Speaker 3 · WS1 AI pipeline (3:00–4:15)**

- _Slide 6._ Under the hood it's a fixed workflow, not a free-roaming agent. Blue boxes are models, grey boxes are code. Extraction pulls facts with a source quote for each. Three localization agents run in parallel as ReAct loops: draft, check against that channel's rule engine, rewrite. One compliance agent searches our cited policy base, so each claim is judged once for all channels. Then code has the last word. Measured live: about 14 model calls, 9 cents and half a minute per report, with hard budgets in code.
- _Slide 7._ For errors and edge cases, our rule is: stop, ask or refund, never guess. Injection is blocked before any model call. Thin input: code decides to stop and ask. Numbers the seller never gave are flagged. Rule-breaking drafts go back to the agent. Failures refund the credit. → _Speaker 4_

**Speaker 4 · WS2 Trust layer (4:15–5:30)**

- _Slide 8._ Trust is why sellers would pay, so it's built in layers. Here's the claim review from the demo: "FDA approved" is restricted and rewritten, citing the FDA source, and every citation must come from this run's retrieval. Input is screened and treated as data, agents can't publish or touch money, and an output gate sweeps every field. Even if the model misses "FDA approved", it cannot reach the listing.
- _Slide 9._ And we measure it. Golden cases are written first and checked on every channel. The first live run passed 10 of 13; after fixes, 13 of 13 twice in a row, because one green run can be luck. CI runs the suites on every pull request. The yoga mat taught us the most: 可降解 became "Degradable", our lexicon only knew "biodegradable", so a risky claim would have shipped. The eval caught it, and we never edited a test to pass. → _Speaker 5_

**Speaker 5 · WS4 Platform (5:30–6:30)**

- _Slide 10._ Everything you saw is live at shelfpass.vercel.app: one Next.js app on Vercel. Claude does the model work, Sonnet writes and Haiku reads and judges. Supabase holds accounts and data with row-level security, and every query also filters by the signed-in user. Stripe runs checkout in test mode, and credits change only through atomic SQL or the signed webhook. It's production-ready: sign-up and login with password reset, secrets only in Vercel, refunds on our failures, data export and account deletion. The business: three free credits, a $4.99 pack, or Pro at $9.99 a month. A report costs us 8 to 9 cents, so even a heavy Pro user leaves a margin. → _Speaker 1_

**Speaker 1 · Lead (6:30–7:00)**

- _Slide 11._ Three lessons: mock green isn't quality, rules the model must follow belong in code, and marketplace rules move, as Amazon's title limit did mid-course. We also merged the best of four team prototypes. Next: verify the policy base, publish directly through marketplace APIs, and add bulk CSV. Thank you, we're happy to take questions.

## Before the presentation

- [ ] Live smoke test today (`docs/AUTH_SETUP.md` §8): sign up (enter the email code if one is sent), one report, one audit, a credit pack with the test card
- [ ] Live eval run with the deployed models (golden, audit, appeal); update slide 9 if the numbers change
- [ ] Demo account signed in with at least 2 credits; Stripe in test mode; thin input and the cup example ready to paste
- [ ] Browser zoom 125%, notifications off, the deck open in a second window
- [ ] Fallback: slide 5's screenshots, or local `pnpm dev` in mock mode with the same examples (works offline)

**If something fails live:** say what happened, switch to the fallback, and open the trace page: showing how you debug is part of "AI design".

## Likely questions

- _Why not one big agent?_ Each stage is testable and cheap; only localization and compliance need to choose their next step (D-003).
- _What if the policy summaries are wrong?_ They are cited and marked unverified; verifying them is next step 1, and the UI says "risk screening, not legal advice".
- _Why not publish directly?_ Marketplace API approval takes weeks; the report gives every field to paste (D-011).
- _How do you know the 75-character rule is right?_ Amazon announced it for July 27, 2026; the knowledge base cites it and stays marked unverified until checked in Seller Central.
