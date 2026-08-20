# Build-a-Bundle — engine support and what is still missing

Written 2026-08-20 against the SLEEKZ reference
(`shopsleekz.com`, "Build your bundle").

The **chooser UI is done.** `tn-bundle-builder` already renders every element of
the reference capture: the eyebrow / H1 / subcopy header, the black featured
card with its three-image strip, lime `MOST POPULAR` pill and side-by-side price
tiles, then the white offer rows with thumb, `+N` quantity badge, requirement
line, price, struck "was", green saving pill, chevron and the extra-tier line
("Or 3 tees for LE 1,697"). Page and modal presentations both ship.

What was missing was underneath it. The theme's rule is that every number comes
from the promotion engine and nothing is typed in — so where the engine could
not express an offer, the page could not show it honestly.

**Two blockers are now fixed in NUMU-api. The rest is theme work.**

---

## ✅ G1 · Mixed-basket bundles — `DiscountRuleKind.BUNDLE`

Was: `MULTIBUY` is "any N items from ONE eligible set for a fixed total P", so
"1 tee + 1 cap" was inexpressible — a multibuy scoped to `{tees ∪ caps}` with
`N=2` also fires on two tees, at the mixed-basket price. Two of the reference's
four offers could not be built, and the theme would still *display* them
(`OfferSkin.requirement` is free merchant text) and charge something else.

Now: a `BUNDLE` rule carries `bundle_legs` + `bundle_price_cents`. Each leg has
its own catalogue scope, held on `PromotionTarget` rows tagged
`role="leg:<index>"` and positionally aligned with `bundle_legs`.

```jsonc
{
  "kind": "bundle",
  "bundle_legs": [
    { "quantity": 1, "label": "1 tee" },
    { "quantity": 1, "label": "1 cap" }
  ],
  "bundle_price_cents": 109100
}
// + targets: role="leg:0" → Tees category, role="leg:1" → Caps category
```

Allocation is greedy in declared leg order over a pool of units each spendable
once; within a leg the most expensive available unit is taken first. Bundles
repeat, and a set already at or below the bundle price is never "discounted"
upward. Max 5 legs.

## ✅ G2 · Overlapping tiers double-discounted — `multibuy_tiers`

Was: the reference's tiered card ("2 caps 968 / 3 caps 1,320") had to be TWO
promotions, because there was no multi-tier multibuy. All automatic discounts
stack additively and two multibuy rules do not share unit allocation, so three
caps at 550 fired both:

```
promo A (2 for 968)  → 1 group, 1100 > 968   → 132 off
promo B (3 for 1320) → 1 group, 1650 > 1320  → 330 off
                                                462 off 1650 = charged 1188
```

Advertised **1,320**, charged **1,188**, silently, on every three-cap order.

Now, two layers:

1. **`multibuy_tiers: [{quantity, price_cents}, …]`** on a single rule. One rule
   cannot double-count against itself. The legacy `multibuy_quantity` /
   `multibuy_price_cents` pair still works and is folded in as one more tier, so
   every existing promotion is untouched. Tier selection is greedy by saving
   **per unit consumed**, tie-broken toward the smaller group.
2. **A rivalry pass** in `DiscountCalculator` for the promotions **already
   live**, which no migration can safely rewrite: at most one multibuy applies
   per catalogue scope, the survivor being whichever saves this cart the most.
   The losers appear in `rejected` with a reason naming `multibuy_tiers`.

Merchants with a two-row ladder today are now charged correctly without touching
anything, and should still consolidate onto one rule — the merged rule prices
mixed counts better (5 caps → 3-for + 2-for, which the rivalry pass cannot do).

**G2b, unchanged:** the theme's `groupOffers()` keys tiers on the sorted join of
`eligibleProductIds` + `eligibleCategoryIds`. Consolidating onto `multibuy_tiers`
makes that grouping unnecessary — the theme should read the tiers off one rule.

## ✅ G6 · The configuration trap that showed an empty page

