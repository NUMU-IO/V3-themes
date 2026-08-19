/**
 * Price display — the loudest three-line component in the theme.
 *
 * ## Money arrives as STRINGS
 *
 * `price` and `compare_at_price` come off the catalog API as `'30.00'` /
 * `'50.00'`, not numbers. A `typeof compareAt === "number"` guard therefore
 * never matches, and the compare-at price plus the entire discount treatment
 * go silently dead on every card in the theme — nothing errors, the markup
 * simply never renders. (Measured across all 18 products on `testlocal` during
 * the Genova build; the same guard had shipped.)
 *
 * `toAmount()` accepts both and is used everywhere money is read. Same lesson
 * as the SDK's `useCollections` envelope bug: accept the shapes the platform
 * actually sends, not the ones the types promise.
 *
 * ## Three colours, three jobs
 *
 * The reference uses TWO different reds and they are not interchangeable:
 *
 *   `--tn-sale`    `#EC0505`  the live price when discounted  (text)
 *   `--tn-primary` `#FB4D01`  the "Save LE 130" / "On sale" badge  (fill)
 *
 * Merging them into one red flattens the price row: the eye stops separating
 * "what it costs now" from "how much you saved", which is the entire point of
 * the layout. The struck-through was-price stays `--tn-muted` — it must recede.
 *
 * Colour is never the only signal. The badge carries the word "Save" and an
 * amount, the compare-at keeps its strikethrough, and the saving chip keeps its
 * "−40%" text — so the row still reads correctly in greyscale and satisfies
 * WCAG 1.4.1.
 *
 * ⚠ Units: MAJOR (pounds, not piastres), and the SDK's `<Money>` expects the
 * same. Promotion rules elsewhere in the platform are in CENTS.
 */

import { Money } from "@numueg/theme-sdk";
import { cx } from "./shared";

/**
 * Coerce an API money value to a number.
 *
 * Returns `null` — never `0` — for anything unusable. A missing price and a
 * free product are different facts, and collapsing them renders "EGP 0" on
 * every product whose price failed to parse.
 */
export function toAmount(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** True when `compareAt` is a genuine, higher was-price. */
export function isDiscounted(amount: unknown, compareAt: unknown): boolean {
  const a = toAmount(amount);
  const c = toAmount(compareAt);
  // Equal or lower compare-at values are data noise (a stale field, a price
  // rise). Rendering them as a "saving" would be a false claim.
  return a !== null && c !== null && c > a;
}

/** Whole-percent saving, or 0 when there is no discount. */
export function discountPercent(amount: unknown, compareAt: unknown): number {
  if (!isDiscounted(amount, compareAt)) return 0;
  const a = toAmount(amount) as number;
  const c = toAmount(compareAt) as number;
  return Math.round(((c - a) / c) * 100);
}

/** Absolute saving in major units, or 0. */
export function savingAmount(amount: unknown, compareAt: unknown): number {
  if (!isDiscounted(amount, compareAt)) return 0;
  return (toAmount(compareAt) as number) - (toAmount(amount) as number);
}

export interface PriceProps {
  amount: number | string | null | undefined;
  compareAt?: number | string | null;
  currency?: string;
  className?: string;
  /** Larger treatment for the PDP. */
  size?: "sm" | "lg";
  /** Render the "−40%" chip beside the price. Off on cards, on for the PDP. */
  showPercent?: boolean;
}

export function Price({
  amount,
  compareAt,
  currency,
  className,
  size = "sm",
  showPercent = false,
}: PriceProps) {
  const value = toAmount(amount);
  const discounted = isDiscounted(amount, compareAt);
  const percent = discountPercent(amount, compareAt);

  if (value === null) return null;

  return (
    <span className={cx("tn-price-group", `is-${size}`, discounted && "is-sale", className)}>
      <Money amount={value} currency={currency} className="tn-price" />
      {discounted && (
        <>
          <Money
            amount={toAmount(compareAt) as number}
            currency={currency}
            className="tn-price-compare"
          />
          {showPercent && percent > 0 && <span className="tn-price-percent">{`−${percent}%`}</span>}
        </>
      )}
    </span>
  );
}

/**
 * The orange "Save LE 130.00" badge from the PDP.
 *
 * An AMOUNT, not a percentage: at these price points a shopper reads "Save LE
 * 130" faster than "−16%", and the reference makes the same call. The percent
 * chip exists separately for the places where the absolute figure is too long.
 */
export function SaveBadge({
  amount,
  compareAt,
  currency,
  label = "Save",
}: {
  amount: unknown;
  compareAt: unknown;
  currency?: string;
  label?: string;
}) {
  const saved = savingAmount(amount, compareAt);
  if (saved <= 0) return null;
  return (
    <span className="tn-badge tn-badge-sale">
      {label}
      {" "}
      <Money amount={saved} currency={currency} />
    </span>
  );
}

/**
 * Status chip over a card image.
 *
 * `sale` is orange, `soldout` is GREY. Colouring "sold out" orange spends the
 * purchase colour on the one product a shopper cannot buy, and at a glance it
 * reads as an offer.
 */
export function Tag({
  children,
  tone = "sale",
}: {
  children: React.ReactNode;
  tone?: "sale" | "soldout";
}) {
  return (
    <span className={cx("tn-badge", tone === "sale" ? "tn-badge-sale" : "tn-badge-soldout")}>
      {children}
    </span>
  );
}
