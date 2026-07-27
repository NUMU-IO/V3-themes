"use client";

/**
 * nb-footer — Neo Brutalism chrome footer.
 *
 * Uses the theme's own `.nb-footer` band (near-black ink, cream text,
 * 4px primary top border) plus `.nb-badge` / `.nb-btn` shadows and the
 * uppercase 800/900 type the rest of the theme uses. Link columns come
 * from simple "Label | /url" textarea settings (this theme uses plain
 * settings, not blocks — see nbtestimonials / nbnewsletter).
 */

import {
  Link,
  useLocale,
  useNavigation,
  useResolvedSettings,
  useShop,
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
import { asString, localized, type SectionRenderProps } from "./_shared";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

/** Parse a "Label | /url" per-line textarea into links. */
const parseLinks = (raw: string): FooterLink[] =>
  raw
    .split("\n")
    .map((line) => {
      const [label, href] = line.split("|");
      return { label: (label ?? "").trim(), href: (href ?? "").trim() };
    })
    .filter((l) => l.label && l.href);

const defaultColumns = (locale: string | undefined): FooterColumn[] => [
  {
    title: localized(locale, "SHOP", "تسوّق"),
    links: [
      {
        label: localized(locale, "All products", "كل المنتجات"),
        href: "/products",
      },
      {
        label: localized(locale, "Collections", "التشكيلات"),
        href: "/collections",
      },
      { label: localized(locale, "Search", "بحث"), href: "/search" },
    ],
  },
  {
    title: localized(locale, "HELP", "مساعدة"),
    links: [
      { label: localized(locale, "About us", "من إحنا"), href: "/about" },
      { label: localized(locale, "Contact", "كلّمنا"), href: "/contact" },
      { label: localized(locale, "My account", "حسابي"), href: "/account" },
    ],
  },
];

/** Inline Instagram glyph (lucide dropped its named export). */
const InstagramIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width={16}
    height={16}
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

const SOCIAL_ICONS: Record<string, () => JSX.Element> = {
  instagram: () => <InstagramIcon />,
  facebook: () => <Facebook className="h-4 w-4" aria-hidden="true" />,
  twitter: () => <Twitter className="h-4 w-4" aria-hidden="true" />,
  x: () => <Twitter className="h-4 w-4" aria-hidden="true" />,
  tiktok: () => <Music2 className="h-4 w-4" aria-hidden="true" />,
  whatsapp: () => <MessageCircle className="h-4 w-4" aria-hidden="true" />,
  youtube: () => <Youtube className="h-4 w-4" aria-hidden="true" />,
};

const NbFooter = ({ instance, sectionId }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const locale = useLocale();

  const brandName =
    asString(s.brand_name) || shop?.name || localized(locale, "STORE", "المتجر");

  const tagline =
    asString(s.tagline) ||
    localized(
      locale,
      "Bold stuff, honest prices. Made loud in Egypt.",
      "حاجات جريئة وأسعار على قد الإيد. متصنّعة في مصر بصوت عالي.",
    );

  const contactEmail = asString(s.contact_email);
  const contactPhone = asString(s.contact_phone);

  // Columns: merchant "footer" menu (nested) → textarea settings → defaults.
  const footerMenu = useNavigation("footer");
  const menuColumns: FooterColumn[] = footerMenu.items.some(
    (i) => (i.children?.length ?? 0) > 0,
  )
    ? footerMenu.items
        .filter((i) => (i.children?.length ?? 0) > 0)
        .map((i) => ({
          title: i.title,
          links: (i.children ?? [])
            .map((c) => ({ label: c.title, href: c.url || "/" }))
            .filter((l) => l.label),
        }))
        .filter((c) => c.title && c.links.length > 0)
    : [];

  const settingColumns: FooterColumn[] = [
    {
      title: asString(s.column_1_title),
      links: parseLinks(asString(s.column_1_links)),
    },
    {
      title: asString(s.column_2_title),
      links: parseLinks(asString(s.column_2_links)),
    },
    {
      title: asString(s.column_3_title),
      links: parseLinks(asString(s.column_3_links)),
    },
  ].filter((c) => c.title && c.links.length > 0);

  const columns =
    menuColumns.length > 0
      ? menuColumns
      : settingColumns.length > 0
        ? settingColumns
        : defaultColumns(locale);

  const socialLinks = (shop?.social_links ?? {}) as Record<string, string>;
  const socials = Object.entries(socialLinks)
    .map(([name, url]) => ({ name, url: asString(url) }))
    .filter(({ url }) => Boolean(url));

  const socialHref = (name: string, url: string) =>
    name.toLowerCase() === "whatsapp" && !/^https?:/i.test(url)
      ? `https://wa.me/${url.replace(/\D/g, "")}`
      : url;

  return (
    <footer className="nb-footer" data-nb-section={sectionId}>
      <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-4">
        {/* Identity */}
        <div className="md:col-span-2">
          <span className="nb-wordmark inline-block text-lg px-2.5 py-1 rounded-lg">
            {brandName}
          </span>
          <p className="mt-4 text-sm font-medium max-w-sm opacity-80 leading-relaxed">
            {tagline}
          </p>

          {(contactEmail || contactPhone) && (
            <ul className="mt-4 flex flex-col gap-2 text-sm font-bold">
              {contactEmail && (
                <li>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="nb-footer-link inline-flex items-center gap-2 py-1"
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
                    className="nb-footer-link inline-flex items-center gap-2 py-1"
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
              className="mt-5 flex flex-wrap gap-2.5"
              aria-label={localized(locale, "Social media", "السوشيال ميديا")}
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
                    className="nb-social h-10 w-10 rounded-lg flex items-center justify-center"
                  >
                    {Icon ? (
                      <Icon />
                    ) : (
                      <Send className="h-4 w-4" aria-hidden="true" />
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
            <h2 className="nb-footer-heading text-xs mb-3">{col.title}</h2>
            <ul className="flex flex-col gap-1.5">
              {col.links.map((l) => (
                <li key={`${col.title}-${l.label}-${l.href}`}>
                  <Link
                    to={l.href}
                    className="nb-footer-link inline-block py-1 text-sm font-semibold"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* Third column (if configured) sits on its own row on small screens */}
      {columns.length > 2 && (
        <div className="container mx-auto px-4 pb-6">
          <nav aria-label={columns[2].title}>
            <h2 className="nb-footer-heading text-xs mb-3">
              {columns[2].title}
            </h2>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
              {columns[2].links.map((l) => (
                <li key={`c3-${l.label}-${l.href}`}>
                  <Link
                    to={l.href}
                    className="nb-footer-link inline-block py-1 text-sm font-semibold"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      <div className="nb-footer-bottom">
        <div className="container mx-auto px-4 py-4 text-center text-xs font-bold tracking-wide">
          © {new Date().getFullYear()} {brandName} —{" "}
          {localized(locale, "All rights reserved.", "كل الحقوق محفوظة.")}
        </div>
      </div>
    </footer>
  );
};

export default NbFooter;
