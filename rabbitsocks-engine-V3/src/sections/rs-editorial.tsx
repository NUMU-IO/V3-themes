"use client";
import { Link } from "@numueg/theme-sdk";
import { asString, type SectionRenderProps } from "./_shared";

const RsEditorial = ({ instance }: SectionRenderProps) => {
  const s = instance.settings ?? {};
  const title = asString(s.title, "The Art of Stillness");
  const subtitle = asString(s.subtitle, "Read the journal");
  const body = asString(
    s.body,
    "A collection of objects and garments that define the modern daily ritual. Simple in form, exceptional in quality.",
  );
  const sideTitle = asString(s.side_title, "Curated Comfort");
  const ctaText = asString(s.cta_text, "Explore the collection");
  const ctaUrl = asString(s.cta_url) || "/products";
  const imageMain = asString(s.image_main);
  const imageSide = asString(s.image_side);

  return (
    <section className="py-16 md:py-24 px-6 md:px-12 bg-[hsl(var(--rs-surface))]">
      <div className="grid grid-cols-12 gap-6 md:gap-8">
        {/* Main editorial card — large */}
        <div className="col-span-12 md:col-span-7 aspect-video relative overflow-hidden bg-[hsl(var(--rs-surface-high))]">
          {imageMain && (
            <img
              src={imageMain}
              alt={title}
              className="w-full h-full object-cover grayscale"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-8 md:p-10 text-center max-w-xs shadow-xl bg-[hsl(var(--rs-surface)/0.9)] backdrop-blur-sm">
              <span className="rs-label block mb-4">{subtitle}</span>
              <h4 className="rs-headline-sm text-[hsl(var(--rs-primary))] mb-4">
                {title}
              </h4>
              <Link to={ctaUrl}>
                <span className="material-symbols-outlined text-3xl text-[hsl(var(--rs-primary))]">
                  arrow_right_alt
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Side card — smaller with content below image */}
        <div className="col-span-12 md:col-span-5 flex flex-col justify-end p-6 md:p-8 bg-[hsl(var(--rs-surface-low))] aspect-auto md:aspect-[4/5]">
          {imageSide ? (
            <img
              src={imageSide}
              alt={body}
              className="w-full h-1/2 object-cover mb-6 md:mb-8"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-1/2 bg-[hsl(var(--rs-surface-high))] mb-6 md:mb-8" />
          )}
          <h4 className="rs-headline-md text-[hsl(var(--rs-primary))] mb-4">
            {sideTitle}
          </h4>
          <p className="rs-body text-[hsl(var(--rs-primary)/0.6)] leading-relaxed mb-6">
            {body}
          </p>
          <div className="flex gap-4">
            <Link to={ctaUrl} className="rs-btn-ghost">
              {ctaText}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RsEditorial;
