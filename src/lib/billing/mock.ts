import type { BillingProvider, SessionUser } from "@/lib/contracts";

/**
 * BILLING_MODE=mock: "checkout" is a local page that upgrades the user
 * immediately. Lets the full journey run without Stripe keys. Relative URLs
 * so it works on any host and port.
 */
export class MockBilling implements BillingProvider {
  async createCheckoutSession(user: SessionUser) {
    void user;
    return { url: "/billing/mock-checkout" };
  }
  async createPortalSession(user: SessionUser) {
    void user;
    return { url: "/billing?portal=mock" };
  }
}
