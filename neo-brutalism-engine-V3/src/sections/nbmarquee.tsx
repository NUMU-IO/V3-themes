"use client";
import { asNumber, asString, type SectionRenderProps } from "./_shared";

const NBMarquee = ({ instance }: SectionRenderProps) => {
  const s = instance.settings ?? {};
  const text = asString(
    s.text,
    "✦ خصومات حصرية ✦ شحن سريع ✦ منتجات أصلية ✦ جودة مضمونة ✦ الدفع عند الاستلام ✦",
  );
  const repeatCount = asNumber(s.repeat_count, 2);

  const repeatedText = Array.from({ length: Math.max(1, repeatCount) }, () => text).join(" ");

  return (
    <div className="nb-marquee py-3 -rotate-1 scale-[1.02] my-2">
      <div className="nb-marquee-text text-foreground text-base">
        {repeatedText}
      </div>
    </div>
  );
};

export default NBMarquee;
