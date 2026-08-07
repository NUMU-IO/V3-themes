"use client";
/**
 * _promotions — client hook + helpers for the store's ACTIVE promotions (A3).
 *
 * Data path: the storefront host already proxies the backend's
 * `/promotions/active` at `GET /api/storefront/promotions?page=..&locale=..`
 * (always 200 `{ data }`, null-safe). The host renders announcement bars,
 * popups, cookie banner and floating widgets itself — what it does NOT render
 * is the `auto_discounts` bucket (spend-tier / percentage / BOGO offers), so a
 * merchant could configure "spend X save Y%" and the customer never saw it.
 * These helpers surface that bucket inside the theme (cart nudge + PDP line).
 *
 * Money note: rule fields are in CENTS (`threshold_cents`,
 * `min_subtotal_cents`, `value_cents`) while cart money reaches the theme in
 * MAJOR units — helpers take a major-unit subtotal and convert internally.
 */
import { useEffect, useState } from "react";
import * as sdk from "@numueg/theme-sdk";

export interface DiscountTier {
  threshold_cents: number;
  percent: number;
}

export interface DiscountRule {
  // Open union: the platform adds rule kinds over time and this theme must
  // keep rendering when it meets one it was built before.
  kind:
    | "percentage"
    | "fixed"
    | "free_shipping"
    | "bogo"
    | "tiered"
    | "multibuy"
    | (string & {});
  value_cents?: number | null;
  value_percent?: number | null;
  min_subtotal_cents?: number | null;
  buy_quantity?: number | null;
  get_quantity?: number | null;
  get_discount_percent?: number | null;
  tiers?: DiscountTier[];
  /** MULTIBUY: N items for a fixed total of `multibuy_price_cents`. */
  multibuy_quantity?: number | null;
  multibuy_price_cents?: number | null;
}

/**
 * SDK promotion primitives, resolved ONCE at module load with a local
 * fallback.
 *
 * Deliberately a namespace import, not `import { multibuyOffers } from …`.
 * Themes are federated: a named import of an export the host's runtime SDK
 * doesn't serve yet fails at ESM **link** time, so the whole theme fails to
 * mount and the storefront goes blank — the worst failure mode this fleet
 * has. A namespace import always links; a missing member is just
 * `undefined`, so an out-of-order deploy degrades to the theme-local copy
 * instead of a white screen.
 *
 * Resolved at module scope (not per render) so the hook identity is stable
 * and the rules of hooks hold.
 */
type MultibuyOffer = {
  promotionId: string;
  quantity: number;
  groupPriceCents: number;
  groupPriceMajor: number;
  eligibleProductIds?: string[];
  eligibleCategoryIds?: string[];
  isStoreWide?: boolean;
};

/** A cart line / product, as much of it as eligibility needs. */
type EligibleItem = {
  id?: string;
  product_id?: string;
  category_id?: string | null;
  quantity?: number;
};

/**
 * Does this product take part in the offer? Store-wide offers include
 * everything; otherwise the product must be named or sit in a named category.
 * A scoped offer over a product with no known category returns false — better
 * to under-promise than to advertise a discount the server won't apply.
 */
export function offerIncludesProduct(
  offer: MultibuyOffer,
  item: EligibleItem | null | undefined,
): boolean {
  if (!item) return false;
  if (offer.isStoreWide !== false) {
    // Undefined (older host SDK, which doesn't send scoping) is treated as
    // store-wide — that's what themes counted before, so nothing regresses.
    if (
      !offer.eligibleProductIds?.length &&
      !offer.eligibleCategoryIds?.length
    ) {
      return true;
    }
  }
  const id = item.product_id ?? item.id;
  if (id && offer.eligibleProductIds?.includes(id)) return true;
  const category = item.category_id;
  return Boolean(category && offer.eligibleCategoryIds?.includes(category));
}

