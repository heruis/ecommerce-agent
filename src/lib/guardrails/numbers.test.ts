import { describe, expect, it } from "vitest";
import { extractNumbers, unsupportedNumbers } from "./numbers";

const source =
  "食品级硅胶折叠水杯，容量350ml，折叠后仅3cm高，耐温-40℃到200℃。重量85g，尺寸9 x 9 x 11cm。";

describe("unsupportedNumbers", () => {
  it("accepts numbers the seller gave and their unit conversions", () => {
    const text =
      "Collapsible Cup, 350 ml (11.8 oz), folds to 3 cm (1.2 in), 85 g (3 oz), -40 to 200 °C (392 °F), 9 x 9 x 11 cm";
    expect(unsupportedNumbers(text, source)).toEqual([]);
  });

  it("flags specs the seller never gave", () => {
    expect(
      unsupportedNumbers("Keeps drinks cold for 1200 minutes, 5000 mAh battery", source),
    ).toEqual([1200, 5000]);
  });

  it("ignores small counts such as pack sizes", () => {
    expect(unsupportedNumbers("2 pack, 5 colors, 1 lanyard", source)).toEqual([]);
  });
});

describe("extractNumbers", () => {
  it("reads thousands separators and decimal commas", () => {
    expect(extractNumbers("1,000 sheets, 1,5 l, 2.5 kg")).toEqual([1000, 1.5, 2.5]);
  });
});
