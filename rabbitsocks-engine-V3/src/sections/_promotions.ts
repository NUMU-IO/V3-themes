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

export interface DiscountTier {
  threshold_cents: number;
  percent: number;
}

export interface DiscountRule {
  kind: "percentage" | "fixed" | "free_shipping" | "bogo" | "tiered";
  value_cents?: number | null;
  value_percent?: number | null;
  min_subtotal_cents?: number | null;
  buy_quantity?: number | null;
  get_quantity?: number | null;
  get_discount_percent?: number | null;
  tiers?: DiscountTier[];
}

export interface ActivePromo {
  promotion_id: string;
  translated_content?: { headline?: Record<string, string> };
  discount_rule?: DiscountRule | null;
  coupon_code?: string | null;
}

interface ActivePromotionsData {
  auto_discounts?: ActivePromo[];
  discount_codes_visible?: ActivePromo[];
}

/** Fetch the active promotions for a page. Null until loaded / on any miss. */
export function useActivePromotions(page: string, locale: string) {
  const [data, setData] = useState<ActivePromotionsData | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/storefront/promotions?page=${encodeURIComponent(page)}&locale=${locale}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled) setData((j?.data as ActivePromotionsData) ?? null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [page, locale]);
  return data;
}

export interface PromoNudgeInfo {
  /** Ready-to-render message. `{amount}` was already substituted. */
  message: string;
  /** 0-100 progress toward the next unlock; null = no meter (e.g. BOGO). */
  progressPct: number | null;
  /** True when the offer's condition is currently met. */
  unlocked: boolean;
  couponCode: string | null;
}

const fmt = (cents: number, currency: string, locale: string) =>
  new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    style: "currency",
    currency: currency || "EGP",
    maximumFractionDigits: 0,
  }).format(cents / 100);

/**
 * Pick the best cart nudge from the auto-discount rules for a major-unit
 * subtotal. Tiered/threshold rules become a progress message ("Add X more to
 * unlock Y% off"); met conditions become an unlocked message. Free-shipping
 * rules can be skipped when the theme's own free-shipping bar already covers
 * that story (`skipFreeShipping`).
 */
export function bestCartNudge(
  promos: ActivePromo[] | undefined,
  subtotalMajor: number,
  currency: string,
  locale: string,
  skipFreeShipping: boolean,
): PromoNudgeInfo | null {
  if (!promos?.length) return null;
  const subtotalCents = Math.round(subtotalMajor * 100);
  const ar = locale === "ar";

  // Actionable-first: a rule the shopper can still make progress on (tiered /
  // spend-threshold) beats a static line (BOGO / bare headline) — the nudge
  // exists to change the order, not just to inform.
  const RANK: Record<string, number> = { tiered: 0, percentage: 1, fixed: 1, free_shipping: 2, bogo: 3 };
  const ordered = [...promos].sort(
    (a, b) => (RANK[a.discount_rule?.kind ?? ""] ?? 9) - (RANK[b.discount_rule?.kind ?? ""] ?? 9),
  );

  for (const p of ordered) {
    const r = p.discount_rule;
    if (!r) continue;
    const headline = p.translated_content?.headline?.[locale] || p.translated_content?.headline?.en;
    const base = { couponCode: p.coupon_code ?? null };

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
  }
  return null;
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
): { message: string; qualified: boolean } | null {
  if (!promos?.length) return null;
  const ar = locale === "ar";
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
): string | null {
  if (!promos?.length) return null;
  const ar = locale === "ar";
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
