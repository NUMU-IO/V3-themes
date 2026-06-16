"use client";

import {
  Link,
  useCollections,
  useLocale,
  useResolvedSettings,
  useShop,
  useThemeSettings,
} from "@numueg/theme-sdk";
import { Facebook, Twitter, MessageCircle, Music2 } from "lucide-react";
import {
  asImageUrl,
  asString,
  localized,
  readBlocks,
  type SectionRenderProps,
} from "./_shared";
import { InlineEditable } from "./_inline-editable";

interface FooterLink {
  label: string;
  href: string;
}
interface FooterColumn {
  title: string;
  links: FooterLink[];
}

/** Inline Instagram SVG (lucide-react dropped the named export) — ported
 *  from V2 GildedFooter. */
const InstagramIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

/**
 * gilded-footer — faithful V3 port of V2 GildedFooter
 * (numu-egyptian-bazaar/src/components/store/gilded-glamour-boutique/GildedFooter.tsx).
 *
 * A BLACK footer (`bg-black text-white`) with a 4-column grid:
 *   (1) brand — logo / gold wordmark + editable blurb + social icons read
 *       from `shop.social_links` as gold-bordered circles that fill gold on
 *       hover (whatsapp → wa.me/<digits>);
 *   (2) Shop — All Products + collections;
 *   (3) Info — About / Shipping / Returns / Privacy / Terms / Contact / Track;
 *   (4) Newsletter — gold heading + subtitle + email input (border-b).
 * Bottom bar (`border-t`) carries the copyright + "Powered by NUMU".
 *
 * The Shop / Info columns can be overridden via `column` blocks (same seam as
 * the Empire footer). Settings: brand_name, logo_url, footer_text,
 * show_newsletter, newsletter_title, newsletter_subtitle.
 */
