/**
 * tn-bundle-builder — the Build-a-Bundle chooser (§5).
 *
 * Reference anatomy: an eyebrow / H1 / subcopy header, then one emphasised
 * black offer card carrying a three-image strip, a lime `MOST POPULAR` pill and
 * two price tiles (the second one selected, in olive), then stacked white offer
 * rows with a product thumb, a quantity badge, a requirement line, a price, an
 * old price, a green saving pill and a chevron. The captured state has the whole
 * thing inside a modal over the page, so both presentations ship.
 *
 * ## Nothing on this page is typed in by the merchant
 *
 * Every price, every "was", every saving comes from a live promotion (D5). The
 * merchant supplies imagery and wording; the numbers come from the engine, and
 * where the engine cannot supply one the theme prints nothing rather than a
 * plausible figure. An invented saving on a bundle page is a false price.
 *
 * The rows are DERIVED from the resolved promotions, not picked in the editor —
 * the platform has no promotion-picker setting type, so any manual link would
 * be a text field holding a UUID that breaks the day the promotion is
 * re-created. An offer block instead attaches presentation (image, title,
 * requirement wording) to a COLLECTION, which is both stable and how a merchant
 * thinks about "the caps bundle".
 *
 * ## Tiers
 *
 * Promotions v2 has no multi-tier multibuy: "2 caps for 968" and "3 caps for
 * 1320" are two separate promotions. `groupOffers` puts promotions that share a
 * catalogue scope back together, which is what reproduces the reference's
 * two-tile card.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Link, Money, useCart, useLocale, useProducts, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asBool,
  asImageUrl,
  asString,
  collectionFields,
  cx,
  productImages,
  readBlockNodes,
  useFocusTrap,
  useInsideEditor,
  useOverlayBehaviour,
  useStoreCollections,
  type SectionRenderProps,
} from "../lib/shared";
import { useT, type TFunction } from "../lib/i18n";
import {
  groupOffers,
  groupProducts,
  groupProgress,
  priceTiers,
  useStoreOffers,
  type OfferGroup,
  type TierPricing,
} from "../lib/offers";
import { IconArrowRight, IconChevronRight, IconClose } from "../lib/icons";

/** Presentation a merchant attached to one scope. */
interface OfferSkin {
  collectionId: string;
  title: string;
  requirement: string;
  image: string;
  badge: string;
  featured: boolean;
}

const SESSION_KEY = "tn:bundle-modal-seen";