/** Cart UNITS that actually qualify — not lines, and not the whole cart. */
export function eligibleUnits(
  offer: MultibuyOffer,
  items: EligibleItem[] | undefined,
): number {
  return (items ?? []).reduce(
    (n, it) => (offerIncludesProduct(offer, it) ? n + (it?.quantity || 0) : n),
    0,
  );
}

const sdkAny = sdk as unknown as Record<string, unknown>;

/** Local mirror of the SDK's `multibuyOffers`, used when the host is older. */
function localMultibuyOffers(promos: ActivePromo[] | undefined): MultibuyOffer[] {
  const out: MultibuyOffer[] = [];
  for (const p of promos ?? []) {
    const r = p?.discount_rule;
    if (!r || r.kind !== "multibuy") continue;
    const n = r.multibuy_quantity;
    const cents = r.multibuy_price_cents;
    if (typeof n !== "number" || n < 2) continue;
    if (typeof cents !== "number" || cents <= 0) continue;
    const prodIds = p.eligible_product_ids ?? [];
    const catIds = p.eligible_category_ids ?? [];
    out.push({
      promotionId: p.promotion_id,
      quantity: n,
      groupPriceCents: cents,
      groupPriceMajor: cents / 100,
      eligibleProductIds: prodIds,
      eligibleCategoryIds: catIds,
      isStoreWide: prodIds.length === 0 && catIds.length === 0,
    });
  }
  return out;
}

export function multibuyOffers(
  promos: ActivePromo[] | undefined,
): MultibuyOffer[] {
  const fn = sdkAny.multibuyOffers as
    | ((p: unknown) => MultibuyOffer[])
    | undefined;
  return typeof fn === "function"
    ? fn(promos as unknown)
    : localMultibuyOffers(promos);
}

/**
 * "3 for EGP 650" / "3 قطع بـ 650 ج.م" — generated from the RULE, never
 * typed by a merchant, so it can't drift from what the engine charges and
 * it disappears with the promotion.
 */
export function multibuyHeadline(
  offer: MultibuyOffer,
  locale: string,
  currency: string,
): string {
  const price = fmt(offer.groupPriceCents, currency, locale);
  return locale === "ar"
    ? `${offer.quantity} قطع بـ ${price}`
    : `${offer.quantity} for ${price}`;
}

/** Never advertise a bundle that costs more than buying the items outright. */
export function multibuyBeatsUnitPrice(
  offer: MultibuyOffer,
  unitPriceMajor: number | null | undefined,
): boolean {
  if (typeof unitPriceMajor !== "number" || unitPriceMajor <= 0) return false;
  return Math.round(unitPriceMajor * 100) * offer.quantity > offer.groupPriceCents;
}

export interface ActivePromo {
  promotion_id: string;
  translated_content?: { headline?: Record<string, string> };
  discount_rule?: DiscountRule | null;
  coupon_code?: string | null;
  /** Catalog scoping. Both empty/absent ⇒ the whole store qualifies. */
  eligible_product_ids?: string[];
  eligible_category_ids?: string[];
}

interface ActivePromotionsData {
  auto_discounts?: ActivePromo[];
  discount_codes_visible?: ActivePromo[];
}

/** What the shopper is holding, so catalog-SCOPED offers survive eligibility. */
export interface PromoCartContext {
  productIds?: (string | null | undefined)[];
  categoryIds?: (string | null | undefined)[];
  /** Major units — converted to cents here, matching the rest of this module. */
  subtotalMajor?: number;
}

const PROMO_TTL_MS = 60_000; // mirrors the API's own `cache_ttl_seconds: 60`
const promoCache = new Map<string, { at: number; data: ActivePromotionsData | null }>();
const promoInflight = new Map<string, Promise<ActivePromotionsData | null>>();

