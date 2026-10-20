import type { Dictionary } from "../en";

export const billing: Dictionary["billing"] = {
  meta: { title: "账单" },
  title: "账单",
  subtitle: "你的套餐、使用次数和付款记录。",
  testMode:
    "付款处于 Stripe 测试模式：请使用卡号 4242 4242 4242 4242，任意未来有效期和任意 CVC。不会产生真实扣款。",
  banners: {
    proSuccess: "欢迎升级 Pro！每月次数正在到账，如未显示，请几秒后刷新。",
    packSuccess: "付款成功，{n} 次使用次数正在到账。如未显示，请几秒后刷新。",
    cancelled: "已取消支付，未产生任何费用。",
  },
  current: {
    title: "当前套餐",
    free: "免费版",
    pro: "Pro",
    credits: "剩余 {n} 次",
    renews: "{date} 自动续订",
    noRenewal: "暂无订阅",
    oneCredit: "1 次 = 一份多平台报告、一次链接体检或一次下架申诉分析。",
  },
  pack: {
    title: "次数包",
    body: "{n} 次，一次性支付 ${price}，永久有效。",
    cta: "购买 {n} 次 — ${price}",
  },
  pro: {
    title: "Pro",
    body: "${price}/月，每月将余额补足到 {n} 次。次数包中的次数永久有效，可随时取消。",
    cta: "升级 Pro — ${price}/月",
    active: "你正在使用 Pro。",
    manage: "管理订阅",
    manageHelp: "在 Stripe 安全页面中更换银行卡、下载发票或取消订阅。",
  },
  compare: "比较所有套餐",
  mock: {
    label: "模拟支付 · 不会真实扣款",
    packTitle: "ShelfPass 次数包",
    proTitle: "ShelfPass Pro",
    perMonth: "/月",
    credits: "{n} 次",
    pay: "支付 ${price}（测试）",
    back: "返回价格页",
  },
  errors: {
    unavailable: "暂时无法打开支付页面。",
    portalUnavailable: "暂时无法打开账单管理页面。",
  },
};
