# API and account setup (live on Vercel)

Everything the product needs to run on a public URL and to publish listings to **Amazon, TikTok Shop and Shopify** with real keyword data. Work top to bottom; each section says how long it takes, what it costs, and which env vars it produces. Put every value in **Vercel → Project → Settings → Environment Variables** (and in your own `.env.local` only if you also run locally). Never paste keys into chat, code, issues or screenshots.

`<domain>` below means your production URL, e.g. `https://<brand>.vercel.app` (or a custom domain later). Register callback URLs exactly as written; the app implements these paths.

## 0. What you need, at a glance

| #   | Service                                 | Why                                             | Cost                                                | Waiting time                                    | Owner               |
| --- | --------------------------------------- | ----------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- | ------------------- |
| 1   | **Vercel**                              | Hosting, live URL, preview per PR               | Free (Hobby)                                        | none                                            | Lead                |
| 2   | **Supabase**                            | Database, auth, file storage for product images | Free tier                                           | none                                            | Lead → WS4          |
| 3   | **Anthropic (Claude API)**              | The agents                                      | Pay per use (a few cents per run)                   | none                                            | Lead                |
| 4   | **Stripe** (test mode)                  | Subscriptions                                   | Free in test mode                                   | none                                            | Lead → WS4          |
| 5   | **Shopify** (Dev Dashboard + dev store) | Publish to Shopify, SEO fields                  | Free                                                | none                                            | Lead (integrations) |
| 6   | **Amazon SP-API**                       | Validate + publish Amazon listings              | Needs a **Professional seller account** ($39.99/mo) | Developer review: days to weeks — **start now** | Lead (integrations) |
| 7   | **TikTok Shop Partner Center (US)**     | Publish to TikTok Shop                          | Free; needs developer registration                  | Review for app developers — **start now**       | Lead (integrations) |
| 8   | **DataForSEO**                          | Real keyword search volumes (Amazon + Google)   | Pay as you go, $50 minimum deposit                  | none                                            | Lead (integrations) |
| 9   | Amazon Ads API _(optional, later)_      | Amazon's own keyword recommendations            | Needs an Amazon Ads account                         | Application review                              | Later               |
| 10  | Voyage AI _(optional)_                  | Embeddings for vector RAG                       | Free tier                                           | none                                            | WS2                 |

**Start the two slow ones (6 and 7) today**, even before the code exists. Everything else takes minutes.

## Callback URLs to register

| Where                                  | URL                                      |
| -------------------------------------- | ---------------------------------------- |
| Supabase → Auth → URL configuration    | `<domain>/auth/callback`                 |
| Stripe webhook endpoint                | `<domain>/api/stripe/webhook`            |
| Shopify app → redirect URL             | `<domain>/api/channels/shopify/callback` |
| Shopify app → App URL                  | `<domain>/channels`                      |
| Amazon SP-API app → OAuth Login URI    | `<domain>/api/channels/amazon/login`     |
| Amazon SP-API app → OAuth Redirect URI | `<domain>/api/channels/amazon/callback`  |
| TikTok Shop app → Redirect URL         | `<domain>/api/channels/tiktok/callback`  |

---

## 1. Vercel — get the live URL first (10 min)

You need the URL before you can register any OAuth app.

1. https://vercel.com → **Sign up with GitHub** (use the account that owns the repo, or ask the owner to add you to a team).
2. **Add New → Project → Import** the `ecommerce-agent` repository. Framework preset: **Next.js**. Install command `pnpm install`, build command `pnpm build` (defaults are fine).
3. **Project name** = your brand (it becomes `<brand>.vercel.app`).
4. Environment variables for the first deploy (mock mode, no keys yet):
   ```
   AI_MODE=mock
   DATA_MODE=memory
   BILLING_MODE=mock
   RAG_MODE=lexical
   ```
5. **Deploy.** Open the URL → sign in with any email → generate the example listing.
   _Mock + memory mode on Vercel is only a smoke test: in-memory data is per server instance and can disappear. Real data starts with step 2._
6. **Settings → Functions:** confirm the maximum duration allows the run route's `maxDuration = 300` seconds.
7. **Settings → Git:** production branch `main`; previews on for pull requests.
8. Set `NEXT_PUBLIC_APP_URL=<domain>` and redeploy.

