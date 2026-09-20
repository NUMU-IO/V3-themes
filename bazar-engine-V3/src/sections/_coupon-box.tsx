"use client";

import { useDiscountCode, useLocale } from "@numueg/theme-sdk";
import { localized } from "./_shared";

/**
 * Discount-code box for the cart summary.
 *
 * Without one, a shopper holding a code the merchant just created has
 * nowhere to type it until the checkout page — which reads as "this store's
 * codes don't work" and is where carts get abandoned.
 *
 * The apply/remove state machine is the SDK's `useDiscountCode`, so this
 * file is markup. `error` is the backend's own reason ("This coupon has
 * expired", "does not apply to this cart"); hand-rolled versions of this box
 * wrapped a non-throwing call in try/catch and showed nothing at all.
 */
export function CouponBox() {
  const locale = useLocale();
  const { code, setCode, applied, busy, error, submit, remove } = useDiscountCode(
    localized(locale, "That code can't be used on this cart.", "الكود ده مينفعش على السلة دي."),
  );

  if (applied) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <span>
          {localized(locale, "Code", "الكود")}:{" "}
          <strong className="font-mono">{applied}</strong>
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className="text-[var(--bz-gray)] underline disabled:opacity-50"
        >
          {localized(locale, "Remove", "إزالة")}
        </button>
      </div>
    );
  }

  return (
    <form className="mt-4" onSubmit={submit}>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={localized(locale, "Discount code", "كود الخصم")}
          aria-label={localized(locale, "Discount code", "كود الخصم")}
          className="min-w-0 flex-1 rounded-full border border-[var(--bz-dark)]/15 bg-transparent px-4 py-2.5 font-mono text-xs"
        />
        <button type="submit" disabled={busy || !code.trim()} className="bz-btn bz-btn-filled rounded-full px-5 py-2.5 text-xs disabled:opacity-50">
          {localized(locale, "Apply", "تطبيق")}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </form>
  );
}
