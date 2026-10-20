import type { ProductInputDraft } from "@/lib/contracts";

/**
 * Demo inputs for the "Try an example" buttons and the 3-minute demo.
 * Button labels live in the dictionary (app.form.examples[key]). Owner: WS3.
 */
export const EXAMPLES: { key: "cup" | "board"; input: ProductInputDraft }[] = [
  {
    key: "cup",
    input: {
      title_zh: "硅胶折叠水杯 便携旅行杯 带盖",
      description_zh:
        "这是一款食品级硅胶折叠水杯，FDA认证，100%安全，美国销量第一。容量350ml，折叠后仅3cm高，适合旅行、露营、徒步。环保可重复使用，耐温-40℃到200℃。",
      specs_zh: "尺寸：9 x 9 x 11cm；重量：85g；颜色：蓝色、灰色；包装清单：杯子x1，挂绳x1",
      evidence: "",
      brand: "",
      category: "sports_outdoors",
      existing_listing_en:
        "Silicone Folding Cup Travel Cup FDA Approved 100% Safe Best Seller\n- good quality silicone cup\n- easy carry folding cup",
    },
  },
  {
    key: "board",
    input: {
      title_zh: "天然竹砧板 加厚菜板",
      description_zh:
        "天然竹子制作，抗菌防霉，加厚设计更耐用。尺寸40 x 30 x 2cm，重量1.2kg，带挂孔方便收纳。",
      specs_zh: "尺寸：40 x 30 x 2cm；重量：1.2kg",
      evidence: "",
      brand: "",
      category: "home_kitchen",
      existing_listing_en: "",
    },
  },
];