> Vercel's Hobby plan is for non-commercial use. A class project in Stripe test mode is fine; upgrade to Pro before charging real customers.

## 2. Supabase — database, auth, image storage (15 min)

1. https://supabase.com → **New project** (region close to Vercel's, e.g. US West or East). Save the database password in a password manager.
2. **SQL Editor → New query** → paste `supabase/migrations/20261018000000_init.sql` → **Run**. Repeat for any newer migration files, in filename order.
3. **Authentication → Sign In / Providers → Email**: on. **Authentication → URL Configuration**: Site URL `<domain>`, redirect URL `<domain>/auth/callback` (add `http://localhost:3000/auth/callback` for local dev).
4. **Storage → New bucket** `product-images`, public (marketplaces fetch images by URL).
5. **Project Settings → API Keys** → copy into Vercel:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=sb_secret_...          # server only, never NEXT_PUBLIC
   ```
6. Switch `DATA_MODE=supabase` only after WS4 merges `SupabaseRepo` (CI green on main). Until then leave `memory`.

## 3. Anthropic — Claude API (10 min)

1. https://console.anthropic.com → create the organization → **Billing**: add credit ($10–20 is plenty for the course) and set a **monthly spend limit**.
2. **API Keys → Create key**: `prod-vercel` (only for Vercel) and one `dev-<name>` key per teammate who tunes prompts.
3. Vercel env:
   ```
   AI_MODE=live
   ANTHROPIC_API_KEY=sk-ant-...
   ANTHROPIC_MODEL_SMART=<pinned model id>   # the lead posts the exact IDs in the team chat
   ANTHROPIC_MODEL_FAST=<pinned model id>
   ```
4. Redeploy → `<domain>/api/health` shows `"ai":"live"` → generate a listing → open the trace to see real tokens and cost.

## 4. Stripe — test-mode subscriptions (15 min)

1. https://dashboard.stripe.com → keep **Test mode** on.
2. **Product catalog → Add product** "<Brand> Pro", recurring **$9.99/month** → copy the price id `price_...`.
3. **Settings → Billing → Customer portal** → activate.
4. **Developers → Webhooks → Add endpoint** `<domain>/api/stripe/webhook`, events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted` → copy the signing secret.
5. Vercel env:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_PRO=price_...
   ```
6. Switch `BILLING_MODE=stripe` after WS4 merges `StripeBilling`. Test card `4242 4242 4242 4242`.

## 5. Shopify — Dev Dashboard app + development store (30 min)

Shopify is the fastest channel to make fully real: free, no approval for custom distribution.

1. Go to https://dev.shopify.com (Shopify **Dev Dashboard**) and sign in or create an account.
2. **Dev stores → Create dev store** → name it `<brand>-demo`. This is a free test store you can publish to as much as you want.
3. **Apps → Create app** → name `<Brand>`.
4. In the app's **version** settings:
   - **App URL:** `<domain>/channels`
   - **Redirect URLs:** `<domain>/api/channels/shopify/callback`
   - **Access scopes:** `read_products`, `write_products`, `write_files` (product images), `read_publications`, `write_publications` (make products visible on the Online Store).
   - Use the current authorization-code install flow (not the legacy install flow).
   - **Release** the version. Any later scope change needs a new version and re-approval on each store.
5. **Distribution → Custom distribution** → enter the dev store domain → **Generate link** → open the link and **Install** on the dev store. (Custom distribution installs on one store, or one Plus organization. Each seller's store would need its own link; reaching many merchants requires public distribution with Shopify's review. That is post-capstone.)
6. **Settings** → copy **Client ID** and **Client secret** into Vercel:
   ```
   SHOPIFY_CLIENT_ID=...
   SHOPIFY_CLIENT_SECRET=...
   SHOPIFY_SCOPES=read_products,write_products,write_files,read_publications,write_publications
   SHOPIFY_API_VERSION=2026-07
   ```
7. **How the app gets a token:**
   - **Sellers' stores (production path):** OAuth authorization-code grant via `<domain>/api/channels/shopify/callback`. Tokens are stored encrypted per seller.
   - **Your own dev store (fast path for development):** the client-credentials grant works when the app and store belong to the same Shopify organization. POST `https://<store>.myshopify.com/admin/oauth/access_token` with `grant_type=client_credentials`, `client_id` and `client_secret` returns a 24-hour token.
