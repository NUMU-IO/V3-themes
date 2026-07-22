"use client";
/**
 * boutique-footer — Boutique (V3) storefront chrome.
 *
 * Same vocabulary as boutique-newsletter: the soft
 * `accent → hero-bg` gradient panel, the line · dot · line ornament,
 * pill buttons, rounded-3xl geometry, muted body copy.
 *
 * Boutique's sections don't use nested blocks, so link columns come from
 * the merchant's `footer` menu (nested → columns) with two declarative
 * link-list settings (title + 3 links each) as the schema-driven fallback,
 * and a bilingual default set as the last resort.
 */

import {
  Link,
  useLocale,
  useNavigation,
  useResolvedSettings,
  useShop,
  useThemeSettings,
} from "@numueg/theme-sdk";
import { Facebook, Mail, MessageCircle, Music2, Phone, Send, Twitter, Youtube } from "lucide-react";
import { asImageUrl, asString, localized, type SectionRenderProps } from "./_shared";

interface FooterLink {
  label: string;
  href: string;
}
interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const defaultColumns = (locale: string | undefined): FooterColumn[] => [
  {
    title: localized(locale, "Shop", "تسوقي"),
    links: [
      { label: localized(locale, "All products", "كل المنتجات"), href: "/products" },
      { label: localized(locale, "New arrivals", "وصل حديثًا"), href: "/products?sort=newest" },
      { label: localized(locale, "Search", "البحث"), href: "/search" },
    ],
  },
  {
    title: localized(locale, "Help", "المساعدة"),
    links: [
      { label: localized(locale, "About us", "عننا"), href: "/about" },
      { label: localized(locale, "Contact", "كلمينا"), href: "/contact" },
      { label: localized(locale, "My account", "حسابي"), href: "/account" },
    ],
  },
];

