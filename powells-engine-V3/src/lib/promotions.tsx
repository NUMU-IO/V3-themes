/**
 * Active store promotions, surfaced inside the theme.
 *
 * The host renders its own announcement bars and popups, but NOT the
 * `auto_discounts` bucket — spend tiers, percentage-over-X, BOGO and multibuy
 * offers. Without these helpers a merchant could configure "spend X, save Y%"
 * and a shopper would only discover it at checkout. Ported from Vionne's
 * `_promotions.ts`, trimmed to the two surfaces this theme has: nudges in the
 * cart and the one-line offer on a book.
 *
 * Money: rule fields are CENTS (`threshold_cents`, `min_subtotal_cents`,
 * `value_cents`, `multibuy_price_cents`) while cart money is MAJOR units — the
 * helpers take a major subtotal and convert once.
 *
 * The request carries the cart's product and category ids. The backend drops
 * catalog-scoped promotions whose targets it cannot match against the cart, so
 * a request without them is charged correctly at checkout but shows nothing
 * here.
 *
 * Every message is generated from the RULE, never typed by a merchant, so it
 * cannot drift from what the engine charges and disappears with the promotion.
 */

import { formatMoney } from "@numueg/theme-kit";
import { useCachedResource, useCart, useLocale } from "@numueg/theme-sdk";
import { fill, useT, type TFunction } from "./i18n";

interface DiscountTier {
  threshold_cents: number;
  percent: number;
}

interface DiscountRule {
  // Open union: the platform adds rule kinds over time.
  kind: string;
  value_cents?: number | null;
  value_percent?: number | null;
  min_subtotal_cents?: number | null;
  buy_quantity?: number | null;
  get_quantity?: number | null;
  get_discount_percent?: number | null;
  tiers?: DiscountTier[];
  multibuy_quantity?: number | null;
  multibuy_price_cents?: number | null;
}

export interface ActivePromo {
  promotion_id: string;
  translated_content?: { headline?: Record<string, string> };
  discount_rule?: DiscountRule | null;
  coupon_code?: string | null;
  /** Catalog scoping. Both empty or absent means the whole store qualifies. */
  eligible_product_ids?: string[];
  eligible_category_ids?: string[];
}

export interface ActivePromotionsData {
  auto_discounts?: ActivePromo[];
}

interface EligibleItem {
  id?: string;
  product_id?: string;
  category_id?: string | null;
  quantity?: number;
}

interface MultibuyOffer {
  promotionId: string;
  quantity: number;
  groupPriceCents: number;
  eligibleProductIds: string[];
  eligibleCategoryIds: string[];
}

interface PromoText {
  t: TFunction;
  locale: string;
  money: (cents: number) => string;
}

export interface PromoNudge {
  id: string;
  message: string;
  /** 0–100 toward the next unlock; null means no meter (BOGO). */
  progress: number | null;
  unlocked: boolean;
}

function multibuyOffers(promos: ActivePromo[]): MultibuyOffer[] {
  const out: MultibuyOffer[] = [];
  for (const p of promos) {
    const r = p.discount_rule;
    if (r?.kind !== "multibuy") continue;
    if (typeof r.multibuy_quantity !== "number" || r.multibuy_quantity < 2) continue;
    if (typeof r.multibuy_price_cents !== "number" || r.multibuy_price_cents <= 0) continue;
    out.push({
      promotionId: p.promotion_id,
      quantity: r.multibuy_quantity,
      groupPriceCents: r.multibuy_price_cents,
      eligibleProductIds: p.eligible_product_ids ?? [],
      eligibleCategoryIds: p.eligible_category_ids ?? [],
    });
  }
  return out;
}

/**
 * Store-wide offers include everything; a scoped offer needs the product or
 * its category named. A scoped offer over a product with no known category is
 * excluded — better to under-promise than advertise a discount the server
 * will not apply.
 */
function offerIncludes(offer: MultibuyOffer, item: EligibleItem): boolean {
  if (offer.eligibleProductIds.length === 0 && offer.eligibleCategoryIds.length === 0) return true;
  const id = item.product_id ?? item.id;
  if (id && offer.eligibleProductIds.includes(id)) return true;
  return Boolean(item.category_id && offer.eligibleCategoryIds.includes(item.category_id));
}

