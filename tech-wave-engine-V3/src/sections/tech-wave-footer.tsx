"use client";
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
import { asString, localized, type SectionRenderProps } from "./_shared";

/**
 * Tech Wave footer — the theme's own chrome (replaces the host's generic
 * fallback strip). Uses Tech Wave's existing `.tw-footer` deep-dark gradient
 * + neon top hairline, `.tw-divider`, `.tw-chip`, `.tw-neon-text` and the
 * `--primary` cyan / `--accent` violet HSL tokens from src/theme.css, with
 * the same `rounded-xl` radius and 0.3s ease transitions as the rest of the
 * theme. Newsletter capture is intentionally left to the dedicated
 * `tech-wave-newsletter` section — the footer carries contact instead.
 */

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

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
  instagram: InstagramIcon,
  facebook: (p) => <Facebook size={p.size} aria-hidden="true" />,
  twitter: (p) => <Twitter size={p.size} aria-hidden="true" />,
  x: (p) => <Twitter size={p.size} aria-hidden="true" />,
  tiktok: (p) => <Music2 size={p.size} aria-hidden="true" />,
  whatsapp: (p) => <MessageCircle size={p.size} aria-hidden="true" />,
  youtube: (p) => <Youtube size={p.size} aria-hidden="true" />,
};

const SOCIAL_LABELS: Record<string, [string, string]> = {
  instagram: ["Instagram", "إنستجرام"],
  facebook: ["Facebook", "فيسبوك"],
  twitter: ["X", "إكس"],
  x: ["X", "إكس"],
  tiktok: ["TikTok", "تيك توك"],
  whatsapp: ["WhatsApp", "واتساب"],
  youtube: ["YouTube", "يوتيوب"],
};

/** Parse "Label | /href" lines into links; bare lines become label-only. */
const parseLinkList = (raw: string): FooterLink[] =>
  raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, href] = line.split("|").map((p) => p.trim());
      return { label: label || "", href: href || "/" };
    })
    .filter((l) => l.label);

