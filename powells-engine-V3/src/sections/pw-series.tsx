import { Image, Link, Money, type ProductSeries } from "@numueg/theme-sdk";
import { asString, usePageData, type SectionRenderProps } from "../lib/shared";

export default function PwSeries({}: SectionRenderProps) {
  const series = usePageData()?.data?.series as ProductSeries | undefined;
  if (!series) {
    return <div className="pw-container pw-synopsis">Series not found.</div>;
  }

  return (
    <main className="pw-container" style={{ paddingBlock: "42px 80px" }}>
      <header className="pw-editorial-head">
        <div>
          <p className="pw-kicker">Reading order</p>
          <h1>{series.name}</h1>
          {series.description && <p className="pw-synopsis">{series.description}</p>}
        </div>
        {series.cover_image_url && (
          <Image src={series.cover_image_url} alt={series.name} responsive={false} />
        )}
      </header>

      <ol className="pw-grid" aria-label={`${series.name} books`}>
        {series.products.map((book) => (
          <li key={book.product_id}>
            <Link to={`/products/${book.slug}`} className="pw-book-card">
              <span className="pw-kicker">
                Book {book.volume_label || book.position}
              </span>
              {book.cover_image_url && (
                <Image src={book.cover_image_url} alt="" responsive={false} />
              )}
              <h2>{book.name}</h2>
              {book.price != null && (
                <Money
                  amount={Number(book.price)}
                  currency={asString(book.price_currency) || undefined}
                />
              )}
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