/** Build the request URL. Stable ordering so the cache key is deterministic. */
function promoUrl(page: string, locale: string, cart?: PromoCartContext): string {
  const qs = new URLSearchParams();
  qs.set("page", page);
  qs.set("locale", locale);
  const uniq = (xs: (string | null | undefined)[] | undefined) =>
    [...new Set((xs ?? []).filter((x): x is string => Boolean(x)))].sort();
  for (const id of uniq(cart?.productIds)) qs.append("product_ids", id);
  for (const id of uniq(cart?.categoryIds)) qs.append("category_ids", id);
  if (typeof cart?.subtotalMajor === "number" && cart.subtotalMajor > 0) {
    qs.set("subtotal_cents", String(Math.round(cart.subtotalMajor * 100)));
  }
  return `/api/storefront/promotions?${qs.toString()}`;
}

/**
 * Fetch the active promotions for a page. Null until loaded / on any miss.
 *
 * Deliberately NOT delegating to the SDK's `useActivePromotions` any more. That
 * one takes `(page, locale)` and nothing else, so it cannot pass the cart —
 * and without the cart the backend's eligibility checker drops every
 * catalog-scoped promotion before it reaches the response
 * (`PromotionEligibilityChecker._target_matches` resolves PRODUCT / CATEGORY
 * targets against `cart_product_ids` / `cart_category_ids`; an untagged
 * inclusion target with an empty cart can never match). A merchant's
 * "20% off this category" offer was therefore charged correctly at checkout
 * while being invisible in the cart.
 *
 * The module-level cache keeps the dedupe the SDK hook provided: several
 * sections on one page (header, mini-cart, cart body, PDP) ask the same
 * question and share one request for its 60s lifetime.
 */
export function useActivePromotions(
  page: string,
  locale: string,
  cart?: PromoCartContext,
): ActivePromotionsData | null {
  const url = promoUrl(page, locale, cart);
  const cached = promoCache.get(url);
  const fresh = cached && Date.now() - cached.at < PROMO_TTL_MS ? cached.data : null;
  const [data, setData] = useState<ActivePromotionsData | null>(fresh);

  useEffect(() => {
    let cancelled = false;
    const hit = promoCache.get(url);
    if (hit && Date.now() - hit.at < PROMO_TTL_MS) {
      setData(hit.data);
      return;
    }
    let req = promoInflight.get(url);
    if (!req) {
      req = fetch(url, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => (j?.data as ActivePromotionsData) ?? null)
        // A promo miss must never throw in the UI — the cart still works, it
        // just shows no offers.
        .catch(() => null)
        .then((d) => {
          promoCache.set(url, { at: Date.now(), data: d });
          promoInflight.delete(url);
          return d;
        });
      promoInflight.set(url, req);
    }
    req.then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return data;
}

/**
 * The path to resolve promotions against.
 *
 * Four surfaces used to hardcode four DIFFERENT keys for the same question —
 * the banner asked for `"/"`, the cart page for `"/cart"`, the header for
 * `"cart"` (no slash) and the PDP for `"/product"`. Harmless only because
 * AUTOMATIC-surface promotions skip display-rule matching entirely
 * (`promotion_resolver._first_matching_display`); the moment a merchant
 * page-targets a promotion the four surfaces disagree about which page the
 * shopper is on, and the header — which renders on EVERY route — is wrong
 * almost everywhere by construction.
 *
 * The backend field is `VisitorContextInput.page_path`, so the honest answer is
 * the real path. SSR-safe: falls back to "/" when there is no window.
 */
export function promoPagePath(): string {
  if (typeof window === "undefined") return "/";
  try {
    return window.location.pathname || "/";
  } catch {
    return "/";
  }
}

export interface PromoNudgeInfo {
  /** Stable identity for React keys + dedupe. Null for synthesised lines. */
  promotionId: string | null;
  /** Ready-to-render message. `{amount}` was already substituted. */
  message: string;
  /** 0-100 progress toward the next unlock; null = no meter (e.g. BOGO). */
  progressPct: number | null;
  /** True when the offer's condition is currently met. */
  unlocked: boolean;
  couponCode: string | null;
}

/** A merchant-published discount CODE the shopper is meant to see and type. */
export interface VisibleCodeOffer {
  promotionId: string;
  code: string;
  /** Merchant headline when set, else a generated description of the rule. */
  message: string;
}

const fmt = (cents: number, currency: string, locale: string) =>
  new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    style: "currency",
    currency: currency || "EGP",
    maximumFractionDigits: 0,
  }).format(cents / 100);

