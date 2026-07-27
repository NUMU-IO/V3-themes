"use client";

/**
 * elegant-footer — Elegant's chrome footer.
 *
 * Same vocabulary as the rest of the theme: the warm `--secondary` band
 * (the tone `elegant-newsletter` uses for its card), hairline
 * `--border` rules, the serif `.eg-heading` wordmark, uppercase
 * wide-tracked `.eg-label` column headings and muted body copy. Link
 * columns come from the merchant's nested `footer` menu when they built
 * one, otherwise from the section's own link settings, otherwise from a
 * bilingual default set — the same "merchant value wins, bilingual
 * default fills in" idiom the theme's other sections use.
 */

import {
  Link,
  useLocale,
  useNavigation,
  useResolvedSettings,
  useShop,
  useThemeSettings,
} from "@numueg/theme-sdk";
import {
  Facebook,
  Mail,
  MessageCircle,
  Music2,
  Phone,
  Send,
  Twitter,
  Youtube,
} from "lucide-react";
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
    title: localized(locale, "Shop", "تسوق"),
    links: [
      { label: localized(locale, "All products", "كل المنتجات"), href: "/products" },
      { label: localized(locale, "Collections", "التشكيلات"), href: "/collections" },
      { label: localized(locale, "Search", "بحث"), href: "/search" },
    ],
  },
  {
    title: localized(locale, "Help", "المساعدة"),
    links: [
      { label: localized(locale, "Shipping", "الشحن"), href: "/shipping" },
      { label: localized(locale, "Returns", "الاسترجاع"), href: "/returns" },
      { label: localized(locale, "Contact us", "كلمنا"), href: "/contact" },
    ],
  },
];

/** Inline Instagram glyph (lucide dropped its named export). */
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const SOCIAL_ICONS: Record<string, (p: { className?: string }) => JSX.Element> = {
  instagram: (p) => <InstagramIcon className={p.className} />,
  facebook: (p) => <Facebook className={p.className} aria-hidden="true" />,
  twitter: (p) => <Twitter className={p.className} aria-hidden="true" />,
  x: (p) => <Twitter className={p.className} aria-hidden="true" />,
  tiktok: (p) => <Music2 className={p.className} aria-hidden="true" />,
  whatsapp: (p) => <MessageCircle className={p.className} aria-hidden="true" />,
  youtube: (p) => <Youtube className={p.className} aria-hidden="true" />,
};

