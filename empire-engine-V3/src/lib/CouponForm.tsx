import { useDiscountCode } from "@numueg/theme-sdk";

/**
 * Coupon / discount-code input wired to the live cart. The apply/remove state
 * machine is the SDK's `useDiscountCode`, so this file is markup.
 *
 * It used to own that logic and got it wrong in a way no one could see: the
 * SDK's `applyDiscount` REPORTS a rejection (`{ ok: false, message }`) rather
 * than throwing, so the `try/catch` here never fired. A wrong code cleared
 * the input, showed no error, and left the shopper thinking the store's codes
 * simply don't work. Now the backend's own reason is shown.
 */
export function CouponForm({ compact = false }: { compact?: boolean }) {
  const { code, setCode, applied, busy, error, submit, remove } = useDiscountCode(
    "تعذّر تطبيق الكود. تأكد من صحته وحاول مرة أخرى.",
  );

  if (applied) {
    return (
      <div className={`empire-coupon empire-coupon--applied${compact ? " is-compact" : ""}`}>
        <span className="empire-coupon__tag">
          كود الخصم: <strong>{applied}</strong>
        </span>
        <button
          type="button"
          className="empire-coupon__remove"
          onClick={() => void remove()}
          disabled={busy}
        >
          إزالة
        </button>
      </div>
    );
  }

  return (
    <form
      className={`empire-coupon${compact ? " is-compact" : ""}`}
      onSubmit={submit}
    >
      <div className="empire-coupon__row">
        <input
          className="empire-input"
          type="text"
          value={code}
          placeholder="كود الخصم"
          aria-label="كود الخصم"
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          className="empire-btn-outline"
          type="submit"
          disabled={busy || !code.trim()}
        >
          {busy ? "..." : "تطبيق"}
        </button>
      </div>
      {error ? <p className="empire-coupon__err">{error}</p> : null}
    </form>
  );
}