/** Describe ONE multibuy offer against the current cart. */
function multibuyNudge(
  offer: ReturnType<typeof multibuyOffers>[number],
  locale: string,
  currency: string,
  unitsInCart: number | undefined,
  appliedPromotions: { id: string; amount: number }[] | undefined,
  cartItems: EligibleItem[] | undefined,
): PromoNudgeInfo {
  const ar = locale === "ar";
  const headline = multibuyHeadline(offer, locale, currency);
  // Count only units the offer actually covers. `cartItems` wins when present
  // because it can see scoping; the bare number is the fallback.
  const units = cartItems ? eligibleUnits(offer, cartItems) : (unitsInCart ?? 0);
  const remainder = units % offer.quantity;
  const groups = Math.floor(units / offer.quantity);
  const applied = (appliedPromotions ?? []).find(
    (p) => p && p.id === offer.promotionId,
  );

  if (groups > 0) {
    const saved = applied?.amount;
    const savedText =
      typeof saved === "number" && saved > 0
        ? fmt(Math.round(saved * 100), currency, locale)
        : null;
    return {
      promotionId: offer.promotionId,
      couponCode: null,
      message: savedText
        ? ar
          ? `${headline} — وفّرتي ${savedText}`
          : `${headline} — you saved ${savedText}`
        : headline,
      progressPct: 100,
      unlocked: true,
    };
  }
  const need = offer.quantity - remainder;
  return {
    promotionId: offer.promotionId,
    couponCode: null,
    message: ar
      ? `ضيفي ${need} كمان وتاخدي ${headline}`
      : `Add ${need} more to get ${headline}`,
    progressPct: Math.min(100, (remainder / offer.quantity) * 100),
    unlocked: false,
  };
}

