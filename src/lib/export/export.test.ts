import { describe, expect, it } from "vitest";
import { toCsv } from "./index";

describe("CSV export", () => {
  it("escapes quotes and neutralizes spreadsheet formulas", () => {
    const csv = toCsv({
      title: 'He said "hi"',
      bullets: ["=HYPERLINK(1)"],
      description: "d",
      search_terms: "s",
    });
    expect(csv).toContain('"He said ""hi"""');
    expect(csv).toContain(`"'=HYPERLINK(1)"`);
  });
});
