/**
 * Number grounding (output layer): every number in a generated listing should
 * come from the seller's input, verbatim or as a unit conversion of an input
 * number. Catches invented specs such as "5000mAh", "IPX7" or "lasts 24
 * hours", which lead to returns and bad reviews. Adapted from the team's
 * ListLocal prototype (D-022). Owner: WS2.
 */

/** Multipliers between the units sellers use and the ones US listings use. */
const FACTORS = [
  2.54, // in -> cm
  1 / 2.54,
  25.4, // in -> mm
  1 / 25.4,
  2.20462, // kg -> lb
  1 / 2.20462,
  28.3495, // oz -> g
  1 / 28.3495,
  29.5735, // fl oz -> ml
  1 / 29.5735,
  3.78541, // gal -> l
  1 / 3.78541,
  0.453592, // lb -> kg
  1 / 0.453592,
  1000, // l -> ml, kg -> g, m -> mm
  0.001,
  100, // m -> cm
  0.01,
  3.28084, // m -> ft
  1 / 3.28084,
  12, // ft -> in
  1 / 12,
];

/** Numbers in `text` that are not in `source` and are not a unit conversion of one. */
export function unsupportedNumbers(text: string, source: string): number[] {
  const inputNums = extractNumbers(source);
  const allowed = new Set(inputNums);
  const isSupported = (n: number) => {
    // Small counts ("2 pack", "5 colors") are too noisy to police.
    if (n <= 10 && Number.isInteger(n)) return true;
    if (allowed.has(n)) return true;
    for (const x of inputNums) {
      for (const f of FACTORS) {
        const c = x * f;
        // Converted values are usually rounded to one decimal, or to a whole number.
        if (Math.abs(c - n) <= Math.max(0.06, Math.abs(c) * 0.006)) return true;
        if (Number.isInteger(n) && c < 100 && Math.round(c) === n) return true;
      }
      // Celsius <-> Fahrenheit
      if (Math.abs(x * 1.8 + 32 - n) <= 1 || Math.abs((x - 32) / 1.8 - n) <= 1) return true;
    }
    return false;
  };
  return [...new Set(extractNumbers(text))].filter((n) => !isSupported(n));
}

export function extractNumbers(text: string): number[] {
  const nums: number[] = [];
  for (const m of text.matchAll(/\d+(?:[.,]\d+)?/g)) {
    const raw = m[0];
    // "1,000" is a thousands separator; "1,5" is a European decimal.
    const v = /^\d{1,3}(?:,\d{3})+$/.test(raw)
      ? Number(raw.replace(/,/g, ""))
      : Number(raw.replace(",", "."));
    if (Number.isFinite(v)) nums.push(v);
  }
  return nums;
}