/** Never advertise a bundle that costs more than buying the books outright. */
function beatsUnitPrice(offer: MultibuyOffer, unitPriceMajor: number): boolean {
  return unitPriceMajor > 0 && Math.round(unitPriceMajor * 100) * offer.quantity > offer.groupPriceCents;
}

const headlineOf = (p: ActivePromo, locale: string) =>
  p.translated_content?.headline?.[locale] || p.translated_content?.headline?.en || "";

const sortTiers = (tiers: DiscountTier[]) =>
  [...tiers].sort((a, b) => a.threshold_cents - b.threshold_cents);

function multibuyHeadline(offer: MultibuyOffer, text: PromoText): string {
  return fill(text.t("promo.multibuy", "{{count}} for {{price}}"), {
    count: offer.quantity,
    price: text.money(offer.groupPriceCents),
  });
}

function bogoText(r: DiscountRule, text: PromoText): string {
  const reward =
    (r.get_discount_percent ?? 100) >= 100
      ? text.t("promo.free", "free")
      : fill(text.t("promo.percent_off", "{{percent}}% off"), { percent: r.get_discount_percent ?? 0 });
  return fill(text.t("promo.bogo", "Buy {{buy}}, get {{get}} {{reward}}"), {
    buy: r.buy_quantity ?? 0,
    get: r.get_quantity ?? 0,
    reward,
  });
}

function promoUrl(locale: string, productIds: string[], categoryIds: string[], subtotalMajor: number): string {
  const qs = new URLSearchParams();
  qs.set("page", typeof window === "undefined" ? "/" : window.location.pathname || "/");
  qs.set("locale", locale);
  // Sorted and de-duplicated so the cache key is stable.
  for (const id of [...new Set(productIds.filter(Boolean))].sort()) qs.append("product_ids", id);
  for (const id of [...new Set(categoryIds.filter(Boolean))].sort()) qs.append("category_ids", id);
  if (subtotalMajor > 0) qs.set("subtotal_cents", String(Math.round(subtotalMajor * 100)));
  return `/api/storefront/promotions?${qs.toString()}`;
}

/** Null until loaded, and on any miss — a promotion lookup never breaks a page. */
export function useActivePromotions(
  locale: string,
  cart: { productIds?: Array<string | null | undefined>; categoryIds?: Array<string | null | undefined>; subtotalMajor?: number },
): ActivePromotionsData | null {
  const url = promoUrl(
    locale,
    (cart.productIds ?? []).filter((x): x is string => Boolean(x)),
    (cart.categoryIds ?? []).filter((x): x is string => Boolean(x)),
    cart.subtotalMajor ?? 0,
  );
  const { data } = useCachedResource<ActivePromotionsData | null>(
    `pw:promos:${url}`,
    async (signal) => {
      try {
        const res = await fetch(url, { credentials: "include", signal });
        if (!res.ok) return null;
        const json = (await res.json()) as { data?: ActivePromotionsData } | null;
        return json?.data ?? null;
      } catch {
        return null;
      }
    },
    { initialData: null },
  );
  return data ?? null;
}

