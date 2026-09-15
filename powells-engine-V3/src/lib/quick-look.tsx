/**
 * Quick look — size up a book, pick an edition and add it without leaving the
 * shelf. The shelf is where discovery happens; a round trip to the book page
 * is where it stops.
 *
 * Built on this theme's drawer shell and edition picker rather than a second
 * modal and a second picker, so the book page and quick look cannot disagree
 * about which copy is being bought. Nothing loads until it opens: the detail
 * route (editions, options, gallery) is fetched on open and shared with
 * quick-add through product-detail.ts.
 */

import { useState } from "react";
import { Image, Link, useCart, type Product } from "@numueg/theme-sdk";
import { Drawer, setCartDrawer } from "./cart-drawer";
import { useProductDetail } from "./product-detail";
import { BookJacket } from "./jacket";
import { useBookOffer } from "./promotions";
import { asString, productAuthor, productImages } from "./shared";
import { buyLabel, EditionList, OptionChips, PriceLine, QtyStepper, useVariantPicker } from "./variants";
import { useT } from "./i18n";

export function QuickLook({ product, onClose }: { product: Product; onClose: () => void }) {
  const t = useT();
  const { product: detail, failed } = useProductDetail(String(product.id));
  const href = `/products/${product.slug ?? product.id}`;

  return (
    <Drawer
      side="end"
      modal
      wide
      title={t("preview.title", "Quick look")}
      closeLabel={t("drawer.close", "Close")}
      onClose={onClose}
    >
      {detail ? (
        <QuickLookBody key={detail.id} product={detail} href={href} onClose={onClose} />
      ) : failed ? (
        <div className="pw-empty">
          <p>{t("preview.failed", "We couldn't load this book right now.")}</p>
          <Link className="pw-btn pw-btn-ghost" to={href} onClick={onClose}>
            {t("preview.full", "View full details")}
          </Link>
        </div>
      ) : (
        <p className="pw-note">{t("preview.loading", "Loading…")}</p>
      )}
    </Drawer>
  );
}

function QuickLookBody({ product, href, onClose }: { product: Product; href: string; onClose: () => void }) {
  const t = useT();
  const { addItem, loading } = useCart();
  const picker = useVariantPicker(product);
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);

  const images = productImages(product);
  const cover = images[imageIndex] ?? images[0];
  const author = productAuthor(product);
  const shownQty = Math.min(qty, picker.maxQty);
  const offer = useBookOffer(
    String(product.id),
    asString((product as unknown as Record<string, unknown>).category_id),
    picker.price,
    picker.currency,
  );

  const onAdd = async () => {
    if (!picker.inStock || picker.unavailableCombo) return;
    const result = await addItem(
      String(product.id),
      picker.chosen ? String(picker.chosen.id) : undefined,
      shownQty,
      picker.optionValues,
    );
    if (result?.ok) {
      onClose();
      setCartDrawer(true);
    }
  };

  return (
    <div className="pw-look">
      <div className="pw-look-media">
        <div className="pw-pdp-stage">
          {cover ? (
            <Image src={cover} alt={product.name} responsive={false} />
          ) : (
            <BookJacket title={product.name} author={author} />
          )}
        </div>
        {images.length > 1 && (
          <div className="pw-pdp-thumbs">
            {images.slice(0, 5).map((src, i) => (
              <button
                key={src}
                type="button"
                aria-current={i === imageIndex}
                aria-label={`${product.name} — ${i + 1}`}
                onClick={() => setImageIndex(i)}
              >
                <Image src={src} alt="" responsive={false} loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="pw-look-title">{product.name}</p>
      {author && (
        <p className="pw-pdp-author">
          {t("product.by", "by")} <i>{author}</i>
        </p>
      )}
      <PriceLine picker={picker} />
      {offer && <p className="pw-offer">{offer}</p>}

      <OptionChips picker={picker} />
      <EditionList picker={picker} productName={product.name} />

      <div className="pw-buyrow">
        <QtyStepper value={shownQty} max={picker.maxQty} onChange={setQty} />
        <button
          type="button"
          className="pw-btn pw-btn-primary"
          disabled={!picker.inStock || picker.unavailableCombo || loading}
          onClick={onAdd}
        >
          {buyLabel(picker, t, false, loading)}
        </button>
      </div>

      <Link className="pw-linkbtn pw-look-full" to={href} onClick={onClose}>
        {t("preview.full", "View full details")}
      </Link>
    </div>
  );
}
