# Sign-in, verification and payments: dashboard checklist

About 10 minutes. These are settings in the Supabase and Stripe dashboards that environment variables can't control, so `pnpm check:env` can't verify them. Do them in order, then run the test script at the end on the live URL.

Live site: `https://shelfpass.vercel.app`. Replace it with your own domain if it changes.

## 1. Database: run the new migration (1 min)

Supabase → **SQL Editor** → paste and run `supabase/migrations/20261020000000_compliance_suite.sql`. It adds the evidence library, audit/appeal storage and `add_credits()` for credit packs. It is safe to run twice. `pnpm check:env` now fails with a clear message if it is missing.

## 2. Email sending: set up custom SMTP first (4 min)

Read this before you turn on email confirmation. Supabase's built-in email server only delivers to people on your Supabase **team**; everyone else gets _"Email address not authorized"_. It also has a low hourly limit. The app shows a friendly message for both cases, but real sign-ups can't work until you fix this.

- Easiest: create a free [Resend](https://resend.com/docs/send-with-supabase-smtp) account and copy its SMTP host, port, user and password.
- Supabase → **Authentication → Emails → SMTP Settings**: enable custom SMTP, paste the values, and set the sender to something like `ShelfPass <no-reply@your-domain>`.
- Custom SMTP starts at 30 emails/hour. Raise it under **Authentication → Rate Limits** if you expect more sign-ups during the demo.
- Demo-only shortcut: add each tester's email to the Supabase organization **Team**. The built-in server will then deliver to them.

## 3. Turn on email confirmation (30 s)

Supabase → **Authentication → Sign In / Providers → Email** → **Confirm email: ON**.

When this is on, "Create account" asks for the 6-digit code from the email. Signing in with an unconfirmed address re-sends the code and shows the same code step.

## 4. Email templates: code + link (2 min)

Supabase → **Authentication → Emails → Templates**.

**Confirm signup.** This template contains both the code the app asks for and a link that works in any browser:

```html
<h2>Confirm your ShelfPass account</h2>
<p>Your verification code: <strong style="font-size:20px">{{ .Token }}</strong></p>
<p>
  Or click to confirm:
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard"
    >Confirm email</a
  >
</p>
<p>The code expires in one hour. If you didn't sign up, ignore this email.</p>
```

**Reset password:**

```html
<h2>Reset your ShelfPass password</h2>
<p>
  <a
    href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password"
    >Choose a new password</a
  >
</p>
<p>If you didn't ask for this, ignore this email.</p>
```

The link format (`/auth/confirm?token_hash={{ .TokenHash }}&type=…`) follows Supabase's "Password-based Auth" guide. The `/auth/confirm` route exchanges it for a session and then opens `next`.

If you keep Supabase's default templates (`{{ .ConfirmationURL }}`), links still work through `/auth/callback`, but only in the same browser where the user signed up, and there is no code to type.

## 5. URL configuration (1 min)

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://shelfpass.vercel.app`
- **Redirect URLs:**
  - `https://shelfpass.vercel.app/auth/callback`
  - `https://shelfpass.vercel.app/auth/confirm`
  - `http://localhost:3000/**` (local development)
  - optional: your Vercel preview pattern, e.g. `https://*-<team>.vercel.app/**`

## 6. Phone sign-in by SMS (3 min, optional)

Supabase sends SMS through a provider; there is no built-in sender. Until you set one up, the Phone tab shows _"Text-message codes aren't switched on for this site yet"_, and email sign-in keeps working.

1. Create a [Twilio](https://www.twilio.com/) account. The free trial includes credit, but **trial accounts can only text numbers you have verified** in Twilio Console → Phone Numbers → **Verified Caller IDs**. Add your teammates' numbers there before the demo.
2. In Twilio, create a **Messaging Service** (Messaging → Services) and add a Twilio phone number to it.
3. Supabase → **Authentication → Sign In / Providers → Phone**: enable it, choose **Twilio**, and paste the **Account SID**, **Auth Token** and **Message Service SID**. Twilio Verify also works if you prefer it: choose Twilio Verify and paste its Service SID.
4. In the same panel, raise **SMS OTP expiry**. The default is 60 seconds, which is short for a demo; 300 seconds works well.
5. Test numbers: Supabase's docs describe fixed test codes (`SMS_TEST_OTP` / `auth.sms.test_otp`) for **self-hosted and local CLI** projects. We did not find them documented for the hosted dashboard. If your Phone provider page shows a "test phone numbers / OTPs" field, you can map one number to a fixed code for the demo. Remove it before real users arrive.

Phone verification works in two places:

- **Sign in with phone** (login page → Phone tab): text code → signed in. A new number creates a new account.
- **Add / verify phone** (Account page): attaches a verified number to an existing email account.

## 7. Stripe: nothing new to create

- **Credit packs** ($4.99 for 20 credits, one-time) use inline `price_data`, so there is no new product or price to create. To manage the price in Stripe instead, create a one-time price and set `STRIPE_PRICE_ID_PACK` in Vercel. `pnpm check:env` validates it if it is set.
- **Webhook:** the same endpoint and the same three events (`checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`). `checkout.session.completed` covers both Pro and packs.
- Test card: `4242 4242 4242 4242`, any future date, any CVC.

**Credit rules.** All credits live in one balance, and Pro events never lower it, so pack credits don't expire:

| Event                       | Balance                                     |
| --------------------------- | ------------------------------------------- |
| Credit pack paid            | + 20                                        |
| Pro starts / renews monthly | raised to at least 50 (`max(balance, 50)`)  |
| Pro cancelled               | plan → Free, balance kept                   |
| Account deleted             | subscription cancelled first, then all data |

## 8. Test script (run on the live URL after deploying)

1. Create an account with a fresh email → enter the 6-digit code → you land on the dashboard with 3 credits.
2. Sign out, sign in again. Then "Forgot password?" → email link → choose a new password.
3. Phone tab (if SMS is set up) → code → signed in.
4. Account → Add phone → code → shows "Verified".
5. Pricing → Buy credits → card 4242… → Billing shows "+20" within a few seconds.
6. Pricing → Pro → card 4242… → Billing shows Pro and the new balance. "Manage subscription" opens the Stripe portal; cancel there → back to Free with the balance kept.
7. Account → Download my data (a JSON file). Then delete the account: type DELETE, and you are signed out. Signing in again fails.

If a step fails, check Supabase → **Authentication → Logs** and Vercel → **Logs**. Checkout errors appear in the server log, not on the page.
