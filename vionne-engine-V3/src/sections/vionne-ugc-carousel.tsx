"use client";
import { useEffect, useRef, useState } from "react";
import { Link } from "@numueg/theme-sdk";
import { ArrowRight } from "lucide-react";
import { type SectionRenderProps } from "./_shared";

interface Item {
  media: string;
  video: string;
  caption: string;
  productImage: string;
  productLink: string;
}

const VionneUgcCarousel = ({ instance }: SectionRenderProps) => {
  const s = instance.settings ?? {};
  const eyebrow = s.eyebrow ?? "";
  const title = s.title ?? "Tagged by you";
  const subtitle = s.subtitle ?? "";
  const ctaText = s.cta_text ?? "";
  const ctaLink = s.cta_link ?? "/products";
  const introImage = s.intro_image ?? "";
  const badgeText = (s.badge_text as string) ?? "Shop now";

  const items: Item[] = [];
  for (let i = 1; i <= 6; i++) {
    const media = (s[`item_${i}_media`] ?? "") as string;
    const video = (s[`item_${i}_video`] ?? "") as string;
    if (!media && !video) continue;
    items.push({
      media,
      video,
      caption: (s[`item_${i}_caption`] ?? "") as string,
      productImage: (s[`item_${i}_product_image`] ?? "") as string,
      productLink: (s[`item_${i}_product_link`] ?? "") as string,
    });
  }

  const trackRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="bg-background py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-6 md:mb-8 gap-4">
          <div>
            {eyebrow && (
              <span className="vn-eyebrow block mb-1.5">
                {eyebrow}
              </span>
            )}
            <h2
              className="vn-heading text-2xl md:text-3xl"
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className="text-sm text-[var(--vn-muted)] mt-1.5"
              >
                {subtitle}
              </p>
            )}
          </div>
          {ctaText && (
            <Link
              to={ctaLink}
              className="vn-label inline-flex items-center gap-1.5 hover:opacity-70 transition-opacity shrink-0 pb-2"
            >
              {ctaText}
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        <div
          ref={trackRef}
          className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory pb-3 scrollbar-hide"
        >
          {(introImage || ctaText) && (
            <div
              className={`vn-reveal shrink-0 snap-start w-[210px] sm:w-[240px] md:w-[260px] aspect-[3/4] relative rounded-md overflow-hidden bg-[var(--vn-surface-dark)] ${
                visible ? "is-visible" : ""
              }`}
            >
              {introImage && (
                <img
                  src={introImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                />
              )}
              <div className="absolute inset-0 flex flex-col items-start justify-between p-5 text-start">
                <div>
                  <h3 className="vn-heading text-white text-2xl md:text-[26px] leading-[1.05] uppercase">
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="text-white/75 text-xs mt-2 max-w-[80%]">{subtitle}</p>
                  )}
                </div>
                {ctaText && (
                  <Link
                    to={ctaLink}
                    className="vn-label text-white inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                  >
                    {ctaText}
                  </Link>
                )}
              </div>
            </div>
          )}

          {items.map((it, idx) => (
            <div
              key={idx}
              className={`vn-reveal shrink-0 snap-start w-[210px] sm:w-[240px] md:w-[260px] aspect-[3/4] relative bg-[var(--vn-band)] rounded-md overflow-hidden flex flex-col ${
                visible ? "is-visible" : ""
              }`}
              style={{ transitionDelay: visible ? `${idx * 70}ms` : "0ms" }}
            >
              <div className="relative flex-1 overflow-hidden">
                {it.video ? (
                  <video
                    src={it.video}
                    poster={it.media || undefined}
                    className="absolute inset-0 w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    autoPlay
                  />
                ) : it.media ? (
                  <img src={it.media} alt={it.caption} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 vn-shimmer" />
                )}

                {it.caption && (
                  <span className="absolute top-3 start-3 vn-label px-2.5 py-1 text-[10px] bg-[var(--vn-sale)] text-white rounded-sm">
                    {it.caption}
                  </span>
                )}
              </div>

              {it.productLink && (
                <Link
                  to={it.productLink}
                  className="bg-white px-3 py-2.5 flex items-center gap-2.5 hover:bg-[var(--vn-band)] transition-colors"
                >
                  {it.productImage && (
                    <img src={it.productImage} alt="" className="w-9 h-9 object-cover rounded-sm shrink-0" />
                  )}
                  <span className="vn-label text-[10px] text-[var(--vn-ink)] flex-1 text-start">
                    {badgeText}
                  </span>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VionneUgcCarousel;
