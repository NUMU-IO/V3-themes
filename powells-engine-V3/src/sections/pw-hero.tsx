/**
 * pw-hero — the shopfront.
 *
 * A bookshop hero is not a fashion campaign: there is no single product to
 * photograph, and the thing being sold is the SHOP. So the composition is a
 * wide lavender band with the promise set in the display serif, a hand-written
 * aside in the margin, and an optional photograph of the room itself sitting
 * beside the type rather than under it.
 *
 * With no image set it stays a type-and-colour band — deliberately good-looking
 * empty, because a merchant who has not uploaded a shop photo yet should get a
 * finished hero, not a grey placeholder box.
 */

import { Image, Link, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asBool,
  asImageAlt,
  asImageUrl,
  asString,
  isInlineImage,
  useOrnaments,
  type SectionRenderProps,
} from "../lib/shared";
import { Twinkle } from "../lib/ornaments";

export default function PwHero({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const ornaments = useOrnaments();

  const eyebrow = asString(s.eyebrow);
  const heading = asString(s.heading);
  const body = asString(s.body);
  const ctaText = asString(s.cta_text);
  const ctaLink = asString(s.cta_link) || "/products";
  const secondaryText = asString(s.secondary_text);
  const secondaryLink = asString(s.secondary_link) || "/collections";
  const note = asString(s.hand_note);
  const image = asImageUrl(s.image);
  const alt = asImageAlt(s.image) || heading;

  return (
    <section className={`pw-hero${image ? " has-image" : ""}`}>
      <div className="pw-hero-inner">
        <div className="pw-hero-copy">
          {eyebrow && (
            <p className="pw-hero-eyebrow">
              {ornaments && <Twinkle size={16} />}
              {eyebrow}
            </p>
          )}
          {heading && <h1 className="pw-hero-title">{heading}</h1>}
          {body && <p className="pw-hero-body">{body}</p>}

          {(ctaText || secondaryText) && (
            <div className="pw-hero-actions">
              {ctaText && (
                <Link className="pw-btn pw-btn-primary" to={ctaLink}>
                  {ctaText}
                </Link>
              )}
              {secondaryText && (
                <Link className="pw-btn pw-btn-ghost" to={secondaryLink}>
                  {secondaryText}
                </Link>
              )}
            </div>
          )}

          {/* With no photograph the note belongs WITH the copy. Floated into
              the empty half it read as a stray drawing in a blank field —
              and the empty half itself is now not rendered at all. */}
          {ornaments && note && !image && (
            <span className="pw-hero-note pw-hand">{note.split("\n").join(" ")}</span>
          )}
        </div>

        {image && (
          <div className="pw-hero-media">
            {/* `priority` — this is the LCP element on the home page. */}
            <Image
              src={image}
              alt={alt}
              priority
              responsive={!isInlineImage(image)}
              aspectRatio={asBool(s.tall_image, false) ? "3/4" : "4/3"}
            />
          </div>
        )}

        {ornaments && note && image && (
          <span className="pw-hero-note pw-hand">
            {note.split("\n").map((line, i) => (
              <span key={`${line}-${i}`} style={{ display: "block" }}>
                {line}
              </span>
            ))}
          </span>
        )}
      </div>
    </section>
  );
}
