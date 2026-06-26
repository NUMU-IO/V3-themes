import { useState } from "react";
import { EditableText } from "@numueg/theme-sdk";
import type { EmpSectionProps } from "../lib/section";

interface NewsletterSettings {
  title?: string;
  subtitle?: string;
  button_text?: string;
  placeholder?: string;
}

/** Black newsletter block — centered uppercase headline, muted subtitle and a
 *  pill email field + light submit button. Submission is handled client-side
 *  (swap in the host's marketing endpoint when wiring a real list). */
export default function Newsletter({ id, settings }: EmpSectionProps) {
  const s = settings as NewsletterSettings;
  const title = s.title ?? "اشترك في نشرتنا";
  const subtitle = s.subtitle ?? "اعرف أول واحد عن العروض والمنتجات الجديدة";
  const buttonText = s.button_text ?? "اشترك";
  const placeholder = s.placeholder ?? "البريد الإلكتروني";

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <section className="empire-news">
      <div className="empire-container">
        <div className="empire-news__inner">
          <EditableText
            as="h2"
            className="empire-news__title"
            sectionId={id}
            settingId="title"
            value={title}
          />
          <EditableText
            as="p"
            className="empire-news__sub"
            sectionId={id}
            settingId="subtitle"
            value={subtitle}
          />

          {submitted ? (
            <p style={{ fontWeight: 600 }}>شكراً لاشتراكك! 🎉</p>
          ) : (
            <form className="empire-news__form" onSubmit={onSubmit}>
              <input
                className="empire-news__input"
                type="email"
                dir="ltr"
                required
                value={email}
                placeholder={placeholder}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="empire-btn-light" type="submit">
                <EditableText
                  as="span"
                  sectionId={id}
                  settingId="button_text"
                  value={buttonText}
                />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