8. **What we publish:** the GraphQL Admin API `productSet` mutation (title, description HTML, product type, vendor, tags, **`seo { title, description }`**, variants), then attach images. Products start as **draft** so the seller reviews them in Shopify admin.

## 6. Amazon Selling Partner API (start today; review takes time)

**Prerequisite:** an Amazon **Professional** seller account on amazon.com where you are the **primary user**. Individual plans cannot register. If nobody on the team has one, we use Amazon's **validation preview** and sandbox and say so in the demo. Tell the lead first.

1. Sign in to **Seller Central** (sellercentral.amazon.com), or the **Solution Provider Portal** if your account has moved there.
2. **Apps and Services → Develop Apps** (in the portal: **Settings → Developer Profile**). Fill in the registration:
   - **Data access:**
     - **Private developer** if you only connect your own seller account. Simplest, and enough for the capstone.
     - **Public developer** if the SaaS will connect other sellers' accounts. More review; plan for later.
   - **Roles:** **Product Listing** (create and update listings); also Pricing and Inventory if we later sync price and stock. Do not request restricted roles that involve personal data; we don't need them.
   - **Use cases:** "Generate compliant product listings from the seller's own product data, validate them with the Listings Items API in VALIDATION_PREVIEW mode, and submit them on the seller's instruction."
   - **Security controls:** answer honestly. Tokens are encrypted at rest in Postgres, secrets stay in Vercel env, access is TLS only, and keys are held on a least-privilege basis.
   - Agree to the agreements and policies → **Register**. Amazon opens a case; **reply within 5 days** to any question or the case closes.
3. When approved: **Develop Apps → Add new app client** → name `<Brand>` → API type **SP-API** → select the **Product Listing** role.
   - Public apps only: set **OAuth Login URI** to `<domain>/api/channels/amazon/login` and **OAuth Redirect URI** to `<domain>/api/channels/amazon/callback`.
4. **View** the LWA credentials → copy the **Client identifier** and **Client secret**. Copy the **App ID** (`amzn1.sp.solution...`).
5. **Self-authorize** your own seller account (private apps, or for testing): on the app, **Authorize app** → copy the **refresh token**. You can authorize while the app is still in draft.
   _Other sellers (public app):_ they click "Connect Amazon" in our app → `https://sellercentral.amazon.com/apps/authorize/consent?application_id=<App ID>&state=<random>&version=beta`. `version=beta` is only for apps still in draft. Amazon redirects back with `spapi_oauth_code`, which expires in 5 minutes, and we exchange it for a refresh token.
6. Vercel env:
   ```
   AMAZON_SPAPI_CLIENT_ID=amzn1.application-oa2-client....
   AMAZON_SPAPI_CLIENT_SECRET=...
   AMAZON_SPAPI_APP_ID=amzn1.sp.solution....
   AMAZON_SPAPI_REFRESH_TOKEN=Atzr|...        # only for the self-authorized dev account
   AMAZON_SPAPI_REGION=na                      # sellingpartnerapi-na.amazon.com
   AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER         # amazon.com (US)
   ```
7. **What we call:**
   - **Product Type Definitions API**: the JSON schema of required attributes for the category.
   - **Catalog Items API**: whether the product already has an ASIN (then we create an offer, not a new detail page).
   - **Listings Items API `putListingsItem` with `mode=VALIDATION_PREVIEW`**: Amazon validates the listing and returns its issues **without creating it**. This is our "will Amazon accept this?" check (limited to 1 request per second).
   - The same call without the preview mode publishes, but only after the seller clicks **Publish**.

## 7. TikTok Shop Partner Center — US (start today)

**Prerequisite:** a TikTok Shop US seller account to authorize. Cross-border (China-based) seller eligibility for TikTok Shop US has changed several times. Check the current Seller Center rules before promising this to users. For development, the Partner Center **sandbox test shop** is enough.

