import type { BillingProduct, BillingProvider, SessionUser } from "@/lib/contracts";

/**
 * BILLING_MODE=mock: "checkout" is a local page that grants the purchase
 * immediately. Lets the full journey run without Stripe keys. Relative URLs
 * so it works on any host and port.
 */
export class MockBilling implements BillingProvider {
  async createCheckoutSession(user: SessionUser, product: BillingProduct = "pro") {
    void user;
    return { url: `/billing/mock-checkout?product=${product}` };
  }
  async createPortalSession(user: SessionUser) {
    void user;
    return { url: "/billing?portal=mock" };
  }
}
