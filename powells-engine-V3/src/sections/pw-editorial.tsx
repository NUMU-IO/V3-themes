/**
 * pw-editorial — image beside words.
 *
 * The bookshop's own voice on the home page: the staff pick of the month, the
 * story of the building, the note about buying used stock. Two columns, the
 * image on whichever side the merchant chooses, with a signature line set in
 * the marginalia hand.
 *
 * The signature is what makes this section a bookshop's rather than a generic
 * "image with text": a recommendation with a name under it is a person
 * talking, and that is the whole reason a used bookshop keeps customers.
 */

import { Image, Link, RichText, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asBool,
  asImageAlt,
  asImageUrl,
  asString,
  isInlineImage,
  useOrnaments,
  type SectionRenderProps,
} from "../lib/shared";
import { BookStack } from "../lib/ornaments";

export default function PwEditorial({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const ornaments = useOrnaments();

  const eyebrow = asString(s.eyebrow);
  const heading = asString(s.heading);
  const body = asString(s.body);
  const signature = asString(s.signature);
  const ctaText = asString(s.cta_text);
  const ctaLink = asString(s.cta_link) || "/pages/about";
  const image = asImageUrl(s.image);
  const alt = asImageAlt(s.image) || heading;
  const imageFirst = asBool(s.image_first, true);

  if (!heading && !body) return null;

  return (
    <section className={`pw-section pw-editorial${imageFirst ? "" : " reversed"}`}>
      <div className="pw-editorial-media">
        {image ? (
          <Image
            src={image}
            alt={alt}
            loading="lazy"
            responsive={!isInlineImage(image)}
            aspectRatio="4/3"
          />
        ) : (
          ornaments && (
            <span className="pw-editorial-plate" aria-hidden="true">
              <BookStack size={150} />
            </span>
          )
        )}
      </div>

      <div className="pw-editorial-copy">
        {eyebrow && <p className="pw-hero-eyebrow">{eyebrow}</p>}
        {heading && <h2>{heading}</h2>}
        {body && (
          <div className="pw-synopsis">
            {/* Merchant HTML through the SDK sanitizer, never raw innerHTML. */}
            <RichText html={body} />
          </div>
        )}
        {signature && ornaments && <p className="pw-hand pw-editorial-sign">— {signature}</p>}
        {ctaText && (
          <Link className="pw-btn pw-btn-ghost" to={ctaLink} style={{ marginBlockStart: 22 }}>
            {ctaText}
          </Link>
        )}
      </div>
    </section>
  );
}
