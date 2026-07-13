"use client";
/**
 * _quick-add — one-tap add-to-cart button for product-grid cards (A8).
 *
 * Fewer clicks → more items per session: the classic grid quick-add. Rendered
 * INSIDE a card that is itself a <Link>, so the click must preventDefault +
 * stopPropagation or it would navigate instead of adding.
 *
 * Only single-variant products quick-add — picking a size/colour blind adds
 * the wrong thing, so multi-variant products render nothing here and the card
 * click keeps leading to the PDP (same rule as the cart rail).
 */
import { useState } from "react";
import { useCart, type Product } from "@numueg/theme-sdk";
import { Check, Plus } from "lucide-react";
import { localized } from "./_shared";

export function QuickAddButton({ product, locale }: { product: Product; locale: string }) {
  const { addItem } = useCart();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  if ((product.variants?.length ?? 0) > 1) return null;
  if (product.in_stock === false) return null;

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (state !== "idle") return;
    setState("busy");
    try {
      await addItem(product.id, product.variants?.[0]?.id, 1);
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("idle");
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "busy"}
      aria-label={localized(locale, `Add ${product.name} to bag`, `أضيفي ${product.name} للشنطة`)}
      data-testid="storefront-quick-add"
      className="absolute bottom-2.5 end-2.5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[var(--vn-ink)] shadow-md transition-all hover:bg-white md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 disabled:opacity-60"
    >
      {state === "done" ? (
        <Check size={16} aria-hidden="true" />
      ) : state === "busy" ? (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-[var(--vn-ink)] border-t-transparent animate-spin" aria-hidden="true" />
      ) : (
        <Plus size={16} aria-hidden="true" />
      )}
    </button>
  );
}
