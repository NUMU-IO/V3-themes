"use client";
/**
 * vionne-faq — the FAQ / policies page body.
 *
 * ONE page that answers the questions a shopper otherwise has to DM for:
 * shipping, orders, payment, returns & refunds, product care, and privacy.
 * It replaces a set of stub policy pages that never existed — the theme's
 * footer used to link to /shipping, /returns, /privacy, /terms and /faq, all
 * of which resolved to a body-less placeholder (200, `noindex`, a lone
 * heading), which is why those links were removed from the default footer.
 *
 * BILINGUAL BY DESIGN, not by locale switch. Every answer renders English and
 * Arabic stacked, always both, so a shopper reads whichever they're comfortable
 * with without hunting for a language toggle — the format the merchant asked
 * for. The page heading and chrome still follow the active locale.
 *
 * Content source, in order:
 *   1. `faq_item` blocks authored in the customizer (merchant fully owns it),
 *   2. otherwise DEFAULT_FAQ below — real, honest answers rather than lorem,
 *      so the page is useful the moment the section is added.
 *
 * Numbers are never invented twice: the free-shipping answer reads the SAME
 * threshold the cart counts to (`useFreeShippingThreshold`), so the page cannot
 * promise a figure the bag disagrees with.
 *
 * Also emits FAQPage JSON-LD, which is what earns the expandable Q&A block in
 * search results and gives answer engines something structured to quote.
 */
import { useMemo, useState } from "react";
import { Link, useLocale, useResolvedSettings, useShop } from "@numueg/theme-sdk";
import { ChevronDown, Mail, MessageCircle } from "lucide-react";
import {
  asString,
  localized,
  readBlocks,
  useFreeShippingThreshold,
  type SectionRenderProps,
} from "./_shared";
import { InlineEditable } from "./_inline-editable";

/** One question, in both languages. */
interface FaqEntry {
  id: string;
  group: GroupKey;
  qEn: string;
  qAr: string;
  aEn: string;
  aAr: string;
}

type GroupKey =
  | "shipping"
  | "orders"
  | "payment"
  | "returns"
  | "product"
  | "privacy";

const GROUP_ORDER: GroupKey[] = [
  "shipping",
  "orders",
  "payment",
  "returns",
  "product",
  "privacy",
];

const GROUP_LABEL: Record<GroupKey, { en: string; ar: string }> = {
  shipping: { en: "Shipping & Delivery", ar: "الشحن والتوصيل" },
  orders: { en: "Orders & Tracking", ar: "الطلبات والتتبع" },
  payment: { en: "Payment & Offers", ar: "الدفع والعروض" },
  returns: { en: "Returns & Refunds", ar: "الاستبدال والاسترجاع" },
  product: { en: "Products & Care", ar: "المنتجات والعناية" },
  privacy: { en: "Privacy & Your Data", ar: "الخصوصية وبياناتك" },
};

/**
 * Default answers.
 *
 * Deliberately written to stay TRUE without knowing store-specific figures:
 * anything that varies (shipping fee, exact courier window) points the shopper
 * at checkout rather than quoting a number this file can't verify. The returns
 * answer is the merchant's real published policy, reproduced verbatim in both
 * languages. Every one of these is editable in the customizer.
 */
