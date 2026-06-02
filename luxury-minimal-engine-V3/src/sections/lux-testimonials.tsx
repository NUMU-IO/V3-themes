"use client";
import { Star } from "lucide-react";
import { asString, type SectionRenderProps } from "./_shared";

/**
 * Luxury Minimal testimonials — faithful port of the V2 LuxTestimonials
 * (centered eyebrow + 3-up bordered review cards with stars, italic quote,
 * hairline divider, name + city). V2 className strings kept verbatim. The V2
 * `getReviewsFromSettings` helper is inlined (reads review_N_* keys); the
 * section hides itself when no reviews are configured, exactly like V2.
 */

interface TestimonialReview {
  name: string;
  city: string;
  text: string;
  rating: number;
}

function getReviewsFromSettings(s: Record<string, unknown>): TestimonialReview[] {
  const reviews: TestimonialReview[] = [];
  for (let i = 1; i <= 3; i++) {
    const name = s[`review_${i}_name`] as string | undefined;
    const text = s[`review_${i}_text`] as string | undefined;
    if (name && text) {
      reviews.push({
        name,
        city: (s[`review_${i}_city`] as string) ?? "",
        text,
        rating: (s[`review_${i}_rating`] as number) ?? 5,
      });
    }
  }
  return reviews;
}

export default function LuxTestimonials({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const title = asString(s.title) || "رأي عملاءنا";
  const reviews = getReviewsFromSettings(s);

  if (reviews.length === 0) return null;

  return (
    <section className="py-14 bg-foreground/[0.02]">
      <div className="container mx-auto px-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground text-center mb-8">
          {title}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((review, i) => (
            <div key={i} className="border border-foreground/8 p-6 text-center">
              <div className="flex items-center justify-center gap-0.5 mb-4">
                {Array.from({ length: review.rating }).map((_, j) => (
                  <Star key={j} size={12} className="fill-foreground/70 text-foreground/70" />
                ))}
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed mb-4 italic">
                "{review.text}"
              </p>
              <div className="w-8 h-px bg-foreground/15 mx-auto mb-3" />
              <p className="text-xs font-medium tracking-wide">{review.name}</p>
              {review.city && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{review.city}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
