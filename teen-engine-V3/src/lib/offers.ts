/**
 * Multibuy offers — the data layer behind Build-a-Bundle (plan decision D5).
 *
 * ## Why this is not just `useActivePromotions()`
 *
 * The SDK's hook builds its request as `?page=…&locale=…` and nothing else. The
 * HOST route accepts more than that: it forwards `product_ids`, `category_ids`
 * and `subtotal_cents` as `cart_product_ids` / `cart_category_ids` /
 * `cart_subtotal_cents`, and the backend's `PromotionEligibilityChecker`
 * resolves untagged inclusion PRODUCT/CATEGORY targets against exactly those.
 * A promotion gated that way is dropped from the response entirely when the
 * request carries no cart — applied correctly at checkout, invisible in the UI.
 * So this fetches the route directly, with the cart attached, and re-fetches
 * when the cart changes.
 *
 * ## Why the bundle page still works with an EMPTY cart
 *
 * Worth writing down, because it looks like it shouldn't. A multibuy's scope is
 * stored as targets with `role="buy_set"`, and the eligibility checker skips
 * every role-tagged target (`if target.role is not None: continue`) — they are
 * line filters for the discount calculator, not gates. `_eligible_sets` then
 * reports those same rows to the theme as `eligible_product_ids` /
 * `eligible_category_ids`. So a correctly-configured "any 2 caps" offer
 * resolves for a shopper with nothing in their bag, which is precisely who the
 * bundle page is for.
 *
 * A promotion scoped with an UNTAGGED category target instead is a gate, and
 * will not appear until the cart already contains a matching item. That is the
 * case the cart context above rescues, and the reason the section tells the
 * merchant when it resolves nothing.
 *
 * ## Money
 *
 * Rule money is CENTS (`multibuy_price_cents`); cart money is MAJOR. The SDK's
 * `MultibuyOffer` carries both (`groupPriceCents` / `groupPriceMajor`) — use the
 * major one for display and never convert twice.
 */

import { useEffect, useMemo, useState } from "react";
import {
  eligibleUnitsInCart,
  multibuyOffers,
  offerProgress,
  useCart,
  useLocale,
  type Cart,
  type MultibuyOffer,
  type OfferProgress,
  type Product,
} from "@numueg/theme-sdk";
import { asString } from "./shared";
import { toAmount } from "./price";
import { productPrice } from "./filters";

/* ═════════════════════════════════════════════════════════════════════════
   Fetch
   ═════════════════════════════════════════════════════════════════════════ */

/** Cap matching the host route's own, so the query string stays bounded. */
const MAX_CART_IDS = 100;

function cartQuery(cart: Cart | null | undefined): string {
  const qs = new URLSearchParams();
  const items = cart?.items ?? [];
  const products = new Set<string>();
  const categories = new Set<string>();
  for (const item of items) {
    if (item?.product_id) products.add(String(item.product_id));
    const cat = (item as unknown as { category_id?: string | null })?.category_id;
    if (cat) categories.add(String(cat));
  }
  for (const id of [...products].slice(0, MAX_CART_IDS)) qs.append("product_ids", id);
  for (const id of [...categories].slice(0, MAX_CART_IDS)) qs.append("category_ids", id);
  // The host validates this as 1-12 digits; send it only when it is real.
  const subtotal = toAmount(cart?.subtotal);
  if (subtotal !== null && subtotal > 0) {
    qs.set("subtotal_cents", String(Math.round(subtotal * 100)));
  }
  return qs.toString();
}

export interface StoreOffers {
  offers: MultibuyOffer[];
  loading: boolean;
}

/**
 * Every active multibuy offer, evaluated against the CURRENT cart.
 *
 * Re-fetches when the cart's product/category makeup changes — not on every
 * quantity tick, which would fire a request per `+` press.
 */