const DEFAULT_FAQ: FaqEntry[] = [
  // ── Shipping & Delivery ────────────────────────────────────────────────
  {
    id: "delivery-time",
    group: "shipping",
    qEn: "How long does delivery take?",
    qAr: "التوصيل بياخد قد إيه؟",
    aEn: "Orders are prepared within 1–2 business days and usually arrive within 3–5 business days anywhere in Egypt. Remote governorates can take a little longer.",
    aAr: "بنجهّز الأوردر خلال يوم لـ يومين عمل، وعادةً بيوصل خلال ٣ لـ ٥ أيام عمل في أي محافظة في مصر. المحافظات البعيدة ممكن تاخد وقت أطول شوية.",
  },
  {
    id: "shipping-cost",
    group: "shipping",
    qEn: "How much does shipping cost?",
    qAr: "الشحن بكام؟",
    aEn: "Shipping is calculated at checkout from your delivery address, so you always see the exact amount before you pay.",
    aAr: "الشحن بيتحسب عند الدفع حسب عنوان التوصيل، يعني هتشوفي المبلغ بالظبط قبل ما تدفعي.",
  },
  {
    id: "governorates",
    group: "shipping",
    qEn: "Do you deliver to all governorates?",
    qAr: "بتوصلوا لكل المحافظات؟",
    aEn: "Yes — we deliver to every governorate in Egypt.",
    aAr: "أيوة — بنوصل لكل محافظات مصر.",
  },
  {
    id: "international",
    group: "shipping",
    qEn: "Do you ship outside Egypt?",
    qAr: "بتشحنوا برّه مصر؟",
    aEn: "International shipping is available on request. Message us before ordering and we'll confirm whether we can deliver to your country and what it costs.",
    aAr: "الشحن الدولي متاح حسب الطلب. كلّمينا قبل ما تطلبي وإحنا هنأكدلك إذا كنا بنوصل لبلدك والتكلفة كام.",
  },

  // ── Orders & Tracking ──────────────────────────────────────────────────
  {
    id: "track",
    group: "orders",
    qEn: "How do I track my order?",
    qAr: "أتابع طلبي إزاي؟",
    aEn: "Use the “Track order” link at the bottom of any page and enter the order number from your confirmation message.",
    aAr: "استخدمي لينك «تتبع الطلب» في آخر أي صفحة واكتبي رقم الأوردر اللي في رسالة التأكيد.",
  },
  {
    id: "change-order",
    group: "orders",
    qEn: "Can I change or cancel my order?",
    qAr: "أقدر أعدّل أو ألغي الأوردر؟",
    aEn: "Yes, while it's still being prepared. Contact us as soon as you can — once the order is handed to the courier we can no longer change it.",
    aAr: "أيوة، طول ما هو لسه بيتجهّز. كلّمينا بأسرع وقت — بعد ما الأوردر يروح لشركة الشحن مش هنقدر نعدّله.",
  },
  {
    id: "no-confirmation",
    group: "orders",
    qEn: "I didn't receive an order confirmation.",
    qAr: "مجانيش تأكيد للأوردر.",
    aEn: "First check the phone number and email you entered at checkout. Then message us with your name and we'll find the order for you.",
    aAr: "أول حاجة اتأكدي من رقم الموبايل والإيميل اللي كتبتيهم عند الدفع. وبعدين كلّمينا باسمك وإحنا هنلاقيلك الأوردر.",
  },

  // ── Payment & Offers ───────────────────────────────────────────────────
  {
    id: "payment-methods",
    group: "payment",
    qEn: "What payment methods do you accept?",
    qAr: "بتقبلوا إيه في الدفع؟",
    aEn: "Cash on delivery, plus the card and wallet options shown at checkout. You'll see everything available to you before you confirm.",
    aAr: "الدفع عند الاستلام، وكمان الكارت والمحافظ الإلكترونية اللي بتظهر عند الدفع. هتشوفي كل الطرق المتاحة قبل ما تأكدي.",
  },
  {
    id: "payment-safe",
    group: "payment",
    qEn: "Is paying online safe?",
    qAr: "الدفع أونلاين آمن؟",
    aEn: "Yes. Card payments are handled by licensed payment providers on their own secure pages — we never see or store your full card number.",
    aAr: "أيوة. الدفع بالكارت بيتم عن طريق شركات دفع مرخّصة على صفحاتهم الآمنة — إحنا عمرنا ما بنشوف أو نحفظ رقم الكارت كامل.",
  },
  {
    id: "discount-code",
    group: "payment",
    qEn: "How do I use a discount code?",
    qAr: "أستخدم كود الخصم إزاي؟",
    aEn: "Enter it in the discount field at checkout. Automatic offers don't need a code at all — they apply on their own and you'll see them in your bag.",
    aAr: "اكتبيه في خانة كود الخصم عند الدفع. العروض التلقائية مش محتاجة كود خالص — بتتطبق لوحدها وهتشوفيها في الشنطة.",
  },
  {
    id: "bundle-offer",
    group: "payment",
    qEn: "How do the mix-and-match bundle offers work?",
    qAr: "عروض الباقات شغالة إزاي؟",
    aEn: "Pick any colours you like from the styles included in the offer — they don't have to match. Add the required number to your bag and the bundle price applies automatically at checkout. Your bag always shows how many more you need and how much you've saved.",
    aAr: "اختاري أي ألوان تحبيها من الستايلات المشمولة في العرض — مش لازم تكون نفس اللون. ضيفي العدد المطلوب في الشنطة والسعر بيتطبق تلقائي عند الدفع. الشنطة دايمًا بتوريكي فاضل كام قطعة وكام وفّرتي.",
  },
  {
    id: "prices-change",
    group: "payment",
    qEn: "Can prices or availability change?",
    qAr: "الأسعار أو التوافر ممكن يتغيروا؟",
    aEn: "Prices and stock can change without notice, and an order is final only once we've accepted it. If a piece sells out after you order, we'll contact you and refund it in full.",
    aAr: "الأسعار والمخزون ممكن يتغيروا من غير إشعار، والأوردر بيبقى نهائي لما إحنا نقبله. لو قطعة خلصت بعد ما تطلبي هنكلّمك ونرجّعلك فلوسها كاملة.",
  },

  // ── Returns & Refunds ──────────────────────────────────────────────────
  {
    id: "returns",
    group: "returns",
    qEn: "Can I return or exchange an item?",
    qAr: "أقدر أستبدل أو أرجّع المنتج؟",
    aEn: "Returns or exchanges are not available, except in the case of a clear manufacturing defect, with supporting photos provided through our Instagram page.",
    aAr: "الاستبدال أو الاسترجاع غير متاح، إلا في حالة وجود عيب تصنيع واضح، مع إرسال صور توضيحية من خلال صفحتنا على إنستجرام.",
  },
  {
    id: "damaged",
    group: "returns",
    qEn: "I received a damaged or incorrect item.",
    qAr: "وصلني منتج تالف أو غلط.",
    aEn: "Message us on Instagram within 48 hours of delivery with clear photos of the item and its packaging, and we'll make it right.",
    aAr: "كلّمينا على إنستجرام خلال ٤٨ ساعة من الاستلام وابعتيلنا صور واضحة للمنتج والتغليف وإحنا هنظبطها.",
  },
  {
    id: "refund-time",
    group: "returns",
    qEn: "How long does a refund take?",
    qAr: "الاسترداد بياخد قد إيه؟",
    aEn: "Once a refund is approved it's issued to the original payment method. It usually appears within 5–14 business days, depending on your bank.",
    aAr: "أول ما الاسترداد يتوافق عليه بيترجع على نفس وسيلة الدفع. عادةً بيظهر خلال ٥ لـ ١٤ يوم عمل حسب البنك.",
  },

  // ── Products & Care ────────────────────────────────────────────────────
  {
    id: "care",
    group: "product",
    qEn: "How should I care for my scarves?",
    // Deliberately "الشالات" (shawls) — a neutral fashion word. Do NOT reach
    // for إسدال / طرحة / خمار here: those are modest-wear vocabulary and are
    // precisely what got this domain classified under الدين/Religion.
    qAr: "أعتني بالشالات إزاي؟",
    aEn: "Hand wash in cold water, or use a delicate machine cycle inside a laundry bag. No bleach, and never wring the fabric — press the water out gently. Dry flat away from direct sun and iron on low.",
    aAr: "اغسليها بإيدك بمياه باردة، أو على دورة ناعمة في كيس غسيل. من غير كلور، وما تعصريهاش — اضغطي المياه برفق. انشريها مفرودة بعيد عن الشمس والكوي على حرارة خفيفة.",
  },
  {
    id: "fabrics",
    group: "product",
    qEn: "What are the fabrics like?",
    qAr: "الخامات شكلها إيه؟",
    aEn: "Each style has its own hand-feel: modal is featherlight and stays put, cotton modal is soft and breathable for daily wear, sponge is cloud-soft with a bit of grip, and linen and chiffon fall lighter and more fluid. The fabric is named on every product page.",
    aAr: "كل ستايل ليه ملمسه: المودال خفيف جدًا وثابت، والمودال قطن ناعم وبيتنفّس للّبس اليومي، والإسفنجي ناعم زي السحابة وفيه تماسك بسيط، والكتان والشيفون أخف وانسيابية أكتر. الخامة مكتوبة في صفحة كل منتج.",
  },
  {
    id: "size",
    group: "product",
    qEn: "What size are they?",
    qAr: "المقاسات إيه؟",
    aEn: "Dimensions vary by style. Message us with the product name and we'll send you its exact measurements before you order.",
    aAr: "المقاسات بتختلف حسب الستايل. ابعتيلنا اسم المنتج وهنبعتلك مقاساته بالظبط قبل ما تطلبي.",
  },
  {
    id: "colour",
    group: "product",
    qEn: "Will the colour look like the photos?",
    qAr: "اللون هيطلع زي الصور؟",
    aEn: "We photograph in natural light and edit as little as possible, but every screen renders colour differently — small variations are normal, especially across our deeper and more saturated shades.",
    aAr: "بنصوّر في إضاءة طبيعية وبنعدّل أقل حاجة ممكنة، بس كل شاشة بتعرض الألوان بشكل مختلف — الفروق البسيطة طبيعية، خصوصًا في الدرجات الغامقة والقوية.",
  },
  {
    id: "restock",
    group: "product",
    qEn: "Will a sold-out colour come back?",
    qAr: "اللون اللي خلص هيرجع تاني؟",
    aEn: "Some shades are restocked and others are limited runs. Send us the product name and colour and we'll tell you which one it is.",
    aAr: "في درجات بترجع وفي درجات إصدار محدود. ابعتيلنا اسم المنتج واللون وهنقولك هو أنهي نوع.",
  },

  // ── Privacy & Your Data ────────────────────────────────────────────────
  {
    id: "data-collected",
    group: "privacy",
    qEn: "What information do you collect?",
    qAr: "بتجمعوا إيه من بياناتي؟",
    aEn: "Only what's needed to fulfil your order — your name, phone number, delivery address and email — plus anonymous analytics about how the store is used.",
    aAr: "بس اللي محتاجينه علشان ننفّذ الأوردر — اسمك ورقم موبايلك وعنوان التوصيل والإيميل — وكمان بيانات مجهولة الهوية عن استخدام المتجر.",
  },
  {
    id: "data-shared",
    group: "privacy",
    qEn: "Do you share my data with anyone?",
    qAr: "بتشاركوا بياناتي مع حد؟",
    aEn: "Only with the courier delivering your order and the payment provider processing your payment. We never sell your personal data.",
    aAr: "بس مع شركة الشحن اللي بتوصّل الأوردر وشركة الدفع اللي بتنفّذ الدفع. إحنا عمرنا ما بنبيع بياناتك الشخصية.",
  },
  {
    id: "cookies",
    group: "privacy",
    qEn: "Do you use cookies?",
    qAr: "بتستخدموا كوكيز؟",
    aEn: "Yes — to keep the items in your bag, remember your preferences, and measure how the store is used so we can improve it. You can clear them from your browser at any time.",
    aAr: "أيوة — علشان نحتفظ بالمنتجات في شنطتك، ونفتكر تفضيلاتك، ونقيس استخدام المتجر علشان نحسّنه. تقدري تمسحيها من المتصفح في أي وقت.",
  },
  {
    id: "data-delete",
    group: "privacy",
    qEn: "How do I delete my account or data?",
    qAr: "أمسح حسابي أو بياناتي إزاي؟",
    aEn: "Message us and we'll delete your account and personal data, apart from the order records we're legally required to keep.",
    aAr: "كلّمينا وإحنا هنمسح حسابك وبياناتك الشخصية، ما عدا سجلات الطلبات اللي القانون ملزمنا نحتفظ بيها.",
  },
];

