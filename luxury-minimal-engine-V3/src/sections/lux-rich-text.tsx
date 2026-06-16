"use client";

import { useMemo } from "react";
import { sanitizeHtml, useLocale } from "@numueg/theme-sdk";
import { asString, usePageData, type SectionRenderProps } from "./_shared";

/**
 * lux-rich-text — generic prose section, and the body of the `page` template.
 *
 * On a content-page route the storefront forwards the real CMS Page record via
 * the page context (`usePageData()`); this section renders that page's
 * bilingual title + body (authored in Online Store → Pages) so About / Contact
 * / Policy pages get the Luxury Minimal treatment. On any other surface it
 * falls back to its `content` setting, so it also works as a generic prose
 * block placed anywhere.
 *
 * Body is rich-text HTML, sanitized via the SDK's sanitizeHtml before
 * dangerouslySetInnerHTML (defence-in-depth against scripts/handlers).
 */
export default function LuxRichText({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const locale = useLocale();
  const pageCtx = usePageData();

  const cmsPage = pageCtx?.type === "page" ? pageCtx.data?.page : null;
  const cmsTitle = cmsPage
    ? cmsPage.title_i18n?.[locale] || cmsPage.title || pageCtx?.title || ""
    : asString(s.title);
  const cmsBody = cmsPage
    ? cmsPage.body_i18n?.[locale] || cmsPage.body || ""
    : "";

  const content = cmsBody || asString(s.content);
  const safeHtml = useMemo(() => sanitizeHtml(content), [content]);

  if (!cmsTitle && !content) return null;

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-3xl">
        {cmsTitle && (
          <h1 className="lux-heading text-3xl md:text-4xl text-foreground mb-8 text-center">
            {cmsTitle}
          </h1>
        )}
        {content && (
          <div
            className="prose prose-sm sm:prose-base max-w-none text-muted-foreground prose-headings:lux-heading prose-headings:text-foreground prose-a:text-foreground"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        )}
      </div>
    </section>
  );
}