/** Describe ONE non-multibuy promotion. Null when it can't be phrased. */
function rulePromoNudge(
  p: ActivePromo,
  subtotalCents: number,
  currency: string,
  locale: string,
  skipFreeShipping: boolean,
): PromoNudgeInfo | null {
  const r = p.discount_rule;
  if (!r) return null;
  const ar = locale === "ar";
  const headline =
    p.translated_content?.headline?.[locale] || p.translated_content?.headline?.en;
  const base = { promotionId: p.promotion_id, couponCode: p.coupon_code ?? null };

  if (r.kind === "tiered" && r.tiers?.length) {
    const sorted = [...r.tiers].sort((a, b) => a.threshold_cents - b.threshold_cents);
    const next = sorted.find((t) => t.threshold_cents > subtotalCents);
    const current = [...sorted].reverse().find((t) => t.threshold_cents <= subtotalCents);
    if (next) {
      const remaining = fmt(next.threshold_cents - subtotalCents, currency, locale);
      return {
        ...base,
        message: ar
          ? `ضيفي ${remaining} كمان وتفتحي خصم ${next.percent}%`
          : `Add ${remaining} more to unlock ${next.percent}% off`,
        progressPct: Math.min(100, (subtotalCents / next.threshold_cents) * 100),
        unlocked: false,
      };
    }
    if (current) {
      return {
        ...base,
        message: ar
          ? `خصم ${current.percent}% هيتطبق عند الدفع`
          : `${current.percent}% off unlocked — applied at checkout`,
        progressPct: 100,
        unlocked: true,
      };
    }
  }

  if ((r.kind === "percentage" || r.kind === "fixed") && r.min_subtotal_cents) {
    const off =
      r.kind === "percentage"
        ? `${r.value_percent}%`
        : fmt(r.value_cents ?? 0, currency, locale);
    if (subtotalCents < r.min_subtotal_cents) {
      const remaining = fmt(r.min_subtotal_cents - subtotalCents, currency, locale);
      return {
        ...base,
        message: ar
          ? `ضيفي ${remaining} كمان وتاخدي خصم ${off}`
          : `Add ${remaining} more to get ${off} off`,
        progressPct: Math.min(100, (subtotalCents / r.min_subtotal_cents) * 100),
        unlocked: false,
      };
    }
    return {
      ...base,
      message: ar ? `خصم ${off} هيتطبق عند الدفع` : `${off} off unlocked — applied at checkout`,
      progressPct: 100,
      unlocked: true,
    };
  }

  if (r.kind === "bogo" && r.buy_quantity && r.get_quantity) {
    const freeish =
      (r.get_discount_percent ?? 100) >= 100
        ? ar ? "ببلاش" : "free"
        : `${r.get_discount_percent}% ${ar ? "خصم" : "off"}`;
    return {
      ...base,
      message:
        headline ||
        (ar
          ? `اشتري ${r.buy_quantity} وخدي ${r.get_quantity} ${freeish}`
          : `Buy ${r.buy_quantity}, get ${r.get_quantity} ${freeish}`),
      progressPct: null,
      unlocked: false,
    };
  }

  if (r.kind === "free_shipping" && !skipFreeShipping && r.min_subtotal_cents) {
    if (subtotalCents < r.min_subtotal_cents) {
      const remaining = fmt(r.min_subtotal_cents - subtotalCents, currency, locale);
      return {
        ...base,
        message: ar
          ? `ضيفي ${remaining} كمان وتحصلي على شحن مجاني`
          : `Add ${remaining} more to get free shipping`,
        progressPct: Math.min(100, (subtotalCents / r.min_subtotal_cents) * 100),
        unlocked: false,
      };
    }
    return {
      ...base,
      message: ar ? "كسبتي الشحن المجاني!" : "You've earned free shipping!",
      progressPct: 100,
      unlocked: true,
    };
  }

  // Rule kind we can't phrase — fall back to the merchant headline if any.
  if (headline) return { ...base, message: headline, progressPct: null, unlocked: false };
  return null;
}

/**
 * EVERY active auto-discount offer, described against the current cart.
 *
 * The cart used to render exactly one line: `bestCartNudge` ranked the
 * promotions and `return`ed on the first match, so a store running three
 * offers advertised one and the other two were invisible to the shopper who
 * qualified for them. This returns the whole set, most-actionable first, and
 * the single-slot surfaces (PDP pill, mobile menu) keep taking `[0]`.
 *
 * Ordering: multibuy leads — the shopper is a countable number of items away
 * from it, not a fuzzy spend amount — then the rules the shopper can still make
 * progress on (tiered / spend-threshold), then the static ones.
 */
