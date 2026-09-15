/**
 * The jacket a book without a cover wears.
 *
 * A catalogue always has titles no source has a cover for, and a blank box in
 * a grid of jackets reads as a broken page. This draws a plain cloth binding
 * instead: one of a few deep colours chosen from the title (so the same book
 * always gets the same one), the title and author set in the display face,
 * a spine shadow and an inset rule. The small size, for thumbnails, keeps only
 * the colour and the title's first letter.
 *
 * Decorative: the title is always printed next to it as text, so the jacket
 * itself is hidden from assistive technology.
 */

const TONES = 6;

function toneOf(seed: string): number {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % TONES;
}

export function BookJacket({
  title,
  author,
  size = "full",
}: {
  title: string;
  author?: string;
  size?: "full" | "mini";
}) {
  return (
    <span className="pw-jacket" data-tone={toneOf(title)} data-size={size} aria-hidden="true">
      {size === "mini" ? (
        <span className="pw-jacket-initial">{title.trim().slice(0, 1)}</span>
      ) : (
        <>
          <span className="pw-jacket-rule" />
          <span className="pw-jacket-title">{title}</span>
          {author && <span className="pw-jacket-author">{author}</span>}
          <span className="pw-jacket-mark">✦</span>
        </>
      )}
    </span>
  );
}
