/**
 * Small Chinese -> English dictionary used ONLY by the offline mock agents so
 * the demo works without an API key. The live agents translate with Claude.
 */
export const PRODUCT_TERMS: [RegExp, string][] = [
  [/折叠|可折叠/, "collapsible"],
  [/硅胶/, "silicone"],
  [/食品级/, "food-grade"],
  [/不锈钢/, "stainless steel"],
  [/保温杯|保温瓶/, "insulated bottle"],
  [/水杯|杯子|杯/, "cup"],
  [/水瓶|水壶/, "water bottle"],
  [/瑜伽垫/, "yoga mat"],
  [/手机壳/, "phone case"],
  [/台灯/, "desk lamp"],
  [/宠物碗|狗碗|猫碗/, "pet bowl"],
  [/奶瓶/, "baby bottle"],
  [/竹制|竹子|竹/, "bamboo"],
  [/砧板|菜板/, "cutting board"],
  [/收纳盒|收纳箱/, "storage box"],
  [/背包/, "backpack"],
  [/毛巾/, "towel"],
  [/牙刷/, "toothbrush"],
  [/梳子/, "comb"],
  [/玩具/, "toy"],
  [/数据线/, "charging cable"],
  [/充电宝|移动电源/, "power bank"],
  [/耳机/, "earbuds"],
  [/户外/, "outdoor"],
  [/旅行|旅游/, "travel"],
  [/露营/, "camping"],
  [/徒步|登山/, "hiking"],
  [/便携/, "portable"],
  [/防漏/, "leak-proof"],
  [/防滑/, "non-slip"],
  [/加厚/, "extra-thick"],
  [/挂绳/, "lanyard"],
  [/盖子|带盖/, "lid"],
  [/TPE/, "TPE"],
  [/LED/, "LED"],
];

export const MATERIALS: [RegExp, string][] = [
  [/食品级硅胶/, "food-grade silicone"],
  [/硅胶/, "silicone"],
  [/304不锈钢/, "304 stainless steel"],
  [/316不锈钢/, "316 stainless steel"],
  [/不锈钢/, "stainless steel"],
  [/TPE/, "TPE"],
  [/竹/, "bamboo"],
  [/ABS/, "ABS plastic"],
  [/PP/, "polypropylene (PP)"],
  [/棉/, "cotton"],
  [/铝合金/, "aluminum alloy"],
];

export const COLORS: [RegExp, string][] = [
  [/黑色/, "black"],
  [/白色/, "white"],
  [/蓝色/, "blue"],
  [/绿色/, "green"],
  [/粉色/, "pink"],
  [/灰色/, "gray"],
  [/红色/, "red"],
];

export function translateTerms(text: string, dict: [RegExp, string][] = PRODUCT_TERMS): string[] {
  const out: string[] = [];
  for (const [re, en] of dict) if (re.test(text) && !out.includes(en)) out.push(en);
  return out;
}