export function useStoreOffers(page = "/pages/build-a-bundle"): StoreOffers {
  const { cart } = useCart();
  const locale = useLocale();
  const [offers, setOffers] = useState<MultibuyOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => cartQuery(cart), [cart]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let alive = true;
    setLoading(true);
    const qs = new URLSearchParams({ page, locale: locale || "en" });
    const url = `/api/storefront/promotions?${qs.toString()}${query ? `&${query}` : ""}`;
    fetch(url, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!alive) return;
        // The route is always-200 `{ data }`, and `data` is null when the promo
        // feature is off or the store cannot be resolved — not an error.
        setOffers(multibuyOffers(json?.data ?? json ?? null));
      })
      .catch(() => {
        if (alive) setOffers([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [page, locale, query]);

  return { offers, loading };
}

/* ═════════════════════════════════════════════════════════════════════════
   Grouping
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * One bundle, with its price tiers.
 *
 * The reference's "Cap Stack" shows 2-for and 3-for side by side, but promotions
 * v2 has no multi-tier multibuy: each tier is its OWN promotion ("2 for 968",
 * "3 for 1320"). Two promotions over the same catalogue scope are therefore two
 * tiers of one bundle, and grouping them by scope is what turns the platform's
 * flat list back into the card the reference draws.
 */
export interface OfferGroup {
  /** Stable id — the scope, so it survives a promotion being re-created. */
  key: string;
  /** Tiers, smallest quantity first. */
  tiers: MultibuyOffer[];
  productIds: string[];
  categoryIds: string[];
  isStoreWide: boolean;
}

export function groupOffers(offers: readonly MultibuyOffer[]): OfferGroup[] {
  const byScope = new Map<string, OfferGroup>();
  for (const offer of offers) {
    const key = offer.isStoreWide
      ? "store"
      : [
          [...offer.eligibleProductIds].sort().join("+"),
          [...offer.eligibleCategoryIds].sort().join("+"),
        ].join("|");
    const existing = byScope.get(key);
    if (existing) existing.tiers.push(offer);
    else
      byScope.set(key, {
        key,
        tiers: [offer],
        productIds: offer.eligibleProductIds,
        categoryIds: offer.eligibleCategoryIds,
        isStoreWide: offer.isStoreWide,
      });
  }
  const groups = [...byScope.values()];
  for (const g of groups) g.tiers.sort((a, b) => a.quantity - b.quantity);
  return groups;
}

/* ═════════════════════════════════════════════════════════════════════════
   Pricing
   ═════════════════════════════════════════════════════════════════════════ */

export interface TierPricing {
  offer: MultibuyOffer;
  /** What N of the cheapest eligible product would otherwise cost. */
  regularMajor: number | null;
  /** regular − group price. Null when the regular total is unknown. */
  savingMajor: number | null;
}

/**
 * What a tier saves.
 *
 * The platform gives the group price and nothing else, so the "was" has to come
 * from the catalogue. This uses the CHEAPEST eligible product, which makes the
 * figure a **minimum**: no shopper can assemble the group for less, so the
 * saving shown can never be more than the saving they get. Taking the average
 * or the most expensive item would read better and would overstate it on a
 * mixed-price scope, which is a claim about money.
 *
 * On a uniformly-priced scope — caps all at 550 — the minimum is the only
 * answer, and it reproduces the reference exactly: 2 × 550 − 968 = 132.
 *
 * Returns `null` when no eligible product can be priced, and the caller then
 * shows the offer price with no "was" and no saving rather than inventing one.
 */
export function priceTiers(
  group: OfferGroup,
  products: readonly Product[],
): TierPricing[] {
  const eligible = products.filter((p) => {
    if (group.isStoreWide) return true;
    const raw = p as unknown as Record<string, unknown>;
    const id = asString(raw.id);
    const category = asString(raw.category_id) || asString(raw.category);
    return (
      (id && group.productIds.includes(id)) ||
      (category && group.categoryIds.includes(category))
    );
  });

  // `productPrice`, not an inline cast — same tolerant reader the listing and
  // the cards use, so one place decides what a price is.
  const prices = eligible.map(productPrice).filter((n): n is number => n !== null && n > 0);
  const cheapest = prices.length > 0 ? Math.min(...prices) : null;

  return group.tiers.map((offer) => {
    const regularMajor = cheapest === null ? null : cheapest * offer.quantity;
    const savingMajor =
      regularMajor === null ? null : Math.max(0, regularMajor - offer.groupPriceMajor);
    return { offer, regularMajor, savingMajor };
  });
}

/** Products that belong to a group's scope — for the row image and the link. */
export function groupProducts(
  group: OfferGroup,
  products: readonly Product[],
): Product[] {
  if (group.isStoreWide) return [...products];
  return products.filter((p) => {
    const raw = p as unknown as Record<string, unknown>;
    const id = asString(raw.id);
    const category = asString(raw.category_id) || asString(raw.category);
    return (
      (id && group.productIds.includes(id)) ||
      (category && group.categoryIds.includes(category))
    );
  });
}

/* ═════════════════════════════════════════════════════════════════════════
   Progress
   ═════════════════════════════════════════════════════════════════════════ */

export interface GroupProgress extends OfferProgress {
  /** The tier the shopper is currently working toward, if any. */
  nextTier: MultibuyOffer | null;
  /** The best tier they have already completed. */
  reachedTier: MultibuyOffer | null;
}

/**
 * Where the cart stands against a whole GROUP, not one tier.
 *
 * Unit counting is shared across a group's tiers (they have the same scope), so
 * the count comes from the largest tier and the tiers are then read off it.
 * `savingMajor` is whatever the ENGINE says was applied — read from
 * `cart.applied_promotions`, never recomputed, so the number on screen is the
 * number being charged.
 */
export function groupProgress(
  group: OfferGroup,
  cart: Cart | null | undefined,
): GroupProgress {
  const largest = group.tiers[group.tiers.length - 1];
  const units = eligibleUnitsInCart(largest, cart);

  let reachedTier: MultibuyOffer | null = null;
  let nextTier: MultibuyOffer | null = null;
  for (const tier of group.tiers) {
    if (units >= tier.quantity) reachedTier = tier;
    else if (!nextTier) nextTier = tier;
  }

  // Progress numbers come from the tier the shopper is heading for; once every
  // tier is met, from the biggest one (so repeat groups still count).
  const base = nextTier ?? largest;
  const progress = offerProgress(base, cart, units);

  // The engine's applied amount is per-promotion — sum every tier of this group
  // so a cart that unlocked two different tiers reports both.
  const applied = cart?.applied_promotions ?? [];
  const savingMajor = group.tiers.reduce((sum, tier) => {
    const hit = applied.find((p) => p && p.id === tier.promotionId);
    return sum + (hit?.amount ?? 0);
  }, 0);

  return { ...progress, savingMajor, nextTier, reachedTier };
}
