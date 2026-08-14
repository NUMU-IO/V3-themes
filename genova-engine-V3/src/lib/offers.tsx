/**
 * Multibuy offer strips — "3 for EGP 650" and friends.
 *
 * Everything numeric comes from the SDK's headless promotion helpers, NOT from
 * arithmetic here. That matters more than it sounds: `offerProgress` reads the
 * saving from `cart.applied_promotions`, i.e. what the ENGINE actually applied,
 * so the number the shopper reads is the number they are charged. A theme that
 * recomputes the saving will eventually disagree with checkout, and the shopper
 * will believe the bigger number.
 *
 * Two guards that exist for good reasons:
 *
 *  - `offerBeatsRegularPrice` — never advertise an offer where N of the item
 *    costs LESS at the normal price. The engine refuses to apply those, so
 *    advertising one promises a discount that will not appear at checkout.
 *  - `offerIncludesProduct` returns false when a scoped offer meets a product
 *    whose `category_id` we don't know. Under-promising is the correct failure
 *    direction here.
 *
 * ⚠ Catalog-scoped promotions need cart context or the API filters them out
 * entirely — see `useActivePromotions`. They are charged correctly at checkout
 * either way; the risk is the strip silently never rendering.
 *
 * Visually these are ink bands or hairline cards, never a coloured ribbon —
 * Genova has no accent colour (plan §2.1a).
 */

import {
  eligibleUnitsInCart,
  multibuyOffers,
  offerBeatsRegularPrice,
  offerIncludesProduct,
  offerProgress,
  useActivePromotions,
  useCart,
  useLocale,
  type MultibuyOffer,
} from "@numueg/theme-sdk";
import { useT } from "./i18n";

function headline(offer: MultibuyOffer, locale: string): string {
  const h = offer.headline;
  if (!h) return "";
  return h[locale] || h[locale.split("-")[0]] || h.en || Object.values(h)[0] || "";
}

/** The offer line for a PDP — only when it genuinely beats the unit price. */
export function ProductOfferLine({
  productId,
  categoryId,
  unitPrice,
}: {
  productId: string;
  categoryId?: string | null;
  unitPrice: number;
}) {
  const t = useT();
  const locale = useLocale();
  const promotions = useActivePromotions("product", locale);
  const offers = multibuyOffers(promotions);

  const offer = offers.find(
    (o) =>
      offerIncludesProduct(o, { id: productId, category_id: categoryId ?? null }) &&
      offerBeatsRegularPrice(o, unitPrice),
  );
  if (!offer) return null;

  const custom = headline(offer, locale);

  return (
    <p className="gn-offerline">
      {custom ||
        t("offer.n_for_price", "{{n}} for {{price}}")
          .replace("{{n}}", String(offer.quantity))
          .replace("{{price}}", `${offer.groupPriceMajor} EGP`)}
    </p>
  );
}

/**
 * The cart nudge — how close the bag is to completing a group.
 *
 * Shows the single most actionable offer rather than a list: a stack of
 * competing nudges is noise, and the shopper can only act on one at a time.
 */
export function CartOfferNudge() {
  const t = useT();
  const locale = useLocale();
  const { cart } = useCart();
  const promotions = useActivePromotions("cart", locale);
  const offers = multibuyOffers(promotions);
  if (offers.length === 0 || !cart) return null;

  const scored = offers
    .map((offer) => ({
      offer,
      progress: offerProgress(offer, cart, eligibleUnitsInCart(offer, cart)),
    }))
    // Only offers the cart has actually started — a nudge for an offer with
    // nothing eligible in the bag is an advert, not a nudge.
    .filter(({ progress }) => progress.unitsInCart > 0);
  if (scored.length === 0) return null;

  // Closest to completion first; among equals, the one already saving most.
  scored.sort(
    (a, b) =>
      a.progress.unitsNeeded - b.progress.unitsNeeded ||
      b.progress.savingMajor - a.progress.savingMajor,
  );
  const { offer, progress } = scored[0];

  if (progress.unitsNeeded === 0) {
    return (
      <p className="gn-offerline is-unlocked">
        {t("offer.unlocked", "Offer applied — you saved {{amount}}").replace(
          "{{amount}}",
          `${progress.savingMajor} ${cart.currency ?? "EGP"}`,
        )}
      </p>
    );
  }

  return (
    <p className="gn-offerline">
      {t("offer.add_more", "Add {{n}} more for the {{q}} for {{price}} offer")
        .replace("{{n}}", String(progress.unitsNeeded))
        .replace("{{q}}", String(offer.quantity))
        .replace("{{price}}", `${offer.groupPriceMajor} ${cart.currency ?? "EGP"}`)}
    </p>
  );
}