export default function GildedFooter({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const { collections } = useCollections();
  const themeSettings = useThemeSettings();
  const locale = useLocale();

  const brandName =
    asString(s.brand_name) ||
    asString(themeSettings.global_settings?.brand_name) ||
    shop?.name ||
    "SAW SAW";

  const logoUrl =
    asImageUrl(s.logo_url) ||
    asImageUrl(themeSettings.global_settings?.logo_url) ||
    shop?.logo_url ||
    "";

  const footerText =
    asString(s.footer_text) ||
    localized(
      locale,
      "The Gilded Curator — curated excellence and timeless precision since 2024.",
      "غيلدد كيوريتور — تميّز منتقى وإتقان لا يعرف الزمن منذ 2024.",
    );

  const showNewsletter = (s.show_newsletter as boolean) !== false;
  const newsletterTitle =
    asString(s.newsletter_title) || localized(locale, "Newsletter", "النشرة البريدية");
  const newsletterSubtitle =
    asString(s.newsletter_subtitle) ||
    localized(locale, "Join the empire. Be first to know.", "انضم لدائرة النخبة. وكن أول من يعرف الجديد.");

  // Socials from the live store (`shop.social_links`).
  const storeSocial = (shop?.social_links as Record<string, string> | undefined) ?? {};
  const socialIcons = [
    { key: "instagram", url: asString(storeSocial.instagram), Icon: InstagramIcon, label: "Instagram" },
    { key: "facebook", url: asString(storeSocial.facebook), Icon: Facebook, label: "Facebook" },
    { key: "twitter", url: asString(storeSocial.twitter), Icon: Twitter, label: "Twitter" },
    { key: "tiktok", url: asString(storeSocial.tiktok), Icon: Music2, label: "TikTok" },
    { key: "whatsapp", url: asString(storeSocial.whatsapp), Icon: MessageCircle, label: "WhatsApp" },
  ].filter((soc) => Boolean(soc.url));

  const formatSocialHref = (key: string, url: string) => {
    if (key === "whatsapp") {
      if (url.startsWith("http")) return url;
      return `https://wa.me/${url.replace(/\D/g, "")}`;
    }
    return url;
  };

  // Optional override columns from `column` blocks (Empire seam).
  const overrideColumns: FooterColumn[] = readBlocks(instance, "column")
    .map((r) => {
      const links: FooterLink[] = [];
      for (let i = 1; i <= 7; i++) {
        const label = asString(r[`link${i}_label`]);
        const href = asString(r[`link${i}_href`]);
        if (label && href) links.push({ label, href });
      }
      return { title: asString(r.title), links };
    })
    .filter((c) => c.title && c.links.length > 0);

  // V2 default Shop / Info columns.
  const defaultColumns: FooterColumn[] = [
    {
      title: localized(locale, "Shop", "تسوّق"),
      links: [
        { label: localized(locale, "All Products", "كل المنتجات"), href: "/products" },
        ...collections.slice(0, 3).map((cat) => ({
          label: cat.name,
          href: `/collections/${cat.slug}`,
        })),
      ],
    },
    {
      title: localized(locale, "Info", "معلومات"),
      links: [
        { label: localized(locale, "About", "عن المتجر"), href: "/pages/about" },
        { label: localized(locale, "Shipping", "الشحن"), href: "/pages/shipping" },
        { label: localized(locale, "Returns", "الإرجاع"), href: "/pages/returns" },
        { label: localized(locale, "Privacy", "الخصوصية"), href: "/pages/privacy" },
        { label: localized(locale, "Terms", "الشروط"), href: "/pages/terms" },
        { label: localized(locale, "Contact", "تواصل"), href: "/pages/contact" },
        { label: localized(locale, "Track Order", "تتبع الطلب"), href: "/track" },
      ],
    },
  ];

  const columnsToRender = overrideColumns.length > 0 ? overrideColumns : defaultColumns;

  const goldTextClass = "text-[hsl(var(--gold))]";
  const mutedTextClass = "text-muted-foreground";

  return (
    <footer className="bg-black text-white pt-8 pb-8 md:pt-12 font-sans" data-gilded-section={sectionId}>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-10 mb-6 md:mb-10">
          {/* Brand */}
          <div className="md:pe-8">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-7 md:h-8 w-auto mb-3 md:mb-4" />
            ) : (
              <h4
                className={`text-base md:text-lg font-bold tracking-[0.15em] uppercase mb-3 md:mb-4 ${goldTextClass}`}
              >
                <InlineEditable sectionId={sectionId} settingKey="brand_name" value={brandName} />
              </h4>
            )}
            <p className={`text-xs md:text-[13px] leading-relaxed ${mutedTextClass}`}>
              <InlineEditable
                sectionId={sectionId}
                settingKey="footer_text"
                value={footerText}
                multiline
              />
            </p>

            {/* Social icons */}
            {socialIcons.length > 0 && (
              <div className="flex gap-2 mt-4 md:mt-6">
                {socialIcons.map(({ key, url, Icon, label }) => (
                  <a
                    key={key}
                    href={formatSocialHref(key, url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="w-8 h-8 md:w-9 md:h-9 rounded-full border border-[hsl(var(--gold))]/40 flex items-center justify-center text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))] hover:text-black transition-colors"
                  >
                    <Icon size={14} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Shop / Info (or override) columns */}
          {columnsToRender.map((col, ci) => (
            <div key={`${col.title}-${ci}`}>
              <h5
                className={`text-[11px] font-bold tracking-[0.2em] uppercase mb-3 md:mb-4 ${goldTextClass}`}
              >
                {col.title}
              </h5>
              <ul className={`space-y-2 md:space-y-2.5 text-xs md:text-[13px] ${mutedTextClass}`}>
                {col.links.map((link, idx) => (
                  <li key={`${col.title}-${idx}`}>
                    <Link to={link.href} className="hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter */}
          {showNewsletter && (
            <div>
              <h5
                className={`text-[11px] font-bold tracking-[0.2em] uppercase mb-3 md:mb-4 ${goldTextClass}`}
              >
                {newsletterTitle}
              </h5>
              <p className={`text-xs md:text-[13px] mb-3 md:mb-4 ${mutedTextClass}`}>
                {newsletterSubtitle}
              </p>
              <form
                className="flex border-b border-white/20 pb-2"
                onSubmit={(e) => e.preventDefault()}
              >
                <input
                  type="email"
                  placeholder={localized(locale, "Your email", "بريدك الإلكتروني")}
                  dir="ltr"
                  className="flex-1 bg-transparent border-none text-xs md:text-[13px] text-white placeholder:text-white/40 focus:outline-none focus:ring-0 px-0"
                />
              </form>
            </div>
          )}
        </div>

        {/* Bottom */}
        <div className="border-t border-[#1A1A1A] pt-4 md:pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4">
          <p className={`text-[10px] md:text-[11px] ${mutedTextClass}`}>
            &copy; {new Date().getFullYear()} {brandName}.{" "}
            {localized(locale, "All rights reserved.", "جميع الحقوق محفوظة.")}
          </p>
          <p className={`text-[10px] md:text-[11px] ${mutedTextClass}`}>
            {localized(locale, "Powered by NUMU", "مدعوم بواسطة NUMU")}
          </p>
        </div>
      </div>
    </footer>
  );
}
