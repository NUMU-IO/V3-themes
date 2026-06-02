"use client";
import { useState } from "react";
import { Link, useNavigation, useShop, useThemeSettings } from "@numueg/theme-sdk";
import { Facebook, Instagram, MapPin, Phone, Send, Twitter } from "lucide-react";
import { asString } from "./_shared";

/**
 * Vionne global footer.
 *
 * Vionne shipped with NO footer section (it wasn't in the registry or any
 * template), so every page rendered with no site chrome at the bottom. This
 * is rendered globally by `main.tsx` on every template (except checkout, which
 * is platform-owned), so it needs no stored section settings to appear:
 *
 *  - brand name  ← `useShop().name`
 *  - social icons ← `useShop().social_links` (managed in the customizer's
 *                   Social-links panel — same source bon-younes uses)
 *  - link columns ← the merchant's "footer" navigation menu, falling back to
 *                   sensible defaults when none is configured
 */

const SOCIAL_ICONS: Record<string, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
};

interface FooterLink {
  label: string;
  href: string;
}
interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: "Shop",
    links: [
      { label: "New in", href: "/products" },
      { label: "Best sellers", href: "/products" },
      { label: "Accessories", href: "/products" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Shipping", href: "/shipping" },
      { label: "Returns", href: "/returns" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

const VionneFooter = () => {
  const shop = useShop();
  const themeSettings = useThemeSettings();
  const brandName = shop?.name || "Vionne";
  const tagline =
    asString(themeSettings.global_settings?.footer_tagline) ||
    "Modest fashion, quietly tailored — made to be lived in.";

  // Merchant-managed footer menu wins; childless items collapse into one
  // leading heading-less column, items with children become titled columns.
  const { items: footerMenuItems } = useNavigation("footer");
  const menuColumns: FooterColumn[] = (() => {
    if (footerMenuItems.length === 0) return [];
    const cols: FooterColumn[] = [];
    const loose: FooterLink[] = [];
    for (const item of footerMenuItems) {
      const kids = item.children ?? [];
      if (kids.length > 0) {
        cols.push({
          title: item.title,
          links: kids.map((c) => ({ label: c.title, href: c.url || "/" })),
        });
      } else {
        loose.push({ label: item.title, href: item.url || "/" });
      }
    }
    if (loose.length > 0) cols.unshift({ title: "", links: loose });
    return cols;
  })();
  const columns = menuColumns.length > 0 ? menuColumns : DEFAULT_COLUMNS;

  const socialLinks =
    (shop?.social_links as Record<string, string> | undefined) ?? {};
  const socials = Object.entries(socialLinks)
    .map(([name, url]) => ({ name, url: asString(url) }))
    .filter((slink) => slink.url);

  const address = asString(shop?.address);
  const phone = asString(shop?.phone);

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <footer className="bg-[var(--vn-ink,#1a1a1a)] text-white/85">
      <div className="container mx-auto px-4 py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <h3 className="vn-heading text-white text-2xl mb-3">{brandName}</h3>
            <p className="text-sm text-white/70 max-w-xs leading-relaxed">
              {tagline}
            </p>
            {(address || phone) && (
              <div className="mt-4 flex flex-col gap-1.5 text-sm text-white/70">
                {address && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={14} aria-hidden="true" /> {address}
                  </span>
                )}
                {phone && (
                  <a
                    href={`tel:${phone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-2 hover:text-white"
                  >
                    <Phone size={14} aria-hidden="true" /> {phone}
                  </a>
                )}
              </div>
            )}
            {socials.length > 0 && (
              <div className="flex gap-3 mt-5" aria-label="Social media">
                {socials.map(({ name, url }) => {
                  const Icon = SOCIAL_ICONS[name.toLowerCase()] ?? Send;
                  return (
                    <a
                      key={name}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 hover:bg-white/10 transition-colors"
                    >
                      <Icon size={16} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {columns.map((col, ci) => (
            <div key={`${col.title}-${ci}`}>
              {col.title && (
                <h4 className="vn-eyebrow text-white/90 mb-3">{col.title}</h4>
              )}
              <ul className="space-y-2">
                {col.links.map((l, li) => (
                  <li key={`${ci}-${li}-${l.label}`}>
                    <Link
                      to={l.href}
                      className="text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="vn-eyebrow text-white/90 mb-3">Newsletter</h4>
            <p className="text-sm text-white/70 mb-3">
              Sign up for new arrivals and private offers.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email) {
                  setSubmitted(true);
                  setEmail("");
                }
              }}
              className="flex gap-2"
              noValidate
            >
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address"
                className="flex-1 min-w-0 bg-transparent border border-white/25 rounded px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/60"
              />
              <button
                type="submit"
                className="vn-btn vn-btn-outline-light text-xs px-4 whitespace-nowrap"
              >
                {submitted ? "Thanks" : "Join"}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/55">
          <span>
            © {new Date().getFullYear()} {brandName}. All rights reserved.
          </span>
          <span>Powered by NUMU</span>
        </div>
      </div>
    </footer>
  );
};

export default VionneFooter;
