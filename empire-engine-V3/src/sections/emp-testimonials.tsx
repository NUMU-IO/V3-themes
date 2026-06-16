"use client";

import { Star } from "lucide-react";
import { useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asNumber,
  asString,
  localized,
  readBlocks,
  useDemo,
  type SectionRenderProps,
} from "./_shared";
import { InlineEditable } from "./_inline-editable";

interface Review {
  name: string;
  city: string;
  text: string;
  rating: number;
}

const fallbackReviews = (locale: string | undefined): Review[] => [
  { name: localized(locale, "Sarah A.", "سارة أ."), city: localized(locale, "Cairo", "القاهرة"), text: localized(locale, "The quality exceeded my expectations. Fast delivery too!", "الجودة فاقت توقعاتي. والتوصيل كمان كان سريع!"), rating: 5 },
  { name: localized(locale, "Mohamed K.", "محمد ك."), city: localized(locale, "Alexandria", "الإسكندرية"), text: localized(locale, "First time ordering online and it was perfect. Exactly as described.", "أول مرة أطلب أونلاين وكانت تجربة ممتازة. زي الوصف بالظبط."), rating: 5 },
  { name: localized(locale, "Nour H.", "نور ح."), city: localized(locale, "Mansoura", "المنصورة"), text: localized(locale, "Great prices and accurate sizing. WhatsApp support was very helpful.", "أسعار حلوة والمقاسات مظبوطة. ودعم الواتساب ساعدني جدًا."), rating: 4 },
];

const clampRating = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(5, Math.round(n)));
};

/**
 * emp-testimonials — faithful V3 port of V2 EmpTestimonials
 * (numu-egyptian-bazaar/src/themes/empire/sections/testimonials/EmpTestimonials.tsx).
 *
 * A WHITE `py-12` section, centered `font-black uppercase` title, then a
 * 3-up grid of light review cards (`bg-[hsl(var(--background))]` off-white,
 * hairline border, `rounded-xl`). Each card: a row of BLACK stars (filled
 * up to the rating, the rest hollow), the quote, then a BLACK avatar circle
 * with the reviewer's first initial + name + city. NOT the navy quote-cards
 * it inherited from the Bazar clone.
 *
 * Reviews come from editor `review` blocks; fall back to a curated demo set
 * (neutral placeholders outside demo mode).
 */
const EmpTestimonials = ({ instance, sectionId }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const demo = useDemo();
  const locale = useLocale();
  const title = asString(s.title) || localized(locale, "WHAT THEY SAY", "رأي عملائنا");

  const configured: Review[] = readBlocks(instance, "review")
    .map((r) => ({
      name: asString(r.name),
      city: asString(r.city),
      text: asString(r.text),
      rating: clampRating(asNumber(r.rating, 5)),
    }))
    .filter((r) => r.name && r.text);

  // Configured review blocks win. Otherwise show the curated demo set ONLY in
  // marketplace preview (demo) — on an installed store with no reviews yet we
  // render nothing rather than empty/placeholderized cards (stars with blank
  // text looked broken). The merchant adds `review` blocks to populate it.
  const reviews =
    configured.length > 0
      ? configured
      : demo
        ? fallbackReviews(locale).map((r) => ({ ...r, rating: clampRating(r.rating) }))
        : [];

  if (reviews.length === 0) return null;

  return (
    <section className="py-12 bg-white" data-emp-section={sectionId}>
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-black text-center mb-8 uppercase tracking-tight">
          <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reviews.map((review, i) => (
            <div
              key={`${review.name}-${i}`}
              className="bg-[hsl(var(--background))] rounded-xl border border-[hsl(var(--border))] p-6"
            >
              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-4" aria-label={`${review.rating} / 5`}>
                {Array.from({ length: review.rating }).map((_, j) => (
                  <Star key={`f${j}`} size={14} className="fill-black text-black" />
                ))}
                {Array.from({ length: 5 - review.rating }).map((_, j) => (
                  <Star key={`e${j}`} size={14} className="fill-transparent text-[hsl(var(--border))]" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-foreground leading-relaxed mb-5">
                &ldquo;{review.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">{review.name[0]}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{review.name}</p>
                  {review.city && (
                    <p className="text-[10px] text-muted-foreground truncate">{review.city}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EmpTestimonials;