export default function TnBundleBuilder({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const locale = useLocale();
  const insideEditor = useInsideEditor();
  const { cart } = useCart();

  const { offers, loading } = useStoreOffers();
  // The bundle page is a CMS page route, which pre-fetches no products — so the
  // catalogue behind the pricing has to be fetched.
  const { products } = useProducts({ limit: 200, fetchIfMissing: true });
  const collections = useStoreCollections();

  const skins = useMemo<OfferSkin[]>(
    () =>
      readBlockNodes(instance, "offer").map((node) => ({
        collectionId: asString(node.settings.collection),
        title: asString(node.settings.title),
        requirement: asString(node.settings.requirement),
        image: asImageUrl(node.settings.image),
        badge: asString(node.settings.badge_text),
        featured: asBool(node.settings.featured, false),
      })),
    [instance],
  );

  const groups = useMemo(() => groupOffers(offers), [offers]);

  const [modalOpen, setModalOpen] = useState(false);
  const presentAs = asString(s.present_as, "page");

  // Auto-open once per session. In an effect, never during render: reading
  // sessionStorage on the server is impossible and doing it on the first client
  // render would make the markup differ from the server's.
  useEffect(() => {
    if (presentAs !== "page_and_modal" || typeof window === "undefined") return;
    if (groups.length === 0) return;
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return;
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Private mode, or storage disabled. Skip the modal rather than showing
      // it on every navigation.
      return;
    }
    setModalOpen(true);
  }, [presentAs, groups.length]);

  // The HEADER always renders; only the offer list waits on real promotions.
  // Keeping the <h1> inside the list left a store with no bundles serving a
  // route with chrome and an empty <main> — no heading, no content, nothing
  // saying where the shopper is. Nothing invented either way: an offer with no
  // promotion behind it still never appears.
  const header = (
    <header className="tn-bundle-head">
      {asString(s.eyebrow) ? <p className="tn-label tn-bundlepage-eyebrow">{asString(s.eyebrow)}</p> : null}
      <h1 className="tn-bundlepage-title">{asString(s.heading) || t("bundle.heading", "Build your bundle")}</h1>
      <p className="tn-bundlepage-sub">
        {asString(s.subcopy) ||
          t("bundle.subcopy", "Your discount is applied automatically at checkout.")}
      </p>
    </header>
  );

  if (groups.length === 0) {
    return (
      <section className="tn-section tn-bundle">
        <div className="tn-container tn-bundle-inner">
          {header}
          {insideEditor && !loading && (
            <div className="tn-editor-note">
              <p className="tn-label">{t("editor.bundle_note_title", "No bundle offers found")}</p>
              <p className="tn-footer-text">
                {t(
                  "editor.bundle_note",
                  "This page shows your multibuy promotions — “any 3 for 650” and the like. Create one in Marketing → Promotions and it appears here with real pricing. If you already have one and it is missing, check that its products are set as the offer's buy-set rather than as an audience condition.",
                )}
              </p>
            </div>
          )}
        </div>
      </section>
    );
  }

  const body = (
    <BundleBody
      header={header}
      groups={groups}
      skins={skins}
      products={products}
      collections={collections}
      cart={cart}
      locale={locale}
      t={t}
    />
  );

  return (
    <section className="tn-section tn-bundle">
      <div className="tn-container tn-bundle-inner">{body}</div>

      {modalOpen && (
        <BundleModal onClose={() => setModalOpen(false)} label={asString(s.heading) || t("bundle.heading", "Build your bundle")}>
          {body}
        </BundleModal>
      )}
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Body — shared by the page and the modal
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Exported so the offer layout can be RENDERED in a probe.
 *
 * The section itself resolves its offers with a client fetch — the platform has
 * no server-side promotions path, so `renderToString` can only ever produce the
 * empty state and the one page in this theme whose every number is money would
 * otherwise be the one page nobody could look at before shipping. Nothing in
 * the theme imports this but the section below.
 */
export function BundleBody({
  header,
  groups,
  skins,
  products,
  collections,
  cart,
  locale,
  t,
}: {
  /** Built by the section so the empty state and the populated one share it. */
  header: React.ReactNode;
  groups: OfferGroup[];
  skins: OfferSkin[];
  products: ReturnType<typeof useProducts>["products"];
  collections: ReturnType<typeof useStoreCollections>;
  cart: ReturnType<typeof useCart>["cart"];
  locale: string;
  t: TFunction;
}) {
  const named = groups.map((group) => describe(group, skins, products, collections, locale, t));

  // Featured = the merchant's pick, else the biggest single saving on offer.
  // Sorting by saving rather than by price puts the strongest deal first, which
  // is the job the reference's black card is doing.
  const featuredIndex = (() => {
    const marked = named.findIndex((n) => n.skin?.featured);
    if (marked >= 0) return marked;
    let best = 0;
    let bestSaving = -1;
    named.forEach((n, i) => {
      const top = Math.max(...n.pricing.map((p) => p.savingMajor ?? 0));
      if (top > bestSaving) {
        bestSaving = top;
        best = i;
      }
    });
    return best;
  })();

  const featured = named[featuredIndex];
  const rest = named.filter((_, i) => i !== featuredIndex);

  return (
    <>
      {header}

      {featured && <FeaturedOffer info={featured} cart={cart} t={t} />}

      {rest.length > 0 && (
        <div className="tn-offer-rows">
          {rest.map((info) => (
            <OfferRow key={info.group.key} info={info} cart={cart} t={t} />
          ))}
        </div>
      )}
    </>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   One group, described
   ═════════════════════════════════════════════════════════════════════════ */

interface GroupInfo {
  group: OfferGroup;
  skin: OfferSkin | null;
  title: string;
  requirement: string;
  pricing: TierPricing[];
  images: string[];
  href: string;
  currency?: string;
  /** What the items ARE — "Caps" — for the tile labels. */
  noun: string;
}

function describe(
  group: OfferGroup,
  skins: OfferSkin[],
  products: ReturnType<typeof useProducts>["products"],
  collections: ReturnType<typeof useStoreCollections>,
  locale: string,
  t: TFunction,
): GroupInfo {
  const skin =
    skins.find((sk) =>
      sk.collectionId
        ? group.categoryIds.includes(sk.collectionId)
        : group.isStoreWide,
    ) ?? null;

  const scoped = groupProducts(group, products);
  const pricing = priceTiers(group, products);

  // The collection this scope points at — for the name, and for somewhere to
  // send the shopper so they can actually start picking.
  const collection = collections
    .map(collectionFields)
    .find((c) => group.categoryIds.includes(c.id));

  // Merchant wording wins, then the promotion's own headline, then the
  // collection name. The headline is bilingual on the payload.
  const headline = group.tiers.find((tier) => tier.headline?.[locale] || tier.headline?.en)
    ?.headline;
  const title =
    skin?.title ||
    asString(headline?.[locale]) ||
    asString(headline?.en) ||
    collection?.name ||
    t("bundle.default_title", "Bundle");

  const smallest = group.tiers[0];
  const requirement =
    skin?.requirement ||
    (collection?.name
      ? t("bundle.any_n_of", "Any {{n}} from {{name}}")
          .replace("{{n}}", String(smallest.quantity))
          .replace("{{name}}", collection.name)
      : t("bundle.any_n", "Any {{n}} items").replace("{{n}}", String(smallest.quantity)));

  const images = skin?.image
    ? [skin.image]
    : scoped
        .flatMap((p) => productImages(p).slice(0, 1))
        .map((i) => i.url)
        .slice(0, 3);

  const href = collection?.slug ? `/collections/${collection.slug}` : "/products";
  const currency = (scoped[0] as unknown as { currency?: string } | undefined)?.currency;

  return {
    group,
    skin,
    title,
    requirement,
    pricing,
    images,
    href,
    currency,
    noun: collection?.name || "",
  };
}

/* ═════════════════════════════════════════════════════════════════════════
   Featured card
   ═════════════════════════════════════════════════════════════════════════ */

function FeaturedOffer({
  info,
  cart,
  t,
}: {
  info: GroupInfo;
  cart: ReturnType<typeof useCart>["cart"];
  t: TFunction;
}) {
  const progress = groupProgress(info.group, cart);
  const strip = info.images.slice(0, 3);

  return (
    <article className="tn-offer-featured">
      {strip.length > 0 && (
        <div className="tn-offer-strip" aria-hidden="true">
          {strip.map((url, i) => (
            <span className="tn-offer-stripcell" key={`${url}-${i}`}>
              <Image src={url} alt="" sizes="240px" loading="lazy" />
            </span>
          ))}
          <span className="tn-badge tn-badge-lime tn-offer-pop">
            {info.skin?.badge || t("bundle.most_popular", "Most popular")}
          </span>
        </div>
      )}

      <div className="tn-offer-featbody">
        <div className="tn-offer-feathead">
          <h2 className="tn-offer-feattitle">{info.title}</h2>
          <Link
            to={info.href}
            className="tn-round-btn tn-offer-go"
            aria-label={t("bundle.start", "Start this bundle")}
          >
            <IconArrowRight size={16} className="tn-flip-rtl" />
          </Link>
        </div>

        <p className="tn-offer-featsub">{info.requirement}</p>

        <div className="tn-offer-tiles">
          {info.pricing.map(({ offer, savingMajor }) => {
            // "Active" is the tier the cart has actually reached, not a
            // decorative highlight — so the card reflects the shopper's state
            // rather than pretending they picked the biggest one.
            const active = progress.reachedTier?.promotionId === offer.promotionId;
            return (
              <div className={cx("tn-offer-tile", active && "is-active")} key={offer.promotionId}>
                <span className="tn-offer-tilelabel">
                  {(info.noun
                    ? t("bundle.n_of", "{{n}} {{name}}").replace("{{name}}", info.noun)
                    : t("bundle.n_items", "{{n}} items")
                  ).replace("{{n}}", String(offer.quantity))}
                </span>
                <span className="tn-offer-tileprice">
                  <Money amount={offer.groupPriceMajor} currency={info.currency} />
                </span>
                {savingMajor !== null && savingMajor > 0 && (
                  <span className="tn-offer-tilesave">
                    {t("product.save", "Save")} <Money amount={savingMajor} currency={info.currency} />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <OfferProgressLine progress={progress} currency={info.currency} t={t} dark />
      </div>
    </article>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Row
   ═════════════════════════════════════════════════════════════════════════ */

function OfferRow({
  info,
  cart,
  t,
}: {
  info: GroupInfo;
  cart: ReturnType<typeof useCart>["cart"];
  t: TFunction;
}) {
  const progress = groupProgress(info.group, cart);
  const first = info.pricing[0];
  const extra = info.pricing.slice(1);
  const image = info.images[0];
  const smallest = info.group.tiers[0];

  return (
    <Link to={info.href} className="tn-card tn-offer-row">
      <span className="tn-plate tn-offer-rowimg">
        {image ? <Image src={image} alt="" sizes="96px" loading="lazy" /> : null}
        {/* How many MORE than one the bundle takes — the reference's "+1"/"+2". */}
        {smallest.quantity > 1 && (
          <span className="tn-offer-qty" aria-hidden="true" dir="ltr">
            {`+${smallest.quantity - 1}`}
          </span>
        )}
      </span>

      <span className="tn-offer-rowbody">
        <span className="tn-offer-rowtitle">{info.title}</span>
        <span className="tn-offer-rowreq">{info.requirement}</span>

        <span className="tn-offer-rowprices">
          <span className="tn-offer-rowprice">
            <Money amount={first.offer.groupPriceMajor} currency={info.currency} />
          </span>
          {first.regularMajor !== null && first.regularMajor > first.offer.groupPriceMajor && (
            <s className="tn-offer-rowwas">
              <Money amount={first.regularMajor} currency={info.currency} />
            </s>
          )}
          {first.savingMajor !== null && first.savingMajor > 0 && (
            <span className="tn-savepill">
              {t("product.save", "Save")} <Money amount={first.savingMajor} currency={info.currency} />
            </span>
          )}
        </span>

        {/* Extra tiers as one line, the way the reference writes
            "Or 3 tees for LE 1,697". */}
        {extra.map(({ offer, savingMajor }) => (
          <span className="tn-offer-rowextra" key={offer.promotionId}>
            {t("bundle.or_n_for", "Or {{n}} for").replace("{{n}}", String(offer.quantity))}{" "}
            <Money amount={offer.groupPriceMajor} currency={info.currency} />
            {savingMajor !== null && savingMajor > 0 && (
              <>
                {" — "}
                {t("product.save", "Save")} <Money amount={savingMajor} currency={info.currency} />
              </>
            )}
          </span>
        ))}

        <OfferProgressLine progress={progress} currency={info.currency} t={t} />
      </span>

      <IconChevronRight size={16} className="tn-flip-rtl tn-offer-chev" />
    </Link>
  );
}

/**
 * Live cart progress for one bundle.
 *
 * Silent until the shopper has actually started — a row that says "add 3 more"
 * before they have touched anything is noise on every row at once. Once an
 * offer is unlocked the saving shown is the ENGINE's applied amount, so the
 * page and the invoice cannot disagree.
 */
function OfferProgressLine({
  progress,
  currency,
  t,
  dark = false,
}: {
  progress: ReturnType<typeof groupProgress>;
  currency?: string;
  t: TFunction;
  dark?: boolean;
}) {
  if (progress.unitsInCart === 0) return null;

  const unlocked = progress.groupsUnlocked > 0;
  return (
    <span className={cx("tn-offer-progress", dark && "is-dark")} role="status" aria-live="polite">
      {unlocked ? (
        progress.savingMajor > 0 ? (
          <>
            {t("bundle.unlocked_saving", "Unlocked — you saved")}{" "}
            <Money amount={progress.savingMajor} currency={currency} />
          </>
        ) : (
          t("bundle.unlocked", "Unlocked")
        )
      ) : (
        t("bundle.add_more", "Add {{n}} more to unlock").replace(
          "{{n}}",
          String(progress.unitsNeeded),
        )
      )}
    </span>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Modal
   ═════════════════════════════════════════════════════════════════════════ */

function BundleModal({
  children,
  onClose,
  label,
}: {
  children: React.ReactNode;
  onClose: () => void;
  label: string;
}) {
  // `useRef`, not a plain object literal: a fresh `{current}` on every render
  // is a new dependency for `useFocusTrap`'s effect, so the trap would tear
  // down and rebuild — re-stealing focus — on every single re-render.
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(true, ref);
  useOverlayBehaviour(true, onClose);

  return (
    <>
      <div className="tn-scrim" onClick={onClose} aria-hidden="true" />
      <div className="tn-bundle-modal" role="dialog" aria-modal="true" aria-label={label} ref={ref}>
        <button type="button" className="tn-round-btn tn-bundle-close" aria-label="Close" onClick={onClose}>
          <IconClose size={18} />
        </button>
        <div className="tn-bundle-modalbody">{children}</div>
      </div>
    </>
  );
}
