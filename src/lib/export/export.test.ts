import { describe, expect, it } from "vitest";
import { toCsv, toText } from "./index";

describe("CSV export", () => {
  it("uses field keys as headers, escapes quotes and neutralizes spreadsheet formulas", () => {
    const csv = toCsv([
      { key: "item_name", label: "Product title", value: 'He said "hi"' },
      { key: "bullet_point_1", label: "Bullet point 1", value: "=HYPERLINK(1)" },
    ]);
    expect(csv.split("\n")[0]).toBe('"item_name","bullet_point_1"');
    expect(csv).toContain('"He said ""hi"""');
    expect(csv).toContain(`"'=HYPERLINK(1)"`);
  });

  it("marks seller-filled fields in the text export", () => {
    const txt = toText("Amazon US", [{ key: "price", label: "Price", value: "" }]);
    expect(txt).toContain("(fill in yourself)");
  });
});