/** Inline Instagram glyph (lucide dropped its named export). */
const InstagramIcon = ({ size = 16 }: { size?: number }) => (
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

const SOCIAL_ICONS: Record<string, (p: { size?: number }) => JSX.Element> = {
  instagram: (p) => <InstagramIcon size={p.size} />,
  facebook: (p) => <Facebook size={p.size} aria-hidden="true" />,
  twitter: (p) => <Twitter size={p.size} aria-hidden="true" />,
  x: (p) => <Twitter size={p.size} aria-hidden="true" />,
  tiktok: (p) => <Music2 size={p.size} aria-hidden="true" />,
  whatsapp: (p) => <MessageCircle size={p.size} aria-hidden="true" />,
  youtube: (p) => <Youtube size={p.size} aria-hidden="true" />,
};

/** line · dot · line — Boutique's signature ornament. */
const Ornament = () => (
  <div className="flex items-center justify-center gap-3" aria-hidden="true">
    <span className="block w-8 h-px bg-primary/30" />
    <span className="block w-1.5 h-1.5 rounded-full bg-primary/50" />
    <span className="block w-8 h-px bg-primary/30" />
  </div>
);

const BoutiqueFooter = ({ instance, sectionId }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const themeSettings = useThemeSettings();
  const locale = useLocale();
  const isAr = (locale || "").toLowerCase().startsWith("ar");

  const brandName =
    asString(s.brand_name) ||
    asString(themeSettings.global_settings?.brand_name) ||
    shop?.name ||
    localized(locale, "Boutique", "بوتيك");

  const logoUrl =
    asImageUrl(s.logo_url) ||
    asImageUrl(themeSettings.global_settings?.logo_url) ||
    shop?.logo_url ||
    "";

  const tagline =
    (isAr
      ? asString(s.tagline_ar) || asString(s.tagline)
      : asString(s.tagline) || asString(s.tagline_ar)) ||
    localized(
      locale,
      "A curated edit of fashion and accessories — refined design, beautiful quality.",
      "تشكيلة مختارة من الأزياء والإكسسوارات — تصميم راقٍ وجودة تفرق.",
    );

  // Columns: merchant `footer` menu (nested) → schema link-list settings → defaults.
  const menuHandle = asString(s.menu_handle) || "footer";
  const footerMenu = useNavigation(menuHandle);
  const menuColumns: FooterColumn[] = footerMenu.items.some(
    (i) => (i.children?.length ?? 0) > 0,
  )
    ? footerMenu.items
        .filter((i) => (i.children?.length ?? 0) > 0)
        .map((i) => ({
          title: i.title,
          links: i.children
            .filter((c) => c.target_visible !== false && c.title)
            .map((c) => ({ label: c.title, href: c.url || "/" })),
        }))
        .filter((c) => c.title && c.links.length > 0)
    : [];

  const settingColumns: FooterColumn[] = [1, 2]
    .map((n) => {
      const links: FooterLink[] = [];
      for (let i = 1; i <= 3; i++) {
        const label = asString(s[`column${n}_link${i}_label`]);
        const href = asString(s[`column${n}_link${i}_href`]);
        if (label && href) links.push({ label, href });
      }
      return { title: asString(s[`column${n}_title`]), links };
    })
    .filter((c) => c.title && c.links.length > 0);

  const columns =
    menuColumns.length > 0
      ? menuColumns
      : settingColumns.length > 0
        ? settingColumns
        : defaultColumns(locale);

  // Contact line (Boutique already carries a newsletter section, so the chrome
  // footer keeps a plain contact block instead of a second signup form).
  const contactEmail = asString(s.contact_email);
  const contactPhone = asString(s.contact_phone);

  // Socials: theme globals win, else the store's own social_links.
  const gs = (themeSettings.global_settings ?? {}) as Record<string, unknown>;
  const globalSocials: Record<string, string> = {
    instagram: asString(gs.social_instagram),
    facebook: asString(gs.social_facebook),
    tiktok: asString(gs.social_tiktok),
    twitter: asString(gs.social_x),
    whatsapp: asString(gs.social_whatsapp),
    youtube: asString(gs.social_youtube),
  };
  const shopSocials = (shop?.social_links as Record<string, string> | undefined) ?? {};
  const merged: Record<string, string> = { ...shopSocials };
  for (const [name, url] of Object.entries(globalSocials)) if (url) merged[name] = url;
  const socials = Object.entries(merged)
    .map(([name, url]) => ({ name, url: asString(url) }))
    .filter(({ url }) => Boolean(url));

  const socialHref = (name: string, url: string) =>
    name.toLowerCase() === "whatsapp" ? `https://wa.me/${url.replace(/\D/g, "")}` : url;

  const copyright =
    (isAr
      ? asString(s.copyright_text_ar) || asString(s.copyright_text)
      : asString(s.copyright_text) || asString(s.copyright_text_ar)) ||
    localized(locale, "All rights reserved.", "كل الحقوق محفوظة.");

  const labels = {
    footerNav: localized(locale, "Footer", "روابط الفوتر"),
    social: localized(locale, "Social media", "السوشيال ميديا"),
    email: localized(locale, "Email us", "ابعتيلنا إيميل"),
    phone: localized(locale, "Call us", "كلمينا"),
  };

  return (
    <footer
      data-boutique-section={sectionId}
      className="mt-16 border-t border-border/50"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--hero-bg)), hsl(var(--background)))",
      }}
    >
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Identity */}
          <div className="md:col-span-2 max-w-md">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName}
                className="h-9 w-auto object-contain"
              />
            ) : (
              <h2 className="text-2xl font-bold text-foreground">{brandName}</h2>
            )}
            <div className="my-5 flex justify-start">
              <Ornament />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{tagline}</p>

            {(contactEmail || contactPhone) && (
              <ul className="mt-5 space-y-2 text-sm">
                {contactEmail && (
                  <li>
                    <a
                      href={`mailto:${contactEmail}`}
                      aria-label={labels.email}
                      className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-full"
                    >
                      <Mail size={15} aria-hidden="true" />
                      <span dir="ltr">{contactEmail}</span>
                    </a>
                  </li>
                )}
                {contactPhone && (
                  <li>
                    <a
                      href={`tel:${contactPhone.replace(/\s/g, "")}`}
                      aria-label={labels.phone}
                      className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-full"
                    >
                      <Phone size={15} aria-hidden="true" />
                      <span dir="ltr">{contactPhone}</span>
                    </a>
                  </li>
                )}
              </ul>
            )}

            {socials.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3" aria-label={labels.social}>
                {socials.map(({ name, url }) => {
                  const Icon = SOCIAL_ICONS[name.toLowerCase()];
                  return (
                    <a
                      key={name}
                      href={socialHref(name, url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name}
                      title={name}
                      className="w-10 h-10 rounded-full text-primary-foreground flex items-center justify-center transition-all duration-300 hover:shadow-[0_0_16px_hsl(var(--primary)/0.35)] hover:scale-[1.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      style={{ background: "hsl(var(--primary))" }}
                    >
                      {Icon ? <Icon size={16} /> : <Send size={16} aria-hidden="true" />}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Link columns */}
          <nav
            className="md:col-span-2 grid grid-cols-2 gap-8"
            aria-label={labels.footerNav}
          >
            {columns.slice(0, 2).map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  {col.title}
                </h3>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={`${col.title}-${l.label}`}>
                      <Link
                        to={l.href}
                        className="inline-block py-1 text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-full"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/50">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 text-center text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {brandName}. {copyright}
          </p>
          <span className="hidden sm:inline" aria-hidden="true">
            ·
          </span>
          <p>{localized(locale, "Powered by NUMU", "مدعوم من NUMU")}</p>
        </div>
      </div>
    </footer>
  );
};

export default BoutiqueFooter;
