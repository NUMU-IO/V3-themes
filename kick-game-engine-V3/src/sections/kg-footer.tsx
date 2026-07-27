"use client";
import {
  Link,
  logoImgStyle,
  useLocale,
  useNavigation,
  useShop,
  useThemeSettings,
  type NavigationItem,
} from "@numueg/theme-sdk";
import {
  Facebook,
  Instagram,
  Mail,
  MessageCircle,
  Music2,
  Phone,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import {
  asImageUrl,
  asNumber,
  asString,
  localized,
  type SectionRenderProps,
} from "./_shared";

interface FootLink {
  label: string;
  href: string;
}

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  x: Twitter,
  tiktok: Music2,
  youtube: Youtube,
  whatsapp: MessageCircle,
};

const toLinks = (items: NavigationItem[]): FootLink[] =>
  items
    .filter((i) => i.target_visible !== false && i.title)
    .map((i) => ({ label: i.title, href: i.url || "/" }));

const shopLinks = (locale: string | undefined): FootLink[] => [
  { label: localized(locale, "All products", "كل المنتجات"), href: "/products" },
  { label: localized(locale, "Collections", "المجموعات"), href: "/collections" },
  { label: localized(locale, "Search", "دور على حاجة"), href: "/search" },
  { label: localized(locale, "My account", "حسابي"), href: "/account" },
];

const helpLinks = (locale: string | undefined): FootLink[] => [
  { label: localized(locale, "About us", "عن المتجر"), href: "/about" },
  { label: localized(locale, "Contact", "كلمنا"), href: "/contact" },
  { label: localized(locale, "Track order", "تتبع طلبك"), href: "/account/orders" },
  { label: localized(locale, "Cart", "السلة"), href: "/cart" },
];

/**
 * kg-footer — Kick Game's own chrome footer.
 *
 * The dark band the theme already uses for kgnewsletter (#121212 / cream ink,
 * gold column titles): identity block, two link columns (merchant menus via
 * link_list_picker, otherwise a sensible route set), a contact block, the
 * store's configured socials, and a bilingual copyright line.
 */
const KGFooter = ({ instance, sectionId }: SectionRenderProps) => {
  const s = instance.settings ?? {};
  const locale = useLocale();
  const isAr = (locale || "").toLowerCase().startsWith("ar");
  const shop = useShop();
  const themeSettings = useThemeSettings();
  const globals = themeSettings.global_settings ?? {};

  const brandName =
    (isAr ? asString(s.brand_name_ar) : "") ||
    asString(s.brand_name) ||
    shop?.name ||
    "KICK GAME";
  const showLogo = s.show_logo === true;
  const logoUrl =
    asImageUrl(s.logo_url) || asImageUrl(globals.logo_url) || shop?.logo_url || "";
  const logoHeight = asNumber(s.logo_height, 36);
  const logoShape = asString(globals.logo_shape) || "none";
  const logoShaped = logoShape !== "none";
  const logoStyle = logoImgStyle(logoShape, asString(globals.logo_size) || "small");

  const tagline =
    (isAr ? asString(s.tagline_ar) : "") ||
    asString(s.tagline) ||
    localized(
      locale,
      "Curated streetwear, dropped weekly. Authentic pairs only.",
      "ستريت وير مختار بعناية، دروبات كل أسبوع. أوريجينال بس.",
    );

  const column1Title =
    (isAr ? asString(s.column_1_title_ar) : "") ||
    asString(s.column_1_title) ||
    localized(locale, "SHOP", "المتجر");
  const column2Title =
    (isAr ? asString(s.column_2_title_ar) : "") ||
    asString(s.column_2_title) ||
    localized(locale, "HELP", "المساعدة");

  const menu1 = useNavigation(asString(s.column_1_menu) || "footer");
  const menu2 = useNavigation(asString(s.column_2_menu) || "footer-secondary");
  const links1 = toLinks(menu1.items ?? []);
  const links2 = toLinks(menu2.items ?? []);
  const column1 = links1.length > 0 ? links1 : shopLinks(locale);
  const column2 = links2.length > 0 ? links2 : helpLinks(locale);

  const contactTitle =
    (isAr ? asString(s.contact_title_ar) : "") ||
    asString(s.contact_title) ||
    localized(locale, "GET IN TOUCH", "تواصل معانا");
  const email = asString(s.contact_email);
  const phone = asString(s.contact_phone);

  const socials = Object.entries(shop?.social_links ?? {}).filter(
    ([, url]) => typeof url === "string" && url.trim() !== "",
  );

  const year = new Date().getFullYear();
  const copyright =
    (isAr ? asString(s.copyright_ar) : "") ||
    asString(s.copyright) ||
    localized(
      locale,
      `© ${year} ${brandName}. All rights reserved.`,
      `© ${year} ${brandName}. كل الحقوق محفوظة.`,
    );

  return (
    <footer className="kg-foot" data-kg-section={sectionId}>
      <div className="kg-foot-inner">
        <div className="kg-foot-brand">
          {showLogo && logoUrl ? (
            <img
              src={logoUrl}
              alt={brandName}
              style={
                logoShaped
                  ? { ...logoStyle, width: "auto", aspectRatio: "1 / 1" }
                  : { height: `${logoHeight}px`, maxHeight: "56px" }
              }
            />
          ) : (
            <p className="kg-foot-name">{brandName}</p>
          )}
          <p className="kg-foot-tagline">{tagline}</p>

          {socials.length > 0 && (
            <nav
              className="kg-foot-social"
              aria-label={localized(locale, "Social links", "روابط التواصل")}
            >
              {socials.map(([key, url]) => {
                const Icon = SOCIAL_ICONS[key.toLowerCase()] ?? Mail;
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={key}
                  >
                    <Icon size={17} aria-hidden="true" />
                  </a>
                );
              })}
            </nav>
          )}
        </div>

        <nav aria-label={column1Title}>
          <p className="kg-foot-title">{column1Title}</p>
          <ul className="kg-foot-list">
            {column1.map((l) => (
              <li key={`c1-${l.label}-${l.href}`}>
                <Link to={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={column2Title}>
          <p className="kg-foot-title">{column2Title}</p>
          <ul className="kg-foot-list">
            {column2.map((l) => (
              <li key={`c2-${l.label}-${l.href}`}>
                <Link to={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="kg-foot-title">{contactTitle}</p>
          <div className="kg-foot-contact">
            {email && (
              <a href={`mailto:${email}`}>
                <Mail
                  size={14}
                  aria-hidden="true"
                  style={{ marginInlineEnd: "8px" }}
                />
                {email}
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} dir="ltr">
                <Phone
                  size={14}
                  aria-hidden="true"
                  style={{ marginInlineEnd: "8px" }}
                />
                {phone}
              </a>
            )}
            {!email && !phone && (
              <Link to="/contact">
                {localized(locale, "Contact us", "كلمنا")}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="kg-foot-bottom">
        <p>{copyright}</p>
      </div>
    </footer>
  );
};

export default KGFooter;