export function cartNudges(
  promos: ActivePromo[] | undefined,
  subtotalMajor: number,
  currency: string,
  locale: string,
  skipFreeShipping: boolean,
  /**
   * Units in the cart, for multibuy progress ("add 1 more to get 3 for
   * EGP 650"). Counts UNITS not lines — three of one product is a valid
   * trio, exactly how the engine scores it. Omit and multibuy is skipped
   * rather than guessed at.
   */
  unitsInCart?: number,
  /**
   * The engine's own `cart.applied_promotions`, so an unlocked offer shows
   * the REAL saving. Never recompute a discount in the theme — the server
   * prices the cart and this is what it charged.
   */
  appliedPromotions?: { id: string; amount: number }[],
  /**
   * The cart lines, so a SCOPED offer counts only qualifying units. Without
   * these a "3 for EGP 650 on scarves" offer counts every unit in the cart
   * and tells a shopper holding one ineligible item to "add 2 more" — then
   * the discount doesn't apply. Falls back to `unitsInCart` when absent.
   */
  cartItems?: EligibleItem[],
): PromoNudgeInfo[] {
  if (!promos?.length) return [];
  const subtotalCents = Math.round(subtotalMajor * 100);
  const out: PromoNudgeInfo[] = [];

  // Multibuy first — the hero deal.
  const multibuyIds = new Set<string>();
  if (typeof unitsInCart === "number" || cartItems) {
    for (const offer of multibuyOffers(promos)) {
      multibuyIds.add(offer.promotionId);
      out.push(
        multibuyNudge(offer, locale, currency, unitsInCart, appliedPromotions, cartItems),
      );
    }
  }

  // Then everything else, actionable-first.
  const RANK: Record<string, number> = {
    tiered: 0,
    percentage: 1,
    fixed: 1,
    free_shipping: 2,
    bogo: 3,
  };
  const ordered = [...promos]
    .filter((p) => !multibuyIds.has(p.promotion_id))
    .sort(
      (a, b) =>
        (RANK[a.discount_rule?.kind ?? ""] ?? 9) -
        (RANK[b.discount_rule?.kind ?? ""] ?? 9),
    );
  for (const p of ordered) {
    const nudge = rulePromoNudge(p, subtotalCents, currency, locale, skipFreeShipping);
    if (nudge) out.push(nudge);
  }

  // Two promotions can phrase to the same sentence (e.g. duplicated rules).
  // Showing the identical line twice reads as a bug, so collapse by message.
  const seen = new Set<string>();
  return out.filter((n) => {
    if (seen.has(n.message)) return false;
    seen.add(n.message);
    return true;
  });
}

/**
 * The single most actionable nudge — for surfaces with room for exactly one
 * (the PDP, the mobile menu). Thin wrapper over `cartNudges` so the two can
 * never disagree about ranking.
 */
export function bestCartNudge(
  promos: ActivePromo[] | undefined,
  subtotalMajor: number,
  currency: string,
  locale: string,
  skipFreeShipping: boolean,
  unitsInCart?: number,
  appliedPromotions?: { id: string; amount: number }[],
  cartItems?: EligibleItem[],
): PromoNudgeInfo | null {
  return (
    cartNudges(
      promos,
      subtotalMajor,
      currency,
      locale,
      skipFreeShipping,
      unitsInCart,
      appliedPromotions,
      cartItems,
    )[0] ?? null
  );
}

/**
 * Merchant-published discount CODES the shopper is meant to see and type.
 *
 * The host has always returned this bucket alongside `auto_discounts` and the
 * theme has always thrown it away — a merchant could publish "SAVE20, 20% off"
 * as a visible code and no storefront surface ever printed it. Distinct from an
 * auto-discount: it needs the shopper to copy a code at checkout, so it renders
 * as a code chip rather than a progress nudge.
 */
