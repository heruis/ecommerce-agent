/**
 * Strings for billing, checkout and the mock checkout. Owner: WS4.
 * zh/billing.ts must have the same shape (TypeScript and i18n.test.ts check it).
 */
export const billing = {
  meta: { title: "Billing" },
  title: "Billing",
  subtitle: "Your plan, credits and payments.",
  testMode:
    "Payments run in Stripe test mode: use card 4242 4242 4242 4242, any future expiry date and any CVC. No real money is charged.",
  banners: {
    proSuccess:
      "Welcome to Pro! Your monthly credits are being added. If they don't show yet, refresh in a few seconds.",
    packSuccess:
      "Payment received. {n} credits are being added to your account. Refresh in a few seconds if they don't show yet.",
    cancelled: "Checkout cancelled. Nothing was charged.",
  },
  current: {
    title: "Current plan",
    free: "Free",
    pro: "Pro",
    credits: "{n} credits left",
    renews: "Renews on {date}",
    noRenewal: "No active subscription",
    oneCredit: "1 credit = one multi-channel report, one listing audit or one takedown analysis.",
  },
  pack: {
    title: "Credit pack",
    body: "{n} credits for ${price}, paid once. Credits never expire.",
    cta: "Buy {n} credits — ${price}",
  },
  pro: {
    title: "Pro",
    body: "Your balance is topped up to {n} credits every month for ${price}/month. Credits from packs never expire. Cancel anytime.",
    cta: "Upgrade to Pro — ${price}/month",
    active: "You're on Pro.",
    manage: "Manage subscription",
    manageHelp: "Update your card, download invoices or cancel in Stripe's secure portal.",
  },
  compare: "Compare all plans",
  mock: {
    label: "Mock checkout · no real payment",
    packTitle: "ShelfPass credit pack",
    proTitle: "ShelfPass Pro",
    perMonth: "/month",
    credits: "{n} credits",
    pay: "Pay ${price} (test)",
    back: "Back to pricing",
  },
  errors: {
    unavailable: "Checkout is unavailable right now.",
    portalUnavailable: "The billing portal is unavailable right now.",
  },
};
