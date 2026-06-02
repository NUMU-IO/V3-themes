"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { asString, type SectionRenderProps } from "./_shared";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GildedNewsletter = ({ instance }: SectionRenderProps) => {
  const s = instance.settings ?? {};

  const title = asString(s.title) || "Newsletter";
  const subtitle = asString(s.subtitle) || "Join the empire. Be first to know.";
  const buttonText = asString(s.button_text) || "Join";
  const placeholder = asString(s.placeholder) || "Your email";

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) return;
    setSubmitted(true);
  };

  return (
    <section className="py-12 md:py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-xl mx-auto text-center">
          <h5 className="text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase text-muted-foreground mb-3 md:mb-4">
            {title}
          </h5>
          <p className="text-sm text-muted-foreground mb-6">
            {subtitle}
          </p>

          {submitted ? (
            <div className="flex items-center justify-center gap-2 h-12 text-sm font-semibold text-[hsl(var(--olive))]">
              <Check className="h-5 w-5" />
              <span>Successfully subscribed</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row max-w-md mx-auto gap-2 sm:gap-0">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                placeholder={placeholder}
                dir="ltr"
                className="flex-1 bg-transparent border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[hsl(var(--gold))] transition-colors"
              />
              <button
                onClick={handleSubmit}
                className="bg-[hsl(var(--gold))] text-foreground px-6 py-3 text-xs font-semibold tracking-[0.15em] uppercase hover:bg-[hsl(var(--gold-dark))] transition-colors"
              >
                {buttonText}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default GildedNewsletter;
