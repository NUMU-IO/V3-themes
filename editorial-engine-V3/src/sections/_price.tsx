"use client";
/**
 * _price — the sale-price pair, in the merchant-requested order:
 * the ORIGINAL (compare-at) price first, struck through in the sale red,
 * followed by the current price in bold ink — e.g.  ~~LE 500.00~~ **LE 450.00**.
 * Falls back to just the bold price when there's no real discount.
 */
import { Money } from "@numueg/theme-sdk";

const SIZES = {
  sm: { compare: "text-xs", price: "text-sm" },
  md: { compare: "text-sm", price: "text-base" },
  lg: { compare: "text-base", price: "text-2xl" },
} as const;

export function PricePair({ price, compareAt, currency, size = "md" }: {
  price: number;
  compareAt?: number | null;
  currency?: string;
  size?: keyof typeof SIZES;
}) {
  const has = typeof compareAt === "number" && compareAt > price;
  const cls = SIZES[size];
  return (
    <span className="inline-flex items-baseline gap-2">
      {has && (
        <s className={`${cls.compare} font-medium text-[var(--vn-sale)] decoration-[var(--vn-sale)]`}>
          <Money amount={compareAt} currency={currency} />
        </s>
      )}
      <span className={`${cls.price} font-bold text-[var(--vn-ink)]`}>
        <Money amount={price} currency={currency} />
      </span>
    </span>
  );
}
