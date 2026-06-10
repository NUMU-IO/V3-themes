"use client";

import { useMemo } from "react";
import { sanitizeHtml, useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import { asString, usePageData, type SectionRenderProps } from "./_shared";

/**
 * emp-rich-text — generic prose section, and the body of the `page` template.
 *
 * Phase 4.4b (A1): on a content-page route the host passes the real CMS Page
 * record via the page context (`usePageData()`). This section then renders that
 * page's bilingual title + body (the merchant authored it in Online Store →
 * Pages) INSTEAD of its own setting. On any other surface (no page context) it
 * falls back to its `content` setting, so it still works as a generic prose
 * block placed anywhere in any template.
 *
 * Body is rich-text HTML, sanitized via the SDK's sanitizeHtml before
 * dangerouslySetInnerHTML (defense-in-depth against scripts/handlers).
 */
const EmpRichText = ({ instance }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const pageCtx = usePageData();

  // Real CMS page (only on /pages/<handle> — host sets page.type "page").
  const cmsPage = pageCtx?.type === "page" ? pageCtx.data?.page : null;
  const cmsTitle = cmsPage
    ? cmsPage.title_i18n?.[locale] || cmsPage.title || pageCtx?.title || ""
    : "";
  const cmsBody = cmsPage
    ? cmsPage.body_i18n?.[locale] || cmsPage.body || ""
    : "";

  // CMS body wins; generic placements fall back to the section's own setting.
  const content = cmsBody || asString(s.content);

  // Defence-in-depth: even though merchant content goes through an
  // authenticated admin path, sanitize before we render-as-HTML so a
  // compromised admin account can't inject scripts/event handlers into
  // customer pages. SSR-safe: DOMPurify falls back to identity when
  // window is undefined.
  const safeHtml = useMemo(() => sanitizeHtml(content), [content]);

  // Nothing to show (generic section, no CMS page, no content) → render
  // nothing, matching the prior behaviour.
  if (!cmsTitle && !content) return null;

  return (
    <section className="py-12 md:py-16 lg:py-24 bg-[var(--emp-cream)]">
      <div className="container mx-auto px-4 max-w-3xl">
        {cmsTitle && (
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--emp-dark)] mb-6 md:mb-8">
            {cmsTitle}
          </h1>
        )}
        {content && (
          <div
            className="prose prose-sm sm:prose-base md:prose-lg max-w-none text-[var(--emp-dark)]"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        )}
      </div>
    </section>
  );
};

export default EmpRichText;
