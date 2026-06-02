"use client";
import { useShop } from "@numueg/theme-sdk";
import { asNumber, type SectionRenderProps } from "./_shared";

const TAGLINES = [
  { text: "WALK IN STYLE", italic: false },
  { text: "Minimalist Luxury", italic: true },
  { text: "PREMIUM COMFORT", italic: false },
  { text: "Quiet Luxury", italic: true },
];

const RsMarquee = ({ instance }: SectionRenderProps) => {
  const shop = useShop();
  const s = instance.settings ?? {};
  const storeName = shop?.name || "RabbitSocks";
  const repeat = asNumber(s.repeat, 3) || 3;

  const unit = (
    <>
      <span className="rs-marquee-item mx-6 italic">{storeName}</span>
      <span className="rs-marquee-dot mx-3">&#8226;</span>
      {TAGLINES.map((tag, i) => (
        <span key={i} className="flex items-center">
          <span
            className={`rs-marquee-item mx-6 ${tag.italic ? "italic" : "not-italic tracking-[0.2em] text-[1.1rem] font-light"}`}
          >
            {tag.text}
          </span>
          <span className="rs-marquee-dot mx-3">&#8226;</span>
        </span>
      ))}
    </>
  );

  return (
    <div className="rs-marquee-shell overflow-hidden">
      <div className="flex whitespace-nowrap rs-marquee-track">
        {Array.from({ length: repeat }, (_, i) => (
          <span key={i} className="flex items-center shrink-0">
            {unit}
          </span>
        ))}
        {/* Duplicate for seamless loop */}
        {Array.from({ length: repeat }, (_, i) => (
          <span key={`dup-${i}`} className="flex items-center shrink-0">
            {unit}
          </span>
        ))}
      </div>
    </div>
  );
};

export default RsMarquee;