const ElegantFooter = ({ instance, sectionId }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const themeSettings = useThemeSettings();
  const locale = useLocale();

  const globals = (themeSettings.global_settings ?? {}) as Record<string, unknown>;

  const brandName =
    asString(s.brand_name) || asString(globals.brand_name) || shop?.name || "";
  const logoUrl = asImageUrl(s.logo_url) || "";
  const tagline =
    asString(s.tagline) ||
    localized(
      locale,
      "A carefully curated edit — timeless pieces, honest craft, delivered across Egypt.",
      "تشكيلة مختارة بعناية — قطع خالدة وصنعة أمينة، بتوصلك في كل مصر.",
    );

  const contactEmail = asString(s.contact_email);
  const contactPhone = asString(s.contact_phone);

  // Columns: merchant settings first, then a nested `footer` menu, then the
  // bilingual defaults.
  const settingColumns: FooterColumn[] = [1, 2]
    .map((i) => {
      const links: FooterLink[] = [];
      for (let j = 1; j <= 3; j++) {
        const label = asString(s[`column_${i}_link_${j}_label`]);
        const href = asString(s[`column_${i}_link_${j}_href`]);
        if (label && href) links.push({ label, href });
      }
      return { title: asString(s[`column_${i}_title`]), links };
    })
    .filter((c) => c.title && c.links.length > 0);

  const footerMenu = useNavigation(asString(s.menu_handle) || "footer");
  const menuColumns: FooterColumn[] = footerMenu.items.some(
    (i) => (i.children?.length ?? 0) > 0,
  )
    ? footerMenu.items
        .filter((i) => (i.children?.length ?? 0) > 0 && i.target_visible !== false)
        .map((i) => ({
          title: i.title,
          links: (i.children ?? [])
            .filter((c) => c.target_visible !== false)
            .map((c) => ({ label: c.title, href: c.url || "/" }))
            .filter((l) => l.label),
        }))
        .filter((c) => c.title && c.links.length > 0)
    : [];

  const columns =
    settingColumns.length > 0
      ? settingColumns
      : menuColumns.length > 0
        ? menuColumns
        : defaultColumns(locale);

  // Socials: theme globals win over the store's own `social_links`.
  const merged: Record<string, string> = {
    ...((shop?.social_links as Record<string, string> | undefined) ?? {}),
  };
  for (const [name, key] of [
    ["instagram", "social_instagram"],
    ["facebook", "social_facebook"],
    ["tiktok", "social_tiktok"],
    ["twitter", "social_x"],
    ["whatsapp", "social_whatsapp"],
    ["youtube", "social_youtube"],
  ] as const) {
    const url = asString(globals[key]);
    if (url) merged[name] = url;
  }
  const socials = Object.entries(merged)
    .map(([name, url]) => ({ name, url: asString(url) }))
    .filter(({ url }) => Boolean(url));

  const socialHref = (name: string, url: string) =>
    name.toLowerCase() === "whatsapp" ? `https://wa.me/${url.replace(/\D/g, "")}` : url;

  return (
    <footer
      data-elegant-section={sectionId}
      className="bg-[hsl(var(--secondary))] text-foreground border-t border-border"
    >
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
          {/* Identity */}
          <div className="md:col-span-2 max-w-sm">
            <Link
              to="/"
              aria-label={brandName || "Home"}
              className="inline-flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brandName || "Logo"}
                  className="h-9 w-auto object-contain"
                />
              ) : (
                <span className="eg-heading text-xl text-foreground tracking-wide">
                  {brandName}
                </span>
              )}
            </Link>
            <div className="w-10 h-px bg-primary/40 my-4" />
            <p className="text-sm text-muted-foreground leading-relaxed">{tagline}</p>

            {(contactEmail || contactPhone) && (
              <ul className="mt-5 space-y-2">
                {contactEmail && (
                  <li>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="inline-flex items-center gap-2 min-h-[24px] text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                    >
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      <span dir="ltr">{contactEmail}</span>
                    </a>
                  </li>
                )}
                {contactPhone && (
                  <li>
                    <a
                      href={`tel:${contactPhone.replace(/\s/g, "")}`}
                      className="inline-flex items-center gap-2 min-h-[24px] text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      <span dir="ltr">{contactPhone}</span>
                    </a>
                  </li>
                )}
              </ul>
            )}

            {socials.length > 0 && (
              <nav
                aria-label={localized(locale, "Social media", "السوشيال ميديا")}
                className="flex flex-wrap gap-2 mt-6"
              >
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
                      className="inline-flex h-10 w-10 items-center justify-center border border-border text-foreground hover:text-primary hover:border-primary/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                    >
                      {Icon ? (
                        <Icon className="h-[18px] w-[18px]" />
                      ) : (
                        <Send className="h-[18px] w-[18px]" aria-hidden="true" />
                      )}
                    </a>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Link columns */}
          {columns.slice(0, 2).map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="eg-label text-foreground mb-4">{col.title}</h2>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={`${col.title}-${l.label}`}>
                    <Link
                      to={l.href}
                      className="inline-block min-h-[24px] text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {brandName}.{" "}
            {localized(locale, "All rights reserved.", "كل الحقوق محفوظة.")}
          </p>
          <p className="text-xs text-muted-foreground/80">
            {localized(locale, "Powered by NUMU", "مدعوم من NUMU")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default ElegantFooter;