/** Read merchant-authored `faq_item` blocks; empty when none are configured. */
function blockEntries(instance: SectionRenderProps["instance"]): FaqEntry[] {
  return readBlocks(instance, "faq_item")
    .map((raw, i) => {
      const group = asString(raw.group) as GroupKey;
      return {
        id: asString(raw.id) || `block-${i}`,
        group: GROUP_ORDER.includes(group) ? group : "shipping",
        qEn: asString(raw.question_en),
        qAr: asString(raw.question_ar),
        aEn: asString(raw.answer_en),
        aAr: asString(raw.answer_ar),
      };
    })
    // A block with no question in either language has nothing to show.
    .filter((e) => e.qEn || e.qAr);
}

/** One Q&A row — question in both languages, answer in both, collapsible. */
function FaqItem({
  entry,
  open,
  onToggle,
  align,
}: {
  entry: FaqEntry;
  open: boolean;
  onToggle: () => void;
  /**
   * Which edge BOTH language blocks hang off. Each block still carries its own
   * `dir`, which is what makes bidi ordering and punctuation correct — but they
   * share one alignment so the Arabic sits directly beneath its English rather
   * than across a gutter from it. Aligning each block to its own script's side
   * looked like two unrelated columns.
   */
  align: "left" | "right";
}) {
  const panelId = `faq-panel-${entry.id}`;
  const buttonId = `faq-button-${entry.id}`;
  const alignClass = align === "right" ? "text-right" : "text-left";
  return (
    <div className="border-b border-[var(--vn-border)]">
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          // 56px tall — comfortably above the 44px touch-target minimum.
          className="w-full flex items-start justify-between gap-4 py-5 text-start group min-h-[56px]"
          data-testid="storefront-faq-question"
        >
          <span className="flex-1 min-w-0">
            {entry.qEn && (
              <span
                dir="ltr"
                className={`block text-[15px] md:text-base font-medium text-[var(--vn-ink)] leading-snug ${alignClass}`}
              >
                {entry.qEn}
              </span>
            )}
            {entry.qAr && (
              <span
                dir="rtl"
                lang="ar"
                className={`block text-sm text-[var(--vn-muted)] leading-relaxed mt-1 ${alignClass}`}
              >
                {entry.qAr}
              </span>
            )}
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={
              "shrink-0 mt-1 text-[var(--vn-muted)] transition-transform duration-300 group-hover:text-[var(--vn-ink)] " +
              (open ? "rotate-180" : "")
            }
          />
        </button>
      </h3>
      {/* Grid-rows 0fr→1fr animates height without measuring the content, and
          the panel stays in the DOM so in-page search (⌘F) still finds closed
          answers. `hidden` on the inner node keeps it out of the a11y tree and
          out of the tab order while collapsed. */}
      <div
        className={
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none " +
          (open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")
        }
      >
        <div className="overflow-hidden">
          <div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            hidden={!open}
            className="pb-6 space-y-3"
            data-testid="storefront-faq-answer"
          >
            {entry.aEn && (
              <p
                dir="ltr"
                className={`text-sm text-[var(--vn-muted)] leading-relaxed ${alignClass}`}
              >
                {entry.aEn}
              </p>
            )}
            {entry.aAr && (
              <p
                dir="rtl"
                lang="ar"
                className={`text-sm text-[var(--vn-muted)] leading-relaxed ${alignClass}`}
              >
                {entry.aAr}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VionneFaq({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const shop = useShop();
  const freeThreshold = useFreeShippingThreshold();

  const eyebrow = asString(s.eyebrow) || localized(locale, "HELP CENTRE", "مركز المساعدة");
  const title =
    asString(s.title) || localized(locale, "Frequently asked questions", "الأسئلة الشائعة");
  const intro =
    asString(s.intro) ||
    localized(
      locale,
      "Everything about delivery, orders, payment, returns and your privacy — answered in English and Arabic.",
      "كل حاجة عن التوصيل والطلبات والدفع والاسترجاع وخصوصيتك — بالإنجليزي والعربي.",
    );
  const contactTitle =
    asString(s.contact_title) || localized(locale, "Still need help?", "لسه محتاجة مساعدة؟");
  const contactText =
    asString(s.contact_text) ||
    localized(
      locale,
      "Message us on Instagram or WhatsApp and we'll get back to you as soon as we can.",
      "كلّمينا على إنستجرام أو واتساب وهنرد عليكي في أقرب وقت.",
    );
  const contactCta = asString(s.contact_cta) || localized(locale, "Contact us", "تواصلي معانا");
  const contactLink = asString(s.contact_link) || "/contact";
  const showGroups = s.show_group_headings !== false;
  // Both language blocks hang off the page's own reading edge, so the Arabic
  // sits directly under its English instead of across the column from it.
  const align: "left" | "right" = locale?.startsWith("ar") ? "right" : "left";

  const entries = useMemo(() => {
    const authored = blockEntries(instance);
    const base = authored.length > 0 ? authored : DEFAULT_FAQ;
    // Splice the merchant's REAL free-shipping threshold into the shipping-cost
    // answer, so this page and the bag can never quote different numbers. Only
    // when one is configured — an unset threshold leaves the generic answer,
    // which is still true.
    if (freeThreshold <= 0) return base;
    const currency = shop?.currency || "EGP";
    const amountEn = `${currency} ${freeThreshold.toLocaleString("en-EG")}`;
    const amountAr = `${freeThreshold.toLocaleString("ar-EG")} ${currency === "EGP" ? "ج.م" : currency}`;
    return base.map((e) =>
      e.id === "shipping-cost"
        ? {
            ...e,
            aEn: `${e.aEn} Orders over ${amountEn} ship free.`,
            aAr: `${e.aAr} الطلبات فوق ${amountAr} شحنها مجاني.`,
          }
        : e,
    );
  }, [instance, freeThreshold, shop?.currency]);

  // Open the first question so the page never looks like a wall of dead rows.
  const [openId, setOpenId] = useState<string | null>(entries[0]?.id ?? null);

  const grouped = useMemo(() => {
    const map = new Map<GroupKey, FaqEntry[]>();
    for (const e of entries) {
      const list = map.get(e.group);
      if (list) list.push(e);
      else map.set(e.group, [e]);
    }
    // Keep the canonical group order, then any unknown groups the merchant
    // introduced, so a custom group is never silently dropped.
    const keys = [
      ...GROUP_ORDER.filter((g) => map.has(g)),
      ...[...map.keys()].filter((g) => !GROUP_ORDER.includes(g)),
    ];
    return keys.map((key) => ({ key, items: map.get(key)! }));
  }, [entries]);

  /**
   * FAQPage structured data. Answers are plain text (no markup), so no
   * sanitization is needed and nothing merchant-authored can inject markup
   * into the page — JSON.stringify escapes the payload, and `<` cannot end a
   * script block once it is `<`.
   */
  const jsonLd = useMemo(() => {
    const payload = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: entries.map((e) => ({
        "@type": "Question",
        name: e.qEn || e.qAr,
        acceptedAnswer: {
          "@type": "Answer",
          text: [e.aEn, e.aAr].filter(Boolean).join(" — "),
        },
      })),
    };
    return JSON.stringify(payload).replace(/</g, "\\u003c");
  }, [entries]);

  return (
    <section className="bg-background" data-vn-section={sectionId} data-testid="storefront-faq">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
        {/* Header */}
        <header className="text-center mb-10 md:mb-14">
          {eyebrow && (
            <span className="vn-eyebrow block mb-3 text-[var(--vn-muted)]">
              <InlineEditable sectionId={sectionId} settingKey="eyebrow" value={eyebrow} />
            </span>
          )}
          <h1 className="vn-heading text-3xl md:text-5xl text-[var(--vn-ink)]">
            <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
          </h1>
          {intro && (
            <p className="mt-4 text-sm md:text-base text-[var(--vn-muted)] leading-relaxed max-w-xl mx-auto">
              <InlineEditable sectionId={sectionId} settingKey="intro" value={intro} multiline />
            </p>
          )}
        </header>

        {/* Groups */}
        {grouped.map(({ key, items }) => (
          <section key={key} className="mb-10 md:mb-12 last:mb-0">
            {showGroups && (
              <h2 className="vn-eyebrow text-[var(--vn-muted)] mb-1 pb-3 border-b border-[var(--vn-ink)]/15">
                <span dir="ltr">{GROUP_LABEL[key]?.en ?? key}</span>
                {GROUP_LABEL[key]?.ar && (
                  <>
                    <span aria-hidden="true" className="mx-2 opacity-40">
                      ·
                    </span>
                    <span dir="rtl" lang="ar">
                      {GROUP_LABEL[key].ar}
                    </span>
                  </>
                )}
              </h2>
            )}
            {items.map((entry) => (
              <FaqItem
                key={entry.id}
                entry={entry}
                align={align}
                open={openId === entry.id}
                onToggle={() => setOpenId((cur) => (cur === entry.id ? null : entry.id))}
              />
            ))}
          </section>
        ))}

        {/* Contact fallback — the honest end of an FAQ is "ask a human". */}
        <div className="mt-12 md:mt-16 border border-[var(--vn-border)] p-7 md:p-9 text-center">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-[var(--vn-border)] mb-4">
            <MessageCircle size={18} aria-hidden="true" className="text-[var(--vn-muted)]" />
          </span>
          <h2 className="vn-heading text-xl md:text-2xl text-[var(--vn-ink)] mb-2">
            <InlineEditable sectionId={sectionId} settingKey="contact_title" value={contactTitle} />
          </h2>
          <p className="text-sm text-[var(--vn-muted)] leading-relaxed mb-6 max-w-sm mx-auto">
            <InlineEditable
              sectionId={sectionId}
              settingKey="contact_text"
              value={contactText}
              multiline
            />
          </p>
          <Link to={contactLink} className="vn-btn vn-btn-filled inline-flex items-center gap-2">
            <Mail size={14} aria-hidden="true" />
            <InlineEditable sectionId={sectionId} settingKey="contact_cta" value={contactCta} />
          </Link>
        </div>
      </div>
    </section>
  );
}
