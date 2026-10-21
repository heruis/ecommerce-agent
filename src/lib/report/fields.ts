import type {
  KeywordSet,
  ListingDraft,
  Platform,
  ProductFacts,
  ProductInput,
  PublishField,
  ValidationReport,
} from "@/lib/contracts";
import { rulesFor, type FormField } from "@/lib/rules";

/**
 * Map a generated listing onto the marketplace's "add product" form, field by
 * field, so the seller can copy values straight into Seller Center / Shopify
 * admin and see what they still need to fill in themselves.
 */
export function buildPublishFields(args: {
  platform: Platform;
  listing: ListingDraft;
  validation: ValidationReport;
  input: ProductInput;
  facts: ProductFacts;
  keywords: KeywordSet;
}): PublishField[] {
  const rules = rulesFor(args.platform);
  return rules.form.map((f) => resolve(f, args));
}

function resolve(f: FormField, a: Parameters<typeof buildPublishFields>[0]): PublishField {
  const { listing, validation, input, facts, keywords } = a;
  const base = { key: f.key, label: f.label, required: f.required };
  const noteOf = (fallback = "") => f.note ?? fallback;
  const problems = (field: string, index?: number) =>
    validation.violations.filter(
      (v) => v.field === field && (index === undefined || v.index === index || v.index === null),
    );
  const generated = (value: string, field: string, index?: number): PublishField => {
    const issues = problems(field, index);
    const status = !value ? (f.required ? "missing" : "warning") : issues.length ? "warning" : "ok";
    return {
      ...base,
      value,
      source: "generated",
      status,
      note: issues.length ? issues.map((i) => i.message).join(" ") : noteOf(),
    };
  };

  switch (f.source.from) {
    case "title":
      return generated(listing.title, "title");
    case "item_highlights":
      return generated(listing.item_highlights ?? "", "item_highlights");
    case "description":
      return generated(listing.description, "description");
    case "search_terms":
      return generated(listing.search_terms, "search_terms");
    case "seo_title":
      return generated(listing.seo_title, "seo_title");
    case "seo_description":
      return generated(listing.seo_description, "seo_description");
    case "bullet":
      return generated(listing.bullets[f.source.index] ?? "", "bullets", f.source.index);
    case "bullets":
      return generated(listing.bullets.map((b) => `• ${b}`).join("\n"), "bullets");
    case "tags":
      return generated(
        listing.tags
          .map((t) => (a.platform === "tiktok_us" ? `#${t.replace(/^#/, "")}` : t))
          .join(a.platform === "tiktok_us" ? " " : ", "),
        "tags",
      );
    case "hashtags":
      return generated(keywords.hashtags.map((t) => `#${t}`).join(" "), "tags");
    case "keywords": {
      const handle = slug(keywords.primary[0] ?? facts.product_type);
      return {
        ...base,
        value: handle,
        source: "generated",
        status: handle ? "ok" : "warning",
        note: noteOf("URL path for the product page"),
      };
    }
    case "product_type": {
      const value = titleCase(facts.product_type);
      return {
        ...base,
        value,
        source: "generated",
        status: "ok",
        note: noteOf(
          `Suggested from your input (category hint: ${input.category.replace(/_/g, " ")})`,
        ),
      };
    }
    case "category":
      return {
        ...base,
        value: input.category.replace(/_/g, " "),
        source: "fact",
        status: "ok",
        note: noteOf(),
      };
    case "brand":
      return input.brand
        ? { ...base, value: input.brand, source: "fact", status: "ok", note: noteOf() }
        : {
            ...base,
            value: "",
            source: "seller",
            status: f.required ? "missing" : "warning",
            note: noteOf("Enter your brand"),
          };
    case "fact": {
      const attrs = f.source.attributes;
      const found = facts.facts.filter(
        (x) => attrs.includes(x.attribute) && x.confidence !== "low",
      );
      const value = found.map((x) => `${x.value}${x.unit ? ` ${x.unit}` : ""}`).join("; ");
      if (value)
        return {
          ...base,
          value,
          source: "fact",
          status: "ok",
          note: noteOf("From your product information"),
        };
      return {
        ...base,
        value: "",
        source: "seller",
        status: f.required ? "missing" : "warning",
        note: noteOf("Not in your product information — add it when you publish"),
      };
    }
    case "seller":
    default:
      return {
        ...base,
        value: "",
        source: "seller",
        status: f.required ? "missing" : "warning",
        note: noteOf("Fill in when you publish"),
      };
  }
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function titleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}
