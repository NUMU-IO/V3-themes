"use client";

import { useMemo } from "react";
import { sanitizeHtml, useResolvedSettings } from "@numueg/theme-sdk";
import { asString, type SectionRenderProps } from "./_shared";

const EmpRichText = ({ instance }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const content = asString(s.content);

  // Defence-in-depth: even though merchant content goes through an
  // authenticated admin path, sanitize before we render-as-HTML so a
  // compromised admin account can't inject scripts/event handlers into
  // customer pages. SSR-safe: DOMPurify falls back to identity when
  // window is undefined.
  const safeHtml = useMemo(() => sanitizeHtml(content), [content]);

  if (!content) return null;

  return (
    <section className="py-12 md:py-16 lg:py-24 bg-[var(--emp-cream)]">
      <div className="container mx-auto px-4 max-w-3xl">
        <div
          className="prose prose-sm sm:prose-base md:prose-lg max-w-none text-[var(--emp-dark)]"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </div>
    </section>
  );
};

export default EmpRichText;