A multibuy scoped with **untagged** catalog targets was an eligibility *gate*,
not a line filter, so the offer did not resolve until the cart already contained
a matching item — the bundle page, whose whole audience is shoppers with an
empty bag, rendered nothing. And once it did resolve, the group could form from
any two cart lines, because a gate is not a filter.

`use_cases.promotions.target_roles.normalize_target_roles` now promotes untagged
**inclusion** catalog targets to `role="buy_set"` on write, for MULTIBUY only,
and only when the promotion carries no explicit `buy_set` already. Exclusions
stay gates. BUNDLE legs are never inferred — nothing in an untagged row says
which leg it belongs to.

---

## What the theme should now read

`GET /storefront/store/{id}/promotions/active` → each resolved promotion:

| field | meaning |
|---|---|
| `discount_rule.multibuy_tiers` | every price break on one rule — render the tile row from this instead of `groupOffers()` |
| `discount_rule.bundle_legs` | `[{quantity, label}]`, in order |
| `discount_rule.bundle_price_cents` | the bundle's total |
| `eligible_legs` | `[{quantity, label, product_ids, category_ids}]` — per-leg catalogue for a picker |
| `eligible_product_ids` / `eligible_category_ids` | unchanged; for a bundle these are the UNION across legs, so cart-counting keeps working untouched |

`@numueg/theme-sdk` types need the new fields before the theme can consume them.

---

## Still open — theme-side

### G4 · Clicking an offer leaves the bundle flow

Reference: click an offer → pick items from a grid **inside** the flow → each
`Add` → discount applies automatically. Teen: `FeaturedOffer` and `OfferRow` are
`<Link to={info.href}>` to `/collections/<slug>` or `/products`, so the shopper
is dropped on an ordinary collection page with no memory of which bundle they
were filling, and the progress line they were watching is on the page they left.

Everything needed exists: `groupProducts()` returns the scoped catalogue,
`groupProgress()` returns `unitsInCart` / `unitsNeeded` / `reachedTier`,
`QuickAddSheet` is a working picker, and `eligible_legs` now gives a per-leg
catalogue for multi-leg bundles. This is the biggest remaining UX gap.

### G3 · No percentage phrasing on extra tiers

Reference: *"Or 3 tees for LE 1,697, save 18%"*. `priceTiers()` computes an
absolute saving from the cheapest eligible product (deliberately — a minimum, so
it can never overstate). The percentage is derivable from the same two numbers
and just isn't rendered.

### G5 · Product-scoped offers resolve no collection

`describe()` finds the collection via `group.categoryIds.includes(c.id)`. A
promotion scoped by **product ids** matches nothing, so the row loses its name
(falls back to "Bundle"), its requirement line ("Any N items") and its
destination (`/products`). Pricing is unaffected. Fixable theme-side by deriving
a name from the scoped products.

---

## Still open — storefront

### G7 · The bundle page is invisible to crawlers

`useStoreOffers()` fetches `/api/storefront/promotions` from the browser. The one
page whose entire purpose is the offer renders empty in SSR — nothing in the
HTML for Google, and a visible blank until JS lands. The API endpoint is
server-callable today (`GET /storefront/store/{id}/promotions/active`); what is
missing is a storefront-side server fetch feeding `page.data`.

---

## Checked and NOT a gap

- **Cart lines carry `category_id`** — `_build_cart_response`
  (`src/api/v1/routes/storefront/cart.py`) sets it from the product, so
  `cartQuery()` in `offers.ts` does attach category context and category-scoped
  offers resolve. Verified, not assumed.
- **One calculator caller** — cart preview, checkout and the promotions endpoint
  all funnel through `CalculateCartDiscountsUseCase`, which always passes
  `targets_by_promotion`. Bundle legs scope identically on all three paths.
- **Applied savings are the real ones** — `groupProgress()` reads
  `cart.applied_promotions` and never recomputes.
- **`/storefront/.../bundles`** is the unrelated "Frequently Bought Together"
  widget (`product_bundles` table), not this feature. Same word, different thing.
