"use client";
import { Link } from "@numueg/theme-sdk";
import {
  applyImageTransform,
  asImageTransform,
  asString,
  type ImageTransform,
  type SectionRenderProps,
} from "./_shared";

/** Read an image-picker value's URL. The editor stores it as a plain URL string
 *  (legacy / no-transform) or as `{ url, alt?, transform }` once a focal/zoom/
 *  rotation is set. asString() can't see the object's url, so resolve it here. */
function imagePickerUrl(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && typeof (v as { url?: unknown }).url === "string") {
    return (v as { url: string }).url;
  }
  return "";
}

/**
 * Luxury Minimal collection-strip — ported from the shared V2 collection-strip
 * (image-row of editorial tiles, or a minimal text-strip of links). Re-mapped
 * to the luxury-minimal aesthetic: sharp edges (no rounded corners), uppercase
 * tracked labels, hairline borders. Re-plumbed on the V3 SDK `Link`.
 */
interface Item {
  image: string;
  label: string;
  link: string;
  /** Non-destructive focal/zoom/rotation for this tile's merchant image. */
  transform?: ImageTransform;
}

export default function LuxCollectionStrip({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const title = asString(s.title);
  const layout = (asString(s.layout) || "image-row") as "image-row" | "text-strip";

  const items: Item[] = [];
  for (let i = 1; i <= 4; i++) {
    const raw = s[`item_${i}_image`];
    const image = imagePickerUrl(raw) || asString(raw);
    const label = asString(s[`item_${i}_label`]);
    const link = asString(s[`item_${i}_link`]);
    if (!image && !label) continue;
    items.push({ image, label, link, transform: asImageTransform(raw) });
  }

  if (!items.length) return null;

  if (layout === "text-strip") {
    return (
      <section className="py-3 md:py-4 bg-background border-y border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[10px] md:text-xs tracking-[0.2em] uppercase">
            {title && <span className="font-medium text-foreground">{title}</span>}
            {items.map((it, i) =>
              it.link ? (
                <Link key={i} to={it.link} className="text-muted-foreground hover:text-foreground transition-colors">
                  {it.label}
                </Link>
              ) : (
                <span key={i} className="text-muted-foreground">{it.label}</span>
              ),
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-14 bg-background">
      <div className="container mx-auto px-4">
        {title && (
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground text-center mb-8">
            {title}
          </p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {items.map((it, i) => {
            const card = (
              <div className="relative aspect-[4/5] overflow-hidden bg-[hsl(var(--lux-gray))] group">
                {it.image && (
                  <img
                    src={it.image}
                    alt={it.label}
                    className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${it.transform ? "" : "group-hover:scale-[1.04]"}`}
                    style={applyImageTransform(it.transform, "cover")}
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
                {it.label && (
                  <span className="absolute bottom-3 inset-x-0 text-center text-white text-[10px] md:text-xs font-medium uppercase tracking-[0.25em] px-2">
                    {it.label}
                  </span>
                )}
              </div>
            );
            return it.link ? (
              <Link key={i} to={it.link} className="block">
                {card}
              </Link>
            ) : (
              <div key={i}>{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
