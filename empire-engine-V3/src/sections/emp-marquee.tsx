"use client";

import { useLocale, useResolvedSettings, useShop } from "@numueg/theme-sdk";
import { asNumber, asString, localized, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";

/**
 * emp-marquee — faithful V3 port of V2 EmpMarquee
 * (numu-egyptian-bazaar/src/themes/empire/sections/marquee/EmpMarquee.tsx).
 *
 * A BLACK ticker bar with a thin white top/bottom hairline. Each repeated
 * group reads "<text> ● <STORE NAME> ●" in white uppercase, scrolling
 * left via the shared `emp-ticker` keyframes. The store name comes from
 * the live shop. Two copies of the run are laid end-to-end so the loop
 * reads seamless. NOT the navy/amber heading marquee it inherited from
 * the Bazar structural clone.
 */
const EmpMarquee = ({ instance, sectionId }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const shop = useShop();

  const text = asString(s.text) || localized(locale, "100% INDEPENDENT", "100% مستقل");
  const storeName = shop?.name || "NUMU";
  // Clamp to a sane range so a stray value can't render hundreds of spans.
  // `repeat_count` is the schema key; `repeat` kept as a V2 alias.
  const repeat = Math.max(1, Math.min(20, asNumber(s.repeat_count, asNumber(s.repeat, 10))));

  const items = Array.from({ length: repeat }, (_, i) => (
    <span key={i} className="flex items-center gap-8 mx-8">
      <span className="text-white/90 font-black text-xs tracking-[0.2em] uppercase">
        {text}
      </span>
      <span className="text-white/30 text-lg">&#9679;</span>
      <span className="text-white/60 font-extrabold text-xs tracking-[0.15em] uppercase">
        {storeName}
      </span>
      <span className="text-white/30 text-lg">&#9679;</span>
    </span>
  ));

  return (
    <div
      className="bg-black overflow-hidden py-3.5 border-y border-white/10"
      data-emp-section={sectionId}
      aria-label={`${text} ${storeName}`}
    >
      {/* The first run carries the editable text node so merchants can edit it
          inline in the customizer; the rest are decorative duplicates. */}
      <div className="flex whitespace-nowrap animate-[emp-ticker_30s_linear_infinite]">
        <span className="sr-only">
          <InlineEditable sectionId={sectionId} settingKey="text" value={text} />
        </span>
        {items}
        {items}
      </div>
    </div>
  );
};

export default EmpMarquee;