export function visibleCodeOffers(
  promos: ActivePromo[] | undefined,
  currency: string,
  locale: string,
): VisibleCodeOffer[] {
  if (!promos?.length) return [];
  const ar = locale === "ar";
  const out: VisibleCodeOffer[] = [];
  const seen = new Set<string>();
  for (const p of promos) {
    const code = (p.coupon_code ?? "").trim();
    // No code = nothing the shopper could act on. Skip rather than show a
    // teaser they can't redeem.
    if (!code || seen.has(code.toUpperCase())) continue;
    seen.add(code.toUpperCase());
    const r = p.discount_rule;
    const headline =
      p.translated_content?.headline?.[locale] || p.translated_content?.headline?.en;
    let message = headline ?? "";
    if (!message && r) {
      // Every rule kind the engine can price gets a real sentence. Anything
      // left unhandled falls through to the generic label below rather than
      // inventing terms the checkout wouldn't honour.
      if (r.kind === "percentage" && r.value_percent) {
        message = ar ? `خصم ${r.value_percent}%` : `${r.value_percent}% off`;
      } else if (r.kind === "fixed" && r.value_cents) {
        const amt = fmt(r.value_cents, currency, locale);
        message = ar ? `خصم ${amt}` : `${amt} off`;
      } else if (r.kind === "free_shipping") {
        message = ar ? "شحن مجاني" : "Free shipping";
      } else if (r.kind === "bogo" && r.buy_quantity && r.get_quantity) {
        const freeish =
          (r.get_discount_percent ?? 100) >= 100
            ? ar ? "ببلاش" : "free"
            : `${r.get_discount_percent}% ${ar ? "خصم" : "off"}`;
        message = ar
          ? `اشتري ${r.buy_quantity} وخدي ${r.get_quantity} ${freeish}`
          : `Buy ${r.buy_quantity}, get ${r.get_quantity} ${freeish}`;
      } else if (r.kind === "tiered" && r.tiers?.length) {
        const t = [...r.tiers].sort((a, b) => a.threshold_cents - b.threshold_cents)[0];
        const spend = fmt(t.threshold_cents, currency, locale);
        message = ar
          ? `اصرفي ${spend} ووفّري ${t.percent}%`
          : `Spend ${spend}, save ${t.percent}%`;
      } else if (
        r.kind === "multibuy" &&
        typeof r.multibuy_quantity === "number" &&
        typeof r.multibuy_price_cents === "number"
      ) {
        const price = fmt(r.multibuy_price_cents, currency, locale);
        message = ar
          ? `${r.multibuy_quantity} قطع بـ ${price}`
          : `${r.multibuy_quantity} for ${price}`;
      }
    }
    if (!message) message = ar ? "كود خصم" : "Discount code";
    if (r?.min_subtotal_cents) {
      const min = fmt(r.min_subtotal_cents, currency, locale);
      message += ar ? ` للطلبات فوق ${min}` : ` on orders over ${min}`;
    }
    out.push({ promotionId: p.promotion_id, code, message });
  }
  return out;
}

/**
 * Quantity-stepper hint for BOGO offers (A5). Quantity-aware: below the buy
 * threshold it says how many more to add; at/above it confirms the reward.
 * Only BOGO maps cleanly to the stepper — spend-tier progress lives in the
 * cart/drawer nudge instead.
 */
export function qtyBogoHint(
  promos: ActivePromo[] | undefined,
  quantity: number,
  locale: string,
  currency?: string,
  /** This product + its price, so the hint never promises a bundle it can't
   *  deliver — the same two gates `pdpOfferLine` applies. */
  product?: EligibleItem,
  unitPriceMajor?: number,
): { message: string; qualified: boolean } | null {
  if (!promos?.length) return null;
  const ar = locale === "ar";

  // Multibuy maps onto the stepper even better than BOGO does — the shopper
  // is N−q items away from a fixed bundle price, right where they change q.
  for (const offer of multibuyOffers(promos)) {
    if (product && !offerIncludesProduct(offer, product)) continue;
    if (unitPriceMajor != null && !multibuyBeatsUnitPrice(offer, unitPriceMajor)) {
      continue;
    }
    const headline = multibuyHeadline(offer, locale, currency || "EGP");
    if (quantity >= offer.quantity) {
      return {
        message: ar ? `${headline} هيتطبّق عند الدفع` : `${headline} — applied at checkout`,
        qualified: true,
      };
    }
    const need = offer.quantity - quantity;
    return {
      message: ar
        ? `ضيفي ${need} كمان وتاخدي ${headline}`
        : `Add ${need} more for ${headline}`,
      qualified: false,
    };
  }
  const bogo = promos.find(
    (p) => p.discount_rule?.kind === "bogo" && p.discount_rule.buy_quantity && p.discount_rule.get_quantity,
  )?.discount_rule;
  if (!bogo) return null;
  const buy = bogo.buy_quantity!;
  const get = bogo.get_quantity!;
  const freeish =
    (bogo.get_discount_percent ?? 100) >= 100
      ? ar ? "ببلاش" : "free"
      : `${bogo.get_discount_percent}% ${ar ? "خصم" : "off"}`;
  if (quantity >= buy) {
    return {
      message: ar
        ? `هتاخدي ${get} ${freeish} عند الدفع`
        : `You qualify — ${get} ${freeish} at checkout`,
      qualified: true,
    };
  }
  const need = buy - quantity;
  return {
    message: ar
      ? `ضيفي ${need} كمان وخدي ${get} ${freeish}`
      : `Add ${need} more to get ${get} ${freeish}`,
    qualified: false,
  };
}

