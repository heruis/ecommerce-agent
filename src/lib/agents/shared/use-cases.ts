import type { Category } from "@/lib/contracts";

/**
 * Where and how a product gets used, by category. ONLY the offline mock
 * agents use this, so mock output reads plausibly for more than cups; live
 * agents infer use cases from the facts.
 */
export interface UseProfile {
  /** Title-case phrase for titles: "Travel and Camping". */
  title: string;
  /** Sentence list: "travel, camping, hiking, the gym and the office". */
  list: string;
  /** Lowercase keyword modifiers. */
  modifiers: [string, string, string];
  hashtags: [string, string];
}

const OUTDOOR: UseProfile = {
  title: "Travel and Camping",
  list: "travel, camping, hiking, the gym and the office",
  modifiers: ["travel", "camping", "hiking"],
  hashtags: ["traveltips", "outdoorgear"],
};

const PROFILES: Partial<Record<Category, UseProfile>> = {
  electronics_accessories: {
    title: "Bedroom, Desk and Gaming Setups",
    list: "bedrooms, desks, TV backs and gaming setups",
    modifiers: ["bedroom", "desk", "gaming"],
    hashtags: ["roomdecor", "desksetup"],
  },
  beauty_personal_care: {
    title: "Daily Routines and Travel",
    list: "morning and evening routines, the gym and travel bags",
    modifiers: ["daily", "travel", "bathroom"],
    hashtags: ["selfcare", "beautyfinds"],
  },
  baby: {
    title: "Home and On-the-Go Parents",
    list: "home, the diaper bag and family trips",
    modifiers: ["toddler", "travel", "nursery"],
    hashtags: ["momhacks", "babymusthaves"],
  },
  toys: {
    title: "Kids, Playtime and Gifts",
    list: "playtime at home, road trips and birthday gifts",
    modifiers: ["kids", "gift", "playroom"],
    hashtags: ["kidstoys", "giftideas"],
  },
  pet_supplies: {
    title: "Dogs and Cats at Home and Away",
    list: "home feeding, walks and road trips with pets",
    modifiers: ["dog", "cat", "travel"],
    hashtags: ["dogsoftiktok", "petmusthaves"],
  },
  clothing_accessories: {
    title: "Everyday Wear and Travel",
    list: "commutes, weekends and travel",
    modifiers: ["everyday", "travel", "gift"],
    hashtags: ["ootd", "accessories"],
  },
  health_household: {
    title: "Home Cleaning and Organizing",
    list: "kitchens, bathrooms, closets and laundry rooms",
    modifiers: ["home", "kitchen", "bathroom"],
    hashtags: ["cleantok", "homeorganization"],
  },
};

export function usageProfile(category: Category): UseProfile {
  return PROFILES[category] ?? OUTDOOR;
}