const TechWaveFooter = ({ instance, sectionId }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const themeSettings = useThemeSettings();
  const locale = useLocale();

  const brandName =
    asString(s.brand_name) ||
    asString(themeSettings.global_settings?.brand_name) ||
    shop?.name ||
    localized(locale, "Store", "المتجر");

  const tagline =
    asString(s.tagline) ||
    localized(
      locale,
      "Tech that keeps up with you — curated gear, fast shipping across Egypt.",
      "تكنولوجيا على قد طموحك — تشكيلة مختارة وشحن سريع لكل مصر.",
    );

  const defaultColumns: FooterColumn[] = [
    {
      title: localized(locale, "Shop", "تسوق"),
      links: [
        {
          label: localized(locale, "All products", "كل المنتجات"),
          href: "/products",
        },
        {
          label: localized(locale, "Collections", "الأقسام"),
          href: "/collections",
        },
        { label: localized(locale, "Search", "بحث"), href: "/search" },
      ],
    },
    {
      title: localized(locale, "Help", "المساعدة"),
      links: [
        { label: localized(locale, "About", "عن المتجر"), href: "/about" },
        { label: localized(locale, "Contact", "اتصل بنا"), href: "/contact" },
        { label: localized(locale, "My account", "حسابي"), href: "/account" },
      ],
    },
  ];

  // Merchant-configured columns (2 link-list settings, "Label | /href" lines).
  const configured: FooterColumn[] = [
    {
      title:
        asString(s.column_1_title) || localized(locale, "Shop", "تسوق"),
      links: parseLinkList(asString(s.column_1_links)),
    },
    {
      title:
        asString(s.column_2_title) || localized(locale, "Help", "المساعدة"),
      links: parseLinkList(asString(s.column_2_links)),
    },
  ].filter((c) => c.links.length > 0);

  // A NESTED `footer` menu from the hub Navigation manager wins when present
  // (the SDK already pruned links whose target page is hidden).
  const footerMenu = useNavigation("footer");
  const menuColumns: FooterColumn[] = footerMenu.items.some(
    (i) => (i.children?.length ?? 0) > 0,
  )
    ? footerMenu.items
        .filter((i) => (i.children?.length ?? 0) > 0)
        .map((i) => ({
          title: i.title,
          links: i.children
            .map((c) => ({ label: c.title, href: c.url || "/" }))
            .filter((l) => l.label),
        }))
        .filter((c) => c.title && c.links.length > 0)
    : [];

  const columns =
    menuColumns.length > 0
      ? menuColumns
      : configured.length > 0
        ? configured
        : defaultColumns;

  // Contact — merchant settings first, else the store's social_links payload.
  const socialsRaw = (shop?.social_links ?? {}) as Record<string, string>;
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = socialsRaw[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };
  const email = asString(s.contact_email) || pick("email", "contact_email");
  const phone = asString(s.contact_phone) || pick("phone", "contact_phone");
  const phoneDigits = phone.replace(/\D/g, "");

  // Social icons — only render the platforms actually present on the store.
  const socials = Object.entries(socialsRaw)
    .map(([name, url]) => ({ name: name.toLowerCase(), url: asString(url) }))
    .filter(({ name, url }) => Boolean(url) && Boolean(SOCIAL_ICONS[name]));

  const socialHref = (name: string, url: string) =>
    name === "whatsapp" && !/^https?:/i.test(url)
      ? `https://wa.me/${url.replace(/\D/g, "")}`
      : url;

  const showPoweredBy = s.show_powered_by !== false;
  const year = new Date().getFullYear();

  return (
    <footer
      className="tw-footer pt-12 pb-8"
      data-tw-section={sectionId}
      aria-label={localized(locale, "Site footer", "تذييل الموقع")}
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
          {/* Brand identity */}
          <div className="col-span-2 md:col-span-2">
            <Link
              to="/"
              className="inline-flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              aria-label={brandName}
            >
              <span className="tw-neon-text text-xl font-black tracking-tight">
                {brandName}
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              {tagline}
            </p>

            {(email || phoneDigits) && (
              <div className="mt-5 flex flex-col gap-2">
                {email && (
                  <a
                    href={`mailto:${email}`}
                    dir="ltr"
                    className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] rounded-lg"
                  >
                    <Mail size={15} aria-hidden="true" />
                    <span>{email}</span>
                  </a>
                )}
                {phoneDigits && (
                  <a
                    href={`tel:${phoneDigits}`}
                    dir="ltr"
                    className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] rounded-lg"
                  >
                    <Phone size={15} aria-hidden="true" />
                    <span>{phone}</span>
                  </a>
                )}
              </div>
            )}

            {socials.length > 0 && (
              <nav
                className="mt-5 flex flex-wrap gap-2"
                aria-label={localized(locale, "Social media", "مواقع التواصل")}
              >
                {socials.map(({ name, url }) => {
                  const Icon = SOCIAL_ICONS[name] ?? Send;
                  const [en, ar] = SOCIAL_LABELS[name] ?? [name, name];
                  return (
                    <a
                      key={name}
                      href={socialHref(name, url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={localized(locale, en, ar)}
                      className="tw-chip flex h-9 w-9 items-center justify-center rounded-xl text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                    >
                      <Icon size={16} />
                    </a>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--primary)/0.85)]">
                {col.title}
              </h2>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={`${col.title}-${l.label}`}>
                    <Link
                      to={l.href}
                      className="inline-block py-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] rounded-lg"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <hr className="tw-divider my-8" />

        <div className="flex flex-col items-center justify-between gap-2 text-center text-xs text-[hsl(var(--muted-foreground))] md:flex-row md:text-start">
          <p>
            © {year} {brandName}.{" "}
            {localized(locale, "All rights reserved.", "كل الحقوق محفوظة.")}
          </p>
          {showPoweredBy && (
            <p>{localized(locale, "Powered by NUMU", "مدعوم من NUMU")}</p>
          )}
        </div>
      </div>
    </footer>
  );
};

export default TechWaveFooter;