1. Go to https://partner.us.tiktokshop.com and register:
   - **Seller developer** if you connect only your own shop. Fastest.
   - **App developer** for a SaaS that connects other sellers' shops. Requires company details and a registration review.
2. **App & Service → Create app & service → Custom**:
   - **Category:** Enterprise Resource Planning or listing tools. **Not "Connector"**: that category triggers app review, and the category cannot be changed later.
   - **Market:** United States. **Seller type:** Local, or Cross-border if that is your real case. Both are fixed after creation.
   - **Enable API:** on.
   - **Redirect URL:** `<domain>/api/channels/tiktok/callback`
   - Webhook URL: leave empty for now.
3. **Manage API** → enable **Shop Authorized Information** (required) and **Product Basic** plus the product create/edit packages. Enable everything you need now: adding scopes later forces every seller to authorize again.
4. **Publish** the custom app (no review unless you picked Connector or exceed the seller-authorization threshold).
5. **App credentials / Basic information** → copy the **App Key**, **App Secret** and **Service ID**. Seller authorization link: `https://services.us.tiktokshop.com/open/authorize?service_id=<SERVICE_ID>`.
6. **Development Kits → Sandbox → Seller test accounts** → create a test shop. Authorize the app with the test shop, so you never touch a live shop while developing.
7. Vercel env:
   ```
   TIKTOK_SHOP_APP_KEY=...
   TIKTOK_SHOP_APP_SECRET=...
   TIKTOK_SHOP_SERVICE_ID=...
   ```
8. **What we call** (Product API): get categories, category attributes and rules, upload product images, then create the product. TikTok then runs its own product audit; we read back the audit status and show it in the app.

## 8. DataForSEO — real keyword volumes (10 min)

One account covers both Amazon search keywords and Google SEO keywords (for Shopify).

1. https://dataforseo.com → sign up → verify email → **add the $50 minimum deposit** (pay as you go).
2. **Dashboard → API access** → copy the **API login** and **API password** (HTTP Basic auth).
3. Try the free **sandbox** first (`sandbox.dataforseo.com`) so development doesn't spend credit.
4. Vercel env:
   ```
   DATAFORSEO_LOGIN=...
   DATAFORSEO_PASSWORD=...
   ```
5. **What we call:**
   - **DataForSEO Labs → Amazon:** `bulk_search_volume` (up to 1,000 keywords per call), `related_keywords` and `ranked_keywords`. Used for Amazon title, bullets and backend search terms.
   - **Keywords Data → Google Ads search volume.** Used for Shopify SEO titles and meta descriptions.
   - Volumes are third-party **estimates**: the UI says "estimated monthly searches (DataForSEO)", never "Amazon data".
   - TikTok Shop has no public search-volume API. TikTok tags stay **AI-suggested** and are labeled that way.

## 9. Encryption key for marketplace tokens (1 min)

Seller refresh/access tokens for Amazon, TikTok and Shopify are stored **encrypted** in Postgres (AES-256-GCM).

```bash
openssl rand -base64 32
```

→ Vercel env `CHANNEL_TOKEN_ENCRYPTION_KEY=<output>`. If it leaks: rotate it and ask sellers to reconnect.

## 10. Optional, later

- **Amazon Ads API:** Amazon's own keyword recommendations (Sponsored Products recommendations can sort by clicks or conversions). Requires an Amazon Ads account and an API access application. Worth it once real sellers use the product.
- **Voyage AI:** `VOYAGE_API_KEY` for `RAG_MODE=vector` (WS2).

## Checklist

- [ ] Live URL works (step 1)
- [ ] Supabase project + migration + bucket (2)
- [ ] Claude key + pinned models, `/api/health` shows live (3)
- [ ] Stripe product, price, portal, webhook (4)
- [ ] Shopify dev store + app installed (5)
- [ ] Amazon developer registration submitted, then app client + refresh token (6)
- [ ] TikTok Shop developer registration submitted, then app + sandbox shop authorized (7)
- [ ] DataForSEO account + sandbox call works (8)
- [ ] `CHANNEL_TOKEN_ENCRYPTION_KEY` set (9)
- [ ] `pnpm check:env` (run locally with the same values) is green
