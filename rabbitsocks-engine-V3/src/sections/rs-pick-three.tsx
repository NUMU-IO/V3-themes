"use client";
import { useState } from "react";
import { Money, useCart, useLocale, useProducts, useResolvedSettings, type Product } from "@numueg/theme-sdk";
import { asNumber, asString, localized, productImage, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { Rise, RuleDraw, Stamp, useMotionOn } from "./_motion";

/**
 * Pick 3 (اختار ٣) — Mashkal's merchant-practical bundle builder. Multipack
 * economics for socks/basics stores: the shopper fills N diamond slots from
 * a mini-grid, then adds the whole set to the bag in one tap. The section
 * only STATES the deal ("any 3 for 299") — the actual discount is whatever
 * promotion the merchant configured; checkout math stays platform-owned.
 *
 * Only single-variant products are offered (same rule as quick-add: never
 * pick a size blind). Slots are per-visit UI state, not persisted.
 */
export default function RsPickThree({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const { products } = useProducts();
  const { addItem } = useCart();
  const on = useMotionOn();

  const bundleSize = Math.min(Math.max(asNumber(s.bundle_size, 3), 2), 6);
  const sizeLabel = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(bundleSize);
  const title = asString(s.title) || localized(locale, `Pick ${sizeLabel}`, `اختار ${sizeLabel}`);
  const dealNote =
    asString(s.deal_note) ||
    localized(locale, "Build your set — the bundle deal applies at checkout.", "كوّن طقمك، وخصم الباكدج بيتحسب عند الدفع.");
  const addLabel = asString(s.add_label) || localized(locale, "Add the set to bag", "ضيف الطقم للشنطة");
  const maxItems = Math.min(Math.max(asNumber(s.max_products, 8), 4), 16);

  // Same rule as quick-add: single-variant products only.
  const eligible = products.filter((p) => (p.variants?.length ?? 0) <= 1).slice(0, maxItems);

  const [slots, setSlots] = useState<Product[]>([]);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  if (eligible.length < bundleSize) return null;

  const pick = (p: Product) => {
    setAdded(false);
    setSlots((prev) => (prev.length >= bundleSize ? prev : [...prev, p]));
  };
  const unpick = (idx: number) => {
    setAdded(false);
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  };
  const full = slots.length >= bundleSize;

  const addSet = async () => {
    if (!full || adding) return;
    setAdding(true);
    try {
      // Sequential on purpose: the cart API mutates a shared cart version.
      for (const p of slots) {
        await addItem(p.id, p.variants?.[0]?.id, 1);
      }
      setAdded(true);
      setSlots([]);
    } finally {
      setAdding(false);
    }
  };

  return (
    <section className="py-16 md:py-20 bg-[hsl(var(--rs-navy))] text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mb-8">
          <RuleDraw on={on} className="rs-rule-double !border-white/80 mb-4 [&::after]:!border-white/80 [&::after]:!bg-[hsl(var(--rs-navy))]">
            <span aria-hidden="true" />
          </RuleDraw>
          <h2 className="vn-heading text-3xl md:text-4xl text-white">
            <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
          </h2>
          <p className="mt-2 text-white/75 leading-relaxed">
            <InlineEditable sectionId={sectionId} settingKey="deal_note" value={dealNote} multiline />
          </p>
        </div>

        {/* Slots */}
        <div className="flex items-center gap-4 md:gap-6 mb-10 flex-wrap" role="group" aria-label={title}>
          {Array.from({ length: bundleSize }).map((_, i) => {
            const filled = slots[i];
            return (
              <div key={i} className="rs-slot w-20 md:w-24">
                {filled ? (
                  <button
                    type="button"
                    onClick={() => unpick(i)}
                    aria-label={localized(locale, `Remove ${filled.name}`, `شيل ${filled.name}`)}
                    className="relative w-full h-full rs-clip-diamond overflow-hidden bg-white/10 rs-press"
                  >
                    {productImage(filled) && (
                      <img src={productImage(filled)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/45 text-white text-lg font-bold opacity-0 hover:opacity-100 transition-opacity">
                      ×
                    </span>
                  </button>
                ) : (
                  <div className="rs-slot-empty" aria-hidden="true" />
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={addSet}
            disabled={!full || adding}
            className="vn-btn ms-auto bg-white text-[hsl(var(--rs-navy))] hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="pick-three-add"
          >
            {adding
              ? localized(locale, "Adding…", "بنضيف…")
              : added
                ? localized(locale, "Added ✓", "اتضاف ✓")
                : (
                  <InlineEditable sectionId={sectionId} settingKey="add_label" value={addLabel} />
                )}
          </button>
        </div>

        {/* Mini grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-3 md:gap-4">
          {eligible.map((p, i) => {
            const picked = slots.some((sp) => sp.id === p.id);
            return (
              <Rise key={p.id} on={on} inView delay={Math.min(i, 7) * 0.04} y={14}>
                <button
                  type="button"
                  onClick={() => pick(p)}
                  disabled={full && !picked}
                  aria-label={localized(locale, `Pick ${p.name}`, `اختار ${p.name}`)}
                  className={`group relative w-full aspect-square overflow-hidden bg-white/10 rs-press border transition-colors ${
                    picked ? "border-[var(--vn-accent)]" : "border-white/15 hover:border-white/60"
                  } disabled:opacity-35`}
                >
                  {productImage(p) && (
                    <img src={productImage(p)} alt={p.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  {picked && (
                    <Stamp on={on} className="absolute top-1.5 end-1.5 w-5 h-5 rounded-full bg-[var(--vn-accent)] text-white text-[11px] font-bold flex items-center justify-center">
                      ✓
                    </Stamp>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-start">
                    <span className="block text-[10px] text-white/90 line-clamp-1">{p.name}</span>
                    <span className="block text-[10px] font-bold text-white">
                      <Money amount={p.variants?.[0]?.price ?? p.price ?? 0} currency={p.currency} />
                    </span>
                  </span>
                </button>
              </Rise>
            );
          })}
        </div>
      </div>
    </section>
  );
}
