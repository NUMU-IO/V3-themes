/**
 * Wishlist: the heart on every book, the wishlist link on the book page, and
 * the drawer the masthead heart opens.
 *
 * State is the SDK's `useWishlist`, scoped to this store and kept in one
 * shared cache entry, so every heart for a book, the book page link and the
 * masthead count move together. The platform has no wishlist page, so the list
 * opens in a drawer; each row resolves its book through the shared detail cache.
 */

import { Image, Link, Money, useShop, useWishlist } from "@numueg/theme-sdk";
import { createOpenStore, Drawer } from "./cart-drawer";
import { useProductDetail } from "./product-detail";
import { productImages } from "./shared";
import { useT } from "./i18n";
import { IconHeart } from "./ornaments";

const wishlistStore = createOpenStore();
export const setWishlistDrawer = (open: boolean): void => wishlistStore.set(open);

export function useShopWishlist() {
  const shop = useShop();
  return useWishlist(String(shop?.id ?? ""));
}

export function WishlistButton({ productId, variant = "icon" }: { productId: string; variant?: "icon" | "link" }) {
  const t = useT();
  const wishlist = useShopWishlist();
  const saved = wishlist.has(productId);
  const label = saved ? t("product.wishlisted", "Saved to wishlist") : t("product.wishlist", "Add to wishlist");
  const toggle = () => (saved ? wishlist.removeFromWishlist(productId) : wishlist.addToWishlist(productId));

  if (variant === "link") {
    return (
      <button type="button" className="pw-wishlink" aria-pressed={saved} onClick={toggle}>
        <IconHeart size={18} />
        {label}
      </button>
    );
  }
  return (
    <button type="button" className="pw-fav" aria-pressed={saved} aria-label={label} title={label} onClick={toggle}>
      <IconHeart />
    </button>
  );
}

/** Mounted once by main.tsx; renders nothing while closed. */
export function WishlistDrawer() {
  return wishlistStore.useOpen() ? <WishlistPanel /> : null;
}

function WishlistPanel() {
  const t = useT();
  const { items, removeFromWishlist } = useShopWishlist();
  const close = () => setWishlistDrawer(false);

  return (
    <Drawer side="end" title={t("wishlist.title", "Wishlist")} closeLabel={t("drawer.close", "Close")} onClose={close}>
      {items.length === 0 ? (
        <div className="pw-empty">
          <p>{t("wishlist.empty", "No saved books yet. Tap the heart on any book to keep it here.")}</p>
          <Link className="pw-btn pw-btn-primary" to="/products" onClick={close}>
            {t("cart.empty_cta", "Start browsing")}
          </Link>
        </div>
      ) : (
        items.map((item) => (
          <WishlistRow
            key={`${item.product_id}:${item.variant_id ?? ""}`}
            productId={item.product_id}
            onNavigate={close}
            onRemove={() => removeFromWishlist(item.product_id, item.variant_id)}
          />
        ))
      )}
    </Drawer>
  );
}

function WishlistRow({
  productId,
  onNavigate,
  onRemove,
}: {
  productId: string;
  onNavigate: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const { product, failed } = useProductDetail(productId);

  // A book the shop has since removed still sits in the shopper's saved list.
  // Say so and let them clear it, rather than rendering a silent blank row.
  if (failed) {
    return (
      <div className="pw-line">
        <div className="pw-line-media">
          <span className="pw-blank" />
        </div>
        <div>
          <h3>{t("wishlist.unavailable", "This book is no longer available")}</h3>
          <div className="pw-line-actions">
            <button type="button" className="pw-linkbtn" onClick={onRemove}>
              {t("cart.remove", "Remove")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const href = `/products/${product?.slug || productId}`;
  const cover = product ? productImages(product)[0] : undefined;

  return (
    <div className="pw-line">
      <div className="pw-line-media">
        {cover ? (
          <Image src={cover} alt={product?.name ?? ""} responsive={false} loading="lazy" />
        ) : (
          <span className="pw-blank" />
        )}
      </div>
      <div>
        <h3>
          <Link to={href} onClick={onNavigate}>
            {product?.name ?? t("preview.loading", "Loading…")}
          </Link>
        </h3>
        <div className="pw-line-actions">
          <button type="button" className="pw-linkbtn" onClick={onRemove}>
            {t("cart.remove", "Remove")}
          </button>
        </div>
      </div>
      <p className="pw-line-price">
        {product && (
          <b>
            <Money amount={product.price ?? 0} currency={product.currency} />
          </b>
        )}
      </p>
    </div>
  );
}
