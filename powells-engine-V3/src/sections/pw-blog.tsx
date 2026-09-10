/**
 * pw-blog — the shop's writing: the index and a single post.
 *
 * ONE section for both, because which one to render is decided by what the
 * host put in `page.data`, not by a setting: an article page ships `article`,
 * a blog page ships `blog` + `articles`. Two sections would need two templates
 * and would drift.
 *
 * The reference's nav has a BLOG link and it went nowhere designed. A used
 * bookshop's blog IS its merchandising — the staff review is what sells the
 * copy — so this is not decorative content.
 *
 * Article titles, excerpts and bodies are bilingual MAPS (`{en, ar}`), not
 * strings; reading them as strings is how a blog renders "[object Object]".
 */

import { Image, Link, RichText, useArticle, useArticles, useBlog, useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asString,
  isInlineImage,
  useOrnaments,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import { Sprig } from "../lib/ornaments";

/** Pick the active locale out of a bilingual field, falling back to English. */
function pick(field: Record<string, string> | null | undefined, locale: string): string {
  if (!field) return "";
  return field[locale] || field.en || Object.values(field)[0] || "";
}

function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale === "ar" ? "ar-EG" : undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PwBlog({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const locale = useLocale();
  const ornaments = useOrnaments();

  const article = useArticle();
  const blog = useBlog();
  const articles = useArticles();

  /* ── A single post ─────────────────────────────────────────────────── */

  if (article) {
    const title = pick(article.title, locale);
    const body = pick(article.body ?? null, locale);
    const date = formatDate(article.published_at, locale);

    return (
      <article className="pw-container pw-article" style={{ paddingBlock: "38px 90px" }}>
        <nav className="pw-crumbs" aria-label="Breadcrumb">
          <Link to="/">{t("blog.home", "Home")}</Link> ›
          <Link to="/blogs">{blog ? pick(blog.title, locale) : t("blog.title", "Journal")}</Link> ›
          <span>{title}</span>
        </nav>

        <h1 className="pw-article-title">{title}</h1>
        <p className="pw-article-meta">
          {[article.author, date].filter(Boolean).join(" · ")}
        </p>

        {article.image_url && (
          <div className="pw-article-media">
            <Image
              src={article.image_url}
              alt={title}
              priority
              responsive={!isInlineImage(article.image_url)}
            />
          </div>
        )}

        <div className="pw-synopsis pw-article-body">
          {/* Merchant HTML through the SDK sanitizer, never raw innerHTML. */}
          <RichText html={body} />
        </div>

        <Link className="pw-btn pw-btn-ghost" to="/blogs" style={{ marginBlockStart: 34 }}>
          {t("blog.back", "More from the shop")}
        </Link>
      </article>
    );
  }

  /* ── The index ─────────────────────────────────────────────────────── */

  const heading = blog ? pick(blog.title, locale) : asString(s.heading) || t("blog.title", "Journal");

  return (
    <div className="pw-container" style={{ paddingBlock: "38px 80px" }}>
      <div className="pw-page-head">
        <h1>{heading}</h1>
        <span className="pw-rule" />
        {ornaments && (
          <span style={{ color: "var(--pw-ink-soft)", flex: "0 0 auto" }}>
            <Sprig size={52} />
          </span>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="pw-empty">
          <p>{t("blog.empty", "Nothing written yet.")}</p>
          <Link className="pw-btn pw-btn-ghost" to="/products">
            {t("collection.empty_cta", "Browse everything")}
          </Link>
        </div>
      ) : (
        <div className="pw-posts">
          {articles.map((entry) => {
            const title = pick(entry.title, locale);
            const excerpt = pick(entry.excerpt ?? null, locale);
            const date = formatDate(entry.published_at, locale);
            return (
              <Link className="pw-post" to={`/blogs/${entry.handle}`} key={entry.handle}>
                {entry.image_url ? (
                  <Image
                    src={entry.image_url}
                    alt={title}
                    loading="lazy"
                    responsive={!isInlineImage(entry.image_url)}
                    aspectRatio="4/3"
                  />
                ) : (
                  <span className="pw-tile-plate" aria-hidden="true">
                    {title.slice(0, 1)}
                  </span>
                )}
                <h2>{title}</h2>
                {[entry.author, date].filter(Boolean).length > 0 && (
                  <p className="pw-article-meta">{[entry.author, date].filter(Boolean).join(" · ")}</p>
                )}
                {excerpt && <p className="pw-byline">{excerpt}</p>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
