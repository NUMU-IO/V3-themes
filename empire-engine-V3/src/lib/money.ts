/**
 * Money-unit helpers.
 *
 * The platform hands themes money in TWO different units and it is not
 * guessable which is which:
 *   - `useCart()` amounts are already MAJOR units (the SDK normalises them)
 *   - `useOrders()` / `useOrder()` / `customer.total_spent` are integer CENTS
 *
 * Rendering an order total without converting shows the shopper 100x the real
 * amount. Empire did exactly that on the order-confirmation page and in the
 * account order list until 2026-07-21; the rest of the fleet carries a
 * hand-written `/ 100` and an explanatory comment in each theme, which is the
 * signature of a fix that propagated by copy-paste.
 *
 * This mirrors `centsToMajor` in @numueg/theme-sdk 0.11.0. It is defined
 * locally rather than imported because 0.11.0 is not published yet, so the
 * copy installed in each theme's node_modules predates the money exports and
 * importing them breaks `tsc`. Swap this for the SDK import once 0.11.0 is on
 * npm — that swap is the whole point of the shared-library work.
 */

/** Integer cents to major units. Non-finite input renders as 0, never NaN. */
export function centsToMajor(cents: number): number {
  return (Number.isFinite(cents) ? cents : 0) / 100;
}
