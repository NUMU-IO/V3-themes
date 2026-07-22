"use client";

import {
  Link,
  logoImgStyle,
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
import {
  asBool,
  asImageUrl,
  asString,
  localized,
  type SectionRenderProps,
} from "./_shared";

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
      {
        label: localized(locale, "All products", "كل المنتجات"),
        href: "/products",
      },
      {
        label: localized(locale, "New arrivals", "وصل حديثاً"),
        href: "/products?sort=newest",
      },
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
const InstagramIcon = ({ size = 18 }: { size?: number }) => (
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

/**
 * modern-footer — Modern (V3) chrome footer.
 *
 * Same identity as the rest of the theme: the soft `--secondary` band the
 * hero fades into, `--border` hairlines, `rounded-2xl` pills, teal
 * `--primary` on hover and the `store-gradient` accent on the social
 * buttons. Link columns come from the merchant's nested "footer" menu when
 * one exists, else from the two column settings, else bilingual defaults.
 */
export default function ModernFooter({
  instance,
  sectionId,
}: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const themeSettings = useThemeSettings();
  const locale = useLocale();
  const isAr = (locale || "").toLowerCase().startsWith("ar");

  const brandName = asString(s.brand_name) || shop?.name || "";
  const logoUrl = asImageUrl(s.logo_url) || shop?.logo_url || "";
  const gs = (themeSettings.global_settings ?? {}) as Record<string, unknown>;
  const logoShape = asString(gs.logo_shape) || "none";
  const logoSize = asString(gs.logo_size) || "small";
  const logoShaped = logoShape !== "none";
  const logoStyle = logoImgStyle(logoShape, logoSize);

  const taglineSetting = isAr
    ? asString(s.tagline_ar) || asString(s.tagline)
    : asString(s.tagline) || asString(s.tagline_ar);
  const tagline =
    taglineSetting ||
    localized(
      locale,
      "A curated selection, delivered across Egypt. Honest quality, fair prices.",
      "تشكيلة مختارة بعناية بتوصيل لكل مصر. جودة صادقة وأسعار مناسبة.",
    );

  const email = asString(s.contact_email);
  const phone = asString(s.contact_phone);
  const showContact = asBool(s.show_contact, true) && Boolean(email || phone);

  // Column settings — two settings-driven columns (Modern's sections are
  // settings-only, no block idiom, so we stay consistent with them).
  const settingsColumns: FooterColumn[] = [1, 2]
    .map((c) => {
      const links: FooterLink[] = [];
      for (let i = 1; i <= 4; i++) {
        const label = asString(s[`col${c}_link${i}_label`]);
        const href = asString(s[`col${c}_link${i}_href`]);
        if (label && href) links.push({ label, href });
      }
      return { title: asString(s[`col${c}_title`]), links };
    })
    .filter((c) => c.title && c.links.length > 0);

  // A NESTED "footer" menu (column parents with children) wins — the SDK has
  // already dropped links whose target page is hidden.
  const footerMenu = useNavigation("footer");
  const menuColumns: FooterColumn[] = footerMenu.items
    .filter((i) => (i.children?.length ?? 0) > 0)
    .map((i) => ({
      title: i.title,
      links: (i.children ?? [])
        .filter((c) => c.target_visible !== false && c.title)
        .map((c) => ({ label: c.title, href: c.url || "/" })),
    }))
    .filter((c) => c.title && c.links.length > 0);

  const columns =
    menuColumns.length > 0
      ? menuColumns
      : settingsColumns.length > 0
        ? settingsColumns
        : defaultColumns(locale);

  // Socials: theme globals win, store `social_links` fills the rest.
  const globalSocials: Record<string, string> = {
    instagram: asString(gs.social_instagram),
    facebook: asString(gs.social_facebook),
    tiktok: asString(gs.social_tiktok),
    twitter: asString(gs.social_x),
    whatsapp: asString(gs.social_whatsapp),
    youtube: asString(gs.social_youtube),
  };
  const merged: Record<string, string> = {
    ...((shop?.social_links as Record<string, string> | undefined) ?? {}),
  };
  for (const [name, url] of Object.entries(globalSocials)) {
    if (url) merged[name] = url;
  }
  const socials = Object.entries(merged)
    .map(([name, url]) => ({ name, url: asString(url) }))
    .filter(({ url }) => Boolean(url));

  const socialHref = (name: string, url: string) =>
    name.toLowerCase() === "whatsapp"
      ? `https://wa.me/${url.replace(/\D/g, "")}`
      : url;

  return (
    <footer
      className="mt-16 border-t border-border bg-secondary/50"
      data-modern-section={sectionId}
    >
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand block */}
          <div className="md:col-span-2 max-w-md">
            <Link
              to="/"
              aria-label={brandName || localized(locale, "Home", "الرئيسية")}
              className="inline-flex items-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={
                    brandName || localized(locale, "Store logo", "شعار المتجر")
                  }
                  className={
                    logoShaped ? "w-auto max-h-12" : "h-10 w-auto object-contain"
                  }
                  style={
                    logoShaped
                      ? { ...logoStyle, width: "auto", aspectRatio: "1 / 1" }
                      : logoStyle
                  }
                />
              ) : (
                <span className="text-xl font-black text-foreground">
                  {brandName}
                </span>
              )}
            </Link>

            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {tagline}
            </p>

            {showContact && (
              <div className="mt-5 flex flex-col gap-2.5">
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex items-center gap-2.5 text-sm text-foreground/75 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
                  >
                    <Mail size={16} aria-hidden="true" className="text-primary" />
                    <span dir="ltr">{email}</span>
                  </a>
                )}
                {phone && (
                  <a
                    href={`tel:${phone.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-2.5 text-sm text-foreground/75 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
                  >
                    <Phone size={16} aria-hidden="true" className="text-primary" />
                    <span dir="ltr">{phone}</span>
                  </a>
                )}
              </div>
            )}

            {socials.length > 0 && (
              <nav
                className="mt-6 flex flex-wrap gap-2.5"
                aria-label={localized(
                  locale,
                  "Social media",
                  "مواقع التواصل",
                )}
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
                      className="inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-border bg-background text-foreground/70 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      {Icon ? (
                        <Icon size={18} />
                      ) : (
                        <Send size={18} aria-hidden="true" />
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
              <h2 className="text-sm font-black text-foreground mb-4">
                {col.title}
              </h2>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={`${col.title}-${l.label}`}>
                    <Link
                      to={l.href}
                      className="inline-block text-sm text-muted-foreground hover:text-primary transition-colors rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {brandName}.{" "}
            {localized(locale, "All rights reserved.", "كل الحقوق محفوظة.")}
          </p>
          <p>{localized(locale, "Powered by NUMU", "مدعوم من NUMU")}</p>
        </div>
      </div>
    </footer>
  );
}
