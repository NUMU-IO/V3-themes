"use client";
import { motion } from "framer-motion";
import { useLocale } from "@numueg/theme-sdk";
import { asString, localized, useDemo, useInsideEditor, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { INK, RuleDraw, Stamp, useMotionOn } from "./_motion";

/**
 * Manshet testimonials — magazine pull-quotes instead of review cards.
 * Reviews are read from the same per-review settings the original section
 * used (review_N_name / _text / _city / _rating) so existing stores keep
 * their content; only the presentation changed: oversized hung quotes in
 * the heading face, a gold foil rule, small-caps attribution.
 */

interface TestimonialReview {
  n: number;
  name: string;
  city: string;
  text: string;
}

const FALLBACK_REVIEWS: Array<Omit<TestimonialReview, "n">> = [
  { name: "Farida El-Sherbiny", city: "Cairo", text: "The coat arrived in two days and looks straight off a magazine page." },
  { name: "Omar Khaled", city: "Alexandria", text: "Sharp cuts, honest fabric. This is my third order this season." },
  { name: "Nour Abdelaziz", city: "Giza", text: "Every piece photographs beautifully. My whole feed asks where it's from." },
];

function getReviewsFromSettings(s: Record<string, unknown>): TestimonialReview[] {
  const reviews: TestimonialReview[] = [];
  for (let i = 1; i <= 3; i++) {
    const name = asString(s[`review_${i}_name`]);
    const text = asString(s[`review_${i}_text`]);
    if (name && text) {
      reviews.push({ n: i, name, city: asString(s[`review_${i}_city`]), text });
    }
  }
  return reviews;
}

export default function EdTestimonials({ instance, sectionId }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const locale = useLocale();
  const demo = useDemo();
  const on = useMotionOn();
  const title = asString(s.title) || localized(locale, "From our readers", "من قرّائنا");

  const inEditor = useInsideEditor();
  let reviews = getReviewsFromSettings(s);
  if (reviews.length === 0 && (demo || inEditor)) {
    reviews = FALLBACK_REVIEWS.map((r, i) => ({ ...r, n: i + 1 }));
  }
  if (reviews.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-[hsl(var(--background))]">
      <div className="container mx-auto px-4">
        <h2 className="vn-eyebrow text-center mb-12">
          <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
        </h2>

        <div className="max-w-4xl mx-auto space-y-14 md:space-y-20">
          {reviews.map((review, i) => (
            <motion.blockquote
              key={review.n}
              initial={on ? { opacity: 0, y: 24 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, ease: INK }}
              className={`max-w-[34ch] ${i % 2 === 1 ? "ms-auto text-end" : ""}`}
            >
              <RuleDraw on={on} delay={0.15} className={`ed-foil-rule mb-5 ${i % 2 === 1 ? "ms-auto" : ""} !w-16`}>
                <span aria-hidden="true" />
              </RuleDraw>
              <p className="ed-pull-quote text-[hsl(var(--foreground))]">
                <Stamp on={on} delay={0.25}><span aria-hidden="true">"</span></Stamp>
                <InlineEditable sectionId={sectionId} settingKey={`review_${review.n}_text`} value={review.text} multiline />
                <span aria-hidden="true">"</span>
              </p>
              <footer className="mt-4 flex items-baseline gap-2 vn-label text-[var(--vn-muted)]"
                style={i % 2 === 1 ? { justifyContent: "flex-end" } : undefined}
              >
                <span className="text-[hsl(var(--foreground))]">
                  <InlineEditable sectionId={sectionId} settingKey={`review_${review.n}_name`} value={review.name} />
                </span>
                {review.city && (
                  <span>
                    <InlineEditable sectionId={sectionId} settingKey={`review_${review.n}_city`} value={review.city} />
                  </span>
                )}
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
