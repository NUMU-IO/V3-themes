"use client";
import { Link, Money, useLocale, useProducts, useResolvedSettings } from "@numueg/theme-sdk";
import { asNumber, asString, localized, productImage, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { Aperture, Rise, RuleDraw, useMotionOn } from "./_motion";

/**
 * Gallery Wall (حيط المعرض) — Mashkal's signature showcase. Products hang
 * like pieces on a gallery wall, each in a different geometric frame (the
 * shapes cycle arch → diamond → circle), with a specimen plaque underneath:
 * № — name — price. Hovering relaxes the shape to the full rectangle so the
 * product steps out of its frame. Deliberately airy: max 6 pieces; this is
 * the "look at it" section, the grids elsewhere do the heavy selling.
 */

const SHAPES = ["arch", "diamond", "circle"] as const;
type Shape = (typeof SHAPES)[number];

function ShapePane({ shape, image, alt }: { shape: Shape; image?: string; alt: string }) {
  if (shape === "diamond") {
    return (
      <div className="relative aspect-square">
        <svg viewBox="0 0 100 100" className="rs-frame-line text-[hsl(var(--foreground))]" aria-hidden="true">
          <polygon points="50,1 99,50 50,99 1,50" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="absolute inset-[9%] rs-clip-diamond rs-morph bg-[var(--rs-surface-high)]">
          {image && <img src={image} alt={alt} loading="lazy" className="w-full h-full object-cover" />}
        </div>
      </div>
    );
  }
  if (shape === "circle") {
    return (
      <div className="relative aspect-square p-[4%]">
        <div className="absolute inset-0 rounded-full border border-[hsl(var(--rs-line))]" aria-hidden="true" />
        <div className="w-full h-full rs-clip-circle rs-morph bg-[var(--rs-surface-high)]">
          {image && <img src={image} alt={alt} loading="lazy" className="w-full h-full object-cover" />}
        </div>
      </div>
    );
  }
  return (
    <div className="relative aspect-[4/5] p-[4%]">
      <div className="absolute inset-0 rs-clip-arch border border-[hsl(var(--rs-line))]" aria-hidden="true" />
      <div className="w-full h-full rs-clip-arch rs-morph bg-[var(--rs-surface-high)]">
        {image && <img src={image} alt={alt} loading="lazy" className="w-full h-full object-cover" />}
      </div>
    </div>
  );
}

export default function RsGalleryWall({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const { products } = useProducts();
  const on = useMotionOn();

  const title = asString(s.title) || localized(locale, "The wall", "الحيطة");
  const intro = asString(s.intro);
  const count = Math.min(Math.max(asNumber(s.count, 3), 2), 6);
  const manualIds = Array.isArray(s.product_ids)
    ? (s.product_ids as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  const pieces = (
    manualIds.length > 0
      ? manualIds.map((id) => products.find((p) => p.id === id || p.slug === id)).filter((p): p is NonNullable<typeof p> => !!p)
      : products
  ).slice(0, count);

  if (pieces.length === 0) return null;

  const numberFor = (i: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { minimumIntegerDigits: 2 }).format(i + 1);

  return (
    <section className="py-16 md:py-24 bg-[hsl(var(--background))]">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mb-10 md:mb-14">
          <RuleDraw on={on} className="rs-rule-double mb-4">
            <span aria-hidden="true" />
          </RuleDraw>
          <h2 className="vn-heading text-3xl md:text-4xl">
            <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
          </h2>
          {intro && (
            <p className="mt-3 text-[var(--vn-muted)] leading-relaxed max-w-[52ch]">
              <InlineEditable sectionId={sectionId} settingKey="intro" value={intro} multiline />
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-12 md:gap-x-10 md:gap-y-16 items-end">
          {pieces.map((product, i) => {
            const shape = SHAPES[i % SHAPES.length];
            return (
              <Rise key={product.id} on={on} inView delay={(i % 3) * 0.1} y={26}>
                <Link
                  to={`/product/${product.slug || product.id}`}
                  className="rs-morph-host group block"
                  data-testid="storefront-product-card"
                >
                  <Aperture on={on} delay={(i % 3) * 0.1}>
                    <ShapePane shape={shape} image={productImage(product)} alt={product.name} />
                  </Aperture>
                  {/* Specimen plaque */}
                  <figcaption className="mt-4 flex items-baseline justify-between gap-3 border-t border-[var(--vn-border)] pt-3">
                    <span className="rs-spec shrink-0">{numberFor(i)}</span>
                    <span className="flex-1 text-sm font-medium text-[hsl(var(--foreground))] line-clamp-1 group-hover:underline underline-offset-4">
                      {product.name}
                    </span>
                    <span className="text-sm font-bold text-[var(--vn-accent)] whitespace-nowrap">
                      <Money amount={product.variants?.[0]?.price ?? product.price ?? 0} currency={product.currency} />
                    </span>
                  </figcaption>
                </Link>
              </Rise>
            );
          })}
        </div>
      </div>
    </section>
  );
}
