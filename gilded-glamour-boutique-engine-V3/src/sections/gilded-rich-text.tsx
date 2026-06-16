"use client";

import { useMemo } from "react";
import { sanitizeHtml, useLocale } from "@numueg/theme-sdk";
import { asString, usePageData, type SectionRenderProps } from "./_shared";

/**
 * gilded-rich-text — generic prose section, and the body of the `page` template.
 *
 * On a content-page route the storefront forwards the real CMS Page record via
 * the page context (`usePageData()`); this section renders that page's
 * bilingual title + body (authored in Online Store → Pages) so About / Contact
 * / Policy pages get the Gilded treatment. On any other surface it falls back
 * to its `content` setting, so it also works as a generic prose block placed
 * anywhere.
 *
 * Body is rich-text HTML, sanitized via the SDK's sanitizeHtml before
 * dangerouslySetInnerHTML (defence-in-depth against scripts/handlers).
 */
export default function GildedRichText({ instance }: SectionRenderProps) {
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
    <section
      className="bg-background py-16 md:py-24"
      data-testid="storefront-page"
    >
      <div className="container mx-auto px-4 max-w-3xl">
        {cmsTitle && (
          <>
            <h1 className="vn-heading text-3xl md:text-4xl text-[var(--vn-ink)] text-center">
              {cmsTitle}
            </h1>
            <div className="w-12 h-px bg-[hsl(var(--gold))] mx-auto mt-5 mb-10" />
          </>
        )}
        {content && (
          <div
            className="prose prose-sm sm:prose-base max-w-none text-[var(--vn-muted)] prose-headings:vn-heading prose-headings:text-[var(--vn-ink)] prose-a:text-[hsl(var(--gold))] prose-strong:text-[var(--vn-ink)]"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        )}
      </div>
    </section>
  );
}