/** One compact PDP offer line ("Spend X, save Y%" / "Buy 2 get 1 free"). */
export function pdpOfferLine(
  promos: ActivePromo[] | undefined,
  currency: string,
  locale: string,
  /**
   * This product's unit price in MAJOR units. When supplied, a multibuy
   * pill only shows if N of THIS item actually costs more than the bundle —
   * otherwise we'd advertise a "deal" that's worse than just buying them,
   * and the engine would refuse to apply it anyway.
   */
  unitPriceMajor?: number,
  /** This product, so a scoped offer isn't advertised on an item it excludes. */
  product?: EligibleItem,
): string | null {
  if (!promos?.length) return null;
  const ar = locale === "ar";

  // Multibuy leads on a PDP: it's about THIS product, and it's the one offer
  // the shopper can act on by changing the quantity in front of them.
  for (const offer of multibuyOffers(promos)) {
    // Two independent gates, both required:
    //   • the product must be IN the offer's scope, and
    //   • N of it must actually cost more than the bundle.
    if (product && !offerIncludesProduct(offer, product)) continue;
    if (unitPriceMajor != null && !multibuyBeatsUnitPrice(offer, unitPriceMajor)) {
      continue;
    }
    return multibuyHeadline(offer, locale, currency);
  }
  // On a PDP the strongest nudge is the one about THIS purchase: BOGO ("buy
  // one more of this") beats spend-tiers, which beat flat thresholds.
  const RANK: Record<string, number> = { bogo: 0, tiered: 1, percentage: 2, fixed: 2 };
  const ordered = [...promos].sort(
    (a, b) => (RANK[a.discount_rule?.kind ?? ""] ?? 9) - (RANK[b.discount_rule?.kind ?? ""] ?? 9),
  );
  for (const p of ordered) {
    const r = p.discount_rule;
    const headline = p.translated_content?.headline?.[locale] || p.translated_content?.headline?.en;
    if (!r) {
      if (headline) return headline;
      continue;
    }
    if (r.kind === "tiered" && r.tiers?.length) {
      const t = [...r.tiers].sort((a, b) => a.threshold_cents - b.threshold_cents)[0];
      const spend = fmt(t.threshold_cents, currency, locale);
      return ar ? `اصرفي ${spend} ووفّري ${t.percent}%` : `Spend ${spend}, save ${t.percent}%`;
    }
    if (r.kind === "percentage" && r.min_subtotal_cents) {
      const spend = fmt(r.min_subtotal_cents, currency, locale);
      return ar
        ? `خصم ${r.value_percent}% للطلبات فوق ${spend}`
        : `${r.value_percent}% off orders over ${spend}`;
    }
    if (r.kind === "bogo" && r.buy_quantity && r.get_quantity) {
      const freeish =
        (r.get_discount_percent ?? 100) >= 100
          ? ar ? "ببلاش" : "free"
          : `${r.get_discount_percent}% ${ar ? "خصم" : "off"}`;
      return ar
        ? `اشتري ${r.buy_quantity} وخدي ${r.get_quantity} ${freeish}`
        : `Buy ${r.buy_quantity}, get ${r.get_quantity} ${freeish}`;
    }
    if (headline) return headline;
  }
  return null;
}