function ruleNudge(
  p: ActivePromo,
  subtotalCents: number,
  skipFreeShipping: boolean,
  text: PromoText,
): PromoNudge | null {
  const r = p.discount_rule;
  if (!r) return null;
  const { t, money } = text;
  const id = p.promotion_id;
  const headline = headlineOf(p, text.locale);

  if (r.kind === "tiered" && r.tiers?.length) {
    const tiers = sortTiers(r.tiers);
    const next = tiers.find((tier) => tier.threshold_cents > subtotalCents);
    if (next) {
      return {
        id,
        message: fill(t("promo.tier_more", "Add {{amount}} more to unlock {{percent}}% off"), {
          amount: money(next.threshold_cents - subtotalCents),
          percent: next.percent,
        }),
        progress: Math.min(100, (subtotalCents / next.threshold_cents) * 100),
        unlocked: false,
      };
    }
    return {
      id,
      message: fill(t("promo.unlocked", "{{off}} off unlocked — applied at checkout"), {
        off: `${tiers[tiers.length - 1].percent}%`,
      }),
      progress: 100,
      unlocked: true,
    };
  }

  if ((r.kind === "percentage" || r.kind === "fixed") && r.min_subtotal_cents) {
    const off = r.kind === "percentage" ? `${r.value_percent ?? 0}%` : money(r.value_cents ?? 0);
    if (subtotalCents < r.min_subtotal_cents) {
      return {
        id,
        message: fill(t("promo.min_more", "Add {{amount}} more to get {{off}} off"), {
          amount: money(r.min_subtotal_cents - subtotalCents),
          off,
        }),
        progress: Math.min(100, (subtotalCents / r.min_subtotal_cents) * 100),
        unlocked: false,
      };
    }
    return {
      id,
      message: fill(t("promo.unlocked", "{{off}} off unlocked — applied at checkout"), { off }),
      progress: 100,
      unlocked: true,
    };
  }

  if (r.kind === "bogo" && r.buy_quantity && r.get_quantity) {
    return { id, message: headline || bogoText(r, text), progress: null, unlocked: false };
  }

  if (r.kind === "free_shipping" && !skipFreeShipping && r.min_subtotal_cents) {
    if (subtotalCents < r.min_subtotal_cents) {
      return {
        id,
        message: fill(t("promo.ship_more", "Add {{amount}} more to get free shipping"), {
          amount: money(r.min_subtotal_cents - subtotalCents),
        }),
        progress: Math.min(100, (subtotalCents / r.min_subtotal_cents) * 100),
        unlocked: false,
      };
    }
    return {
      id,
      message: t("promo.ship_unlocked", "You've earned free shipping!"),
      progress: 100,
      unlocked: true,
    };
  }

  return headline ? { id, message: headline, progress: null, unlocked: false } : null;
}

/**
 * Every active offer, described against the cart, most actionable first:
 * multibuy (a countable number of books away), then spend thresholds the
 * shopper can still progress on, then the static ones.
 */
export function cartNudges(
  promos: ActivePromo[] | undefined,
  ctx: PromoText & {
    subtotalMajor: number;
    skipFreeShipping: boolean;
    cartItems: EligibleItem[];
    /** The engine's own savings — never recompute a discount in the theme. */
    appliedPromotions?: Array<{ id: string; amount: number }>;
  },
): PromoNudge[] {
  if (!promos?.length) return [];
  const subtotalCents = Math.round(ctx.subtotalMajor * 100);
  const out: PromoNudge[] = [];

  const multibuyIds = new Set<string>();
  for (const offer of multibuyOffers(promos)) {
    multibuyIds.add(offer.promotionId);
    const headline = multibuyHeadline(offer, ctx);
    // Units, not lines — three copies of one book is a valid trio.
    const units = ctx.cartItems.reduce(
      (n, item) => (offerIncludes(offer, item) ? n + (item.quantity ?? 0) : n),
      0,
    );
    if (units >= offer.quantity) {
      const saved = ctx.appliedPromotions?.find((p) => p?.id === offer.promotionId)?.amount;
      out.push({
        id: offer.promotionId,
        message:
          typeof saved === "number" && saved > 0
            ? fill(ctx.t("promo.saved", "{{headline}} — you saved {{amount}}"), {
                headline,
                amount: ctx.money(Math.round(saved * 100)),
              })
            : headline,
        progress: 100,
        unlocked: true,
      });
    } else {
      const remainder = units % offer.quantity;
      out.push({
        id: offer.promotionId,
        message: fill(ctx.t("promo.multibuy_more", "Add {{count}} more to get {{headline}}"), {
          count: offer.quantity - remainder,
          headline,
        }),
        progress: (remainder / offer.quantity) * 100,
        unlocked: false,
      });
    }
  }

  const RANK: Record<string, number> = { tiered: 0, percentage: 1, fixed: 1, free_shipping: 2, bogo: 3 };
  const ordered = promos
    .filter((p) => !multibuyIds.has(p.promotion_id))
    .sort((a, b) => (RANK[a.discount_rule?.kind ?? ""] ?? 9) - (RANK[b.discount_rule?.kind ?? ""] ?? 9));
  for (const p of ordered) {
    const nudge = ruleNudge(p, subtotalCents, ctx.skipFreeShipping, ctx);
    if (nudge) out.push(nudge);
  }

  // Duplicated rules phrase to the same sentence; showing it twice reads as a bug.
  const seen = new Set<string>();
  return out.filter((n) => !seen.has(n.message) && Boolean(seen.add(n.message)));
}

