/**
 * pw-series-feature — "Complete the series".
 *
 * Each block names one book; the section shows that book's whole series in
 * reading order — numbered covers, the author, and Buy complete series. The
 * series itself comes from the platform, so adding a volume to it in the admin
 * updates this row without touching the section.
 */

import { Image, Link, useResolvedSettings } from "@numueg/theme-sdk";
import { asString, productAuthor, readBlockNodes, useOrnaments, type SectionRenderProps } from "../lib/shared";
import { BookJacket } from "../lib/jacket";
import { useProductDetail } from "../lib/product-detail";
import { BuySeriesButton, seriesOf, volumeNumber } from "../lib/series";
import { slugOf } from "../lib/shelf-books";
import { fill, useT } from "../lib/i18n";
import { Twinkle } from "../lib/ornaments";

function SeriesRow({ handle }: { handle: string }) {
  const t = useT();
  const { product } = useProductDetail(handle);
  const series = seriesOf(product);
  if (!product || !series) return null;
  const first = series.products[0];
  const author = productAuthor(product);

  return (
    <article className="pw-seriesfeat">
      <div className="pw-seriesfeat-copy">
        <p className="pw-kicker">{fill(t("series.count", "{{count}} books"), { count: series.products.length })}</p>
        <h3>{series.name}</h3>
        {author && <p className="pw-byline">{author}</p>}
        <div className="pw-seriesfeat-actions">
          <BuySeriesButton series={series} />
          {first && (
            <Link className="pw-linkbtn" to={`/products/${first.slug}`}>
              {t("series.start", "Start with book one")}
            </Link>
          )}
        </div>
      </div>
      <ol className="pw-seriesfeat-books">
        {series.products.map((book) => (
          <li key={book.product_id}>
            <Link to={`/products/${book.slug}`}>
              <span className="num">{volumeNumber(book.volume_label, book.position)}</span>
              <span className="cover">
                {book.cover_image_url ? (
                  <Image src={book.cover_image_url} alt={book.name} responsive={false} loading="lazy" />
                ) : (
                  <BookJacket title={book.name} author={author} />
                )}
              </span>
              <span className="title">{book.name}</span>
            </Link>
          </li>
        ))}
      </ol>
    </article>
  );
}

export default function PwSeriesFeature({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const ornaments = useOrnaments();
  const handles = readBlockNodes(instance, "series")
    .map((block) => slugOf(asString(block.settings.book)))
    .filter(Boolean);
  if (handles.length === 0) return null;

  const heading = asString(s.heading);
  const body = asString(s.body);

  return (
    <section className="pw-section">
      <div className="pw-section-head">
        {ornaments && (
          <span style={{ color: "var(--pw-ink-soft)", flex: "0 0 auto" }}>
            <Twinkle size={20} />
          </span>
        )}
        {heading && <h2>{heading}</h2>}
        <span className="pw-rule" />
      </div>
      {body && <p className="pw-section-lede">{body}</p>}
      <div className="pw-seriesfeat-list">
        {handles.map((handle) => (
          <SeriesRow key={handle} handle={handle} />
        ))}
      </div>
    </section>
  );
}
