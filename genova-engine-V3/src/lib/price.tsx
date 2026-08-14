/**
 * Price display.
 *
 * ## Money arrives as STRINGS
 *
 * `price` and `compare_at_price` come off the catalog API as `'30.00'` /
 * `'50.00'`, not numbers — measured across all 18 products on testlocal. The
 * original `typeof compareAt === "number"` guard therefore never once matched,
 * so the compare-at price and the whole discount treatment were silently dead
 * on every card in the theme. Nothing errored; the markup simply never
 * rendered, which is the hardest kind of bug to notice.
 *
 * `toAmount()` accepts both and is used everywhere money is read. Same lesson
 * as the SDK's `useCollections` envelope bug: accept the shapes the platform
 * actually sends, not the ones the types promise.
 *
 * ## Colour (supersedes plan §2.1a)
 *
 * D1 made this theme strictly monochrome and §2.1a specified grey substitutes
 * for exactly this job. Yousef reversed that for commerce signals on
 * 2026-08-14: discounts, sale badges and savings are now RED, because a
 * greyscale discount does not read as a discount and the whole point of the
 * signal is that the eye catches it.
 *
 * The reversal is scoped to **money**. Editorial chrome stays monochrome, and
 * "Sold out" / "Coming soon" stay ink — they are states, not savings, and
 * colouring them would spend the same attention on the one product a shopper
 * cannot buy.
 *
 * Colour is never the ONLY signal: the badge keeps its "SALE" word, the
 * compare-at keeps its strikethrough, and the saving keeps its "−40%" text. So
 * this still satisfies WCAG 1.4.1 and still survives greyscale printing —
 * red is additive emphasis, not the message itself. `--gn-sale` is 5.9:1 on
 * the theme's surface, above the 4.5:1 AA floor for body text.
 *
 * ⚠ Units: these are MAJOR units (pounds, not piastres) and the SDK's `<Money>`
 * expects the same. Promotion rules elsewhere in the platform are in CENTS.
 */

import { Money } from "@numueg/theme-sdk";
import { cx } from "./shared";

/**
 * Coerce an API money value to a number.
 *
 * Returns `null` — never `0` — for anything unusable. A missing price and a
 * free product are different facts, and collapsing them would render "EGP 0"
 * on every product whose price failed to parse.
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

export interface PriceProps {
  amount: number | string | null | undefined;
  compareAt?: number | string | null;
  currency?: string;
  className?: string;
  /** Larger treatment for the PDP. */
  size?: "sm" | "lg";
  /** Render the "−40%" chip beside the price. */
  showSaving?: boolean;
}

export function Price({
  amount,
  compareAt,
  currency,
  className,
  size = "sm",
  showSaving = true,
}: PriceProps) {
  const value = toAmount(amount);
  const discounted = isDiscounted(amount, compareAt);
  const percent = discountPercent(amount, compareAt);

  if (value === null) return null;

  return (
    <span className={cx("gn-price-group", `is-${size}`, discounted && "is-sale", className)}>
      <Money amount={value} currency={currency} className="gn-price" />
      {discounted && (
        <>
          <Money
            amount={toAmount(compareAt) as number}
            currency={currency}
            className="gn-price-compare"
          />
          {showSaving && percent > 0 && (
            <span className="gn-price-saving">{`−${percent}%`}</span>
          )}
        </>
      )}
    </span>
  );
}

/**
 * Status chip over the image.
 *
 * `tone="sale"` is the only coloured variant — see the colour note above.
 */
export function Tag({
  children,
  tone = "ink",
}: {
  children: React.ReactNode;
  tone?: "ink" | "sale";
}) {
  return <span className={cx("gn-tag gn-label", tone === "sale" && "is-sale")}>{children}</span>;
}