/** One compact offer line for a book ("3 for EGP 500" / "Buy 2, get 1 free"). */
export function bookOfferLine(
  promos: ActivePromo[] | undefined,
  ctx: PromoText & { unitPriceMajor: number; product: EligibleItem },
): string | null {
  if (!promos?.length) return null;

  // Multibuy leads: it is about THIS book, and the quantity is right there.
  for (const offer of multibuyOffers(promos)) {
    if (!offerIncludes(offer, ctx.product) || !beatsUnitPrice(offer, ctx.unitPriceMajor)) continue;
    return multibuyHeadline(offer, ctx);
  }

  const RANK: Record<string, number> = { bogo: 0, tiered: 1, percentage: 2, fixed: 2 };
  const ordered = [...promos].sort(
    (a, b) => (RANK[a.discount_rule?.kind ?? ""] ?? 9) - (RANK[b.discount_rule?.kind ?? ""] ?? 9),
  );
  for (const p of ordered) {
    const r = p.discount_rule;
    const headline = headlineOf(p, ctx.locale);
    if (!r) {
      if (headline) return headline;
      continue;
    }
    if (r.kind === "tiered" && r.tiers?.length) {
      const tier = sortTiers(r.tiers)[0];
      return fill(ctx.t("promo.spend_save", "Spend {{amount}}, save {{percent}}%"), {
        amount: ctx.money(tier.threshold_cents),
        percent: tier.percent,
      });
    }
    if (r.kind === "percentage" && r.min_subtotal_cents) {
      return fill(ctx.t("promo.percent_over", "{{percent}}% off orders over {{amount}}"), {
        percent: r.value_percent ?? 0,
        amount: ctx.money(r.min_subtotal_cents),
      });
    }
    if (r.kind === "bogo" && r.buy_quantity && r.get_quantity) return bogoText(r, ctx);
    if (headline) return headline;
  }
  return null;
}

/** The offer line for one book, looked up against that book. */
export function useBookOffer(productId: string, categoryId: string, unitPriceMajor: number, currency: string) {
  const t = useT();
  const locale = useLocale();
  const promos = useActivePromotions(locale, { productIds: [productId], categoryIds: [categoryId] });
  return bookOfferLine(promos?.auto_discounts, {
    t,
    locale,
    money: (cents) => formatMoney(cents / 100, currency),
    unitPriceMajor,
    product: { product_id: productId, category_id: categoryId || null },
  });
}

/** The nudge list for the cart page and the cart drawer. */
export function CartNudges({ skipFreeShipping = false }: { skipFreeShipping?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const { cart } = useCart();
  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const promos = useActivePromotions(locale, {
    productIds: items.map((item) => item.product_id),
    categoryIds: items.map((item) => item.category_id),
    subtotalMajor: subtotal,
  });

  if (items.length === 0) return null;
  const currency = cart?.currency ?? "";
  const nudges = cartNudges(promos?.auto_discounts, {
    t,
    locale,
    money: (cents) => formatMoney(cents / 100, currency),
    subtotalMajor: subtotal,
    skipFreeShipping,
    cartItems: items,
    appliedPromotions: cart?.applied_promotions,
  });
  if (nudges.length === 0) return null;

  return (
    <ul className="pw-nudges">
      {nudges.map((nudge) => (
        <li key={nudge.id + nudge.message} className="pw-nudge" data-unlocked={nudge.unlocked || undefined}>
          <span>{nudge.message}</span>
          {nudge.progress !== null && (
            <span className="track" aria-hidden="true">
              <span className="fill" style={{ width: `${nudge.progress}%` }} />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
