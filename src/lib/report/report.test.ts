import { describe, expect, it } from "vitest";
import { ProductInput, type Listing } from "@/lib/contracts";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import { channelView, reportMarkdown } from "./index";

async function generated(): Promise<Listing> {
  const input = {
    title_zh: "硅胶折叠水杯 便携旅行杯",
    description_zh: "食品级硅胶折叠水杯，FDA认证。容量350ml，折叠后仅3cm高。",
    specs_zh: "重量：85g",
    brand: "TrailCup",
  };
  const out = await runPipeline(input);
  const now = new Date().toISOString();
  return {
    id: "lst_test",
    user_id: "u_1",
    created_at: now,
    updated_at: now,
    status: "completed",
    input: ProductInput.parse(input),
    result: out.result,
    edited: null,
    last_run_id: out.run.id,
  };
}

describe("publish report", () => {
  it("maps every channel onto its add-product form, with seller-only fields marked", async () => {
    const listing = await generated();
    const amazon = channelView(listing, "amazon_us")!;
    expect(amazon.fields.find((f) => f.key === "item_name")!.value).toBe(amazon.listing.title);
    expect(amazon.fields.find((f) => f.key === "brand")!.value).toBe("TrailCup");
    expect(amazon.fields.find((f) => f.key === "external_product_id")).toMatchObject({
      source: "seller",
    });
    const tiktok = channelView(listing, "tiktok_us")!;
    expect(tiktok.fields.find((f) => f.key === "hashtags")!.value).toMatch(/^#/);
  });

  it("re-checks seller edits instead of trusting them", async () => {
    const listing = await generated();
    const shopify = channelView(listing, "shopify")!;
    listing.edited = {
      shopify: {
        ...shopify.listing,
        seo_title: "FDA Approved Travel Cup That Is The Best Cup Ever Sold Anywhere In America",
      },
    };
    const view = channelView(listing, "shopify")!;
    expect(view.edited).toBe(true);
    expect(view.gate.decision).toBe("fail");
    expect(view.gate.needs_review.join(" ")).toMatch(/FDA approved/i);
    expect(view.fields.find((f) => f.key === "seo_title")!.status).toBe("warning");
  });

  it("renders one Markdown report with every channel and the claim review", async () => {
    const md = reportMarkdown(await generated());
    for (const label of ["Amazon US", "TikTok Shop US", "Shopify"]) expect(md).toContain(label);
    expect(md).toContain("## Claim review");
    expect(md).toContain("Not legal advice");
  });
});
