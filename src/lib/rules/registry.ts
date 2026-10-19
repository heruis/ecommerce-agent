import type { Platform } from "@/lib/contracts";
import { AMAZON_US } from "./amazon-us";
import { SHOPIFY } from "./shopify";
import { TIKTOK_US } from "./tiktok-us";
import type { PlatformRules } from "./types";

export const RULES: Record<Platform, PlatformRules> = {
  amazon_us: AMAZON_US,
  tiktok_us: TIKTOK_US,
  shopify: SHOPIFY,
};

export function rulesFor(platform: Platform): PlatformRules {
  return RULES[platform];
}

export function platformLabel(platform: Platform): string {
  return RULES[platform].label;
}
