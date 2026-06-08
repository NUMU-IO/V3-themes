"use client";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { useLocale } from "@numueg/theme-sdk";
import { asString, localized, type SectionRenderProps } from "./_shared";

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

const GildedTestimonials = ({ instance }: SectionRenderProps) => {
  const s = instance.settings ?? {};
  const locale = useLocale();
  const title = asString(s.title) || localized(locale, "What Our Clients Say", "آراء عملائنا");
  const reviews = getReviewsFromSettings(s);

  if (reviews.length === 0) return null;

  return (
    <section className="py-12 md:py-20 lg:py-32 bg-card">
      <div className="container mx-auto px-4">
        {/* Section heading */}
        <div className="text-center mb-10 md:mb-16">
          <p className="text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase text-muted-foreground mb-3 md:mb-4">
            {localized(locale, "Testimonials", "شهادات العملاء")}
          </p>
          <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-foreground uppercase tracking-[0.04em] sm:tracking-[0.08em]">
            {title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {reviews.map((review, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.4 }}
              className="border border-border p-5 sm:p-6 md:p-8 relative group hover:border-[hsl(var(--gold))]/30 transition-colors duration-300"
            >
              {/* Decorative quote icon */}
              <div className="absolute top-6 left-6">
                <Quote
                  size={28}
                  className="text-[hsl(var(--gold))]/10"
                />
              </div>

              {/* Stars */}
              <div className="flex items-center gap-1 mb-6">
                {Array.from({ length: review.rating }).map((_, j) => (
                  <Star
                    key={j}
                    size={14}
                    className="fill-[hsl(var(--gold))] text-[hsl(var(--gold))]"
                  />
                ))}
              </div>

              {/* Review text */}
              <p className="text-sm text-foreground leading-relaxed mb-6">
                &ldquo;{review.text}&rdquo;
              </p>

              {/* Reviewer info */}
              <div className="flex items-center gap-3 pt-4 border-t border-border/60">
                <div className="w-9 h-9 bg-[hsl(var(--gold))] flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground">
                    {review.name[0]}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground tracking-[0.05em]">
                    {review.name}
                  </p>
                  {review.city && (
                    <p className="text-[10px] text-muted-foreground">
                      {review.city}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GildedTestimonials;
