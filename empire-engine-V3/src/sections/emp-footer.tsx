"use client";

import { useState } from "react";
import {
  Link,
  useResolvedSettings,
  useShop,
  useThemeSettings,
} from "@numueg/theme-sdk";
import { Facebook, MessageCircle, Music2, Send, Twitter } from "lucide-react";
import { asString, readBlocks, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";

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
    title: "SHOP",
    links: [
      { label: "All Products", href: "/products" },
      { label: "New Arrivals", href: "/products?sort=newest" },
      { label: "Search", href: "/search" },
    ],
  },
  {
    title: "HELP",
    links: [
      { label: "Shipping", href: "/shipping" },
      { label: "Returns", href: "/returns" },
      { label: "Contact", href: "/contact" },
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

const SOCIAL_ICONS: Record<
  string,
  ({ size }: { size?: number }) => JSX.Element
> = {
  instagram: InstagramIcon,
  facebook: (p) => <Facebook size={p.size} aria-hidden="true" />,
  twitter: (p) => <Twitter size={p.size} aria-hidden="true" />,
  tiktok: (p) => <Music2 size={p.size} aria-hidden="true" />,
  whatsapp: (p) => <MessageCircle size={p.size} aria-hidden="true" />,
};

/**
 * emp-footer — Empire's chrome footer. Ported from V2 EmpStoreFooter:
 * dark base with a wave divider on top, a centered newsletter CTA, a
 * brand block + social row, and configurable link columns (from
 * `column` blocks → fall back to Shop / Help defaults). Socials are
 * read from `store.social_links`. The newsletter is a local
 * subscribe-confirmation (no API), matching the other empire sections.
 */
export default function EmpFooter({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const themeSettings = useThemeSettings();

  const brandName =
    asString(s.brand_name) ||
    asString(themeSettings.global_settings?.brand_name) ||
    shop?.name ||
    "EMPIRE";

  const newsletterTitle = asString(s.newsletter_title) || "JOIN THE EMPIRE";
  const newsletterCopy =
    asString(s.newsletter_copy) ||
    "Early access to limited drops, exclusive offers, and the seasonal edit.";
  const newsletterButton = asString(s.newsletter_button_label) || "SUBSCRIBE";
  const newsletterButtonSuccess =
    asString(s.newsletter_button_success) || "SUBSCRIBED";
  const footerText =
    asString(s.footer_text) ||
    "Handpicked essentials, made in Egypt. Bold design, honest prices.";

  const configuredColumns: FooterColumn[] = readBlocks(instance, "column")
    .map((r) => {
      const links: FooterLink[] = [];
      for (let i = 1; i <= 4; i++) {
        const label = asString(r[`link${i}_label`]);
        const href = asString(r[`link${i}_href`]);
        if (label && href) links.push({ label, href });
      }
      return { title: asString(r.title), links };
    })
    .filter((c) => c.title && c.links.length > 0);

  const columns =
    configuredColumns.length > 0 ? configuredColumns : DEFAULT_COLUMNS;

  const socialLinks =
    (shop?.social_links as Record<string, string> | undefined) ?? {};
  const socials: Array<{ name: string; url: string }> = Object.entries(
    socialLinks,
  )
    .map(([name, url]) => ({ name, url: asString(url) }))
    .filter(({ url }) => Boolean(url));

  const formatSocialHref = (name: string, url: string) =>
    name.toLowerCase() === "whatsapp"
      ? `https://wa.me/${url.replace(/\D/g, "")}`
      : url;

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setEmail("");
  };

  return (
    <footer
      className="bg-[var(--emp-dark)] text-[var(--emp-cream)] relative overflow-hidden pb-20 md:pb-0"
      data-emp-section={sectionId}
    >
      {/* Wave top divider */}
      <svg
        viewBox="0 0 1440 60"
        className="w-full block -mt-px"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,60 C240,0 480,50 720,20 C960,-10 1200,40 1440,15 L1440,60 Z"
          fill="var(--emp-dark)"
        />
      </svg>

      {/* Newsletter */}
      <div className="container mx-auto px-4 py-12 text-center border-b border-white/10">
        <h3 className="emp-heading text-2xl md:text-3xl text-[var(--emp-amber)] mb-3">
          <InlineEditable
            sectionId={sectionId}
            settingKey="newsletter_title"
            value={newsletterTitle}
          />
        </h3>
        <p className="text-sm opacity-60 mb-6 max-w-md mx-auto">
          <InlineEditable
            sectionId={sectionId}
            settingKey="newsletter_copy"
            value={newsletterCopy}
            multiline
          />
        </p>
        {submitted ? (
          <div
            role="status"
            aria-live="polite"
            className="inline-flex items-center justify-center emp-btn emp-btn-amber h-11 px-6 text-[11px]"
          >
            {newsletterButtonSuccess}
          </div>
        ) : (
          <form
            className="flex gap-2 max-w-sm mx-auto"
            onSubmit={handleSubscribe}
            noValidate
          >
            <label htmlFor="emp-footer-email" className="sr-only">
              Email address
            </label>
            <input
              id="emp-footer-email"
              type="email"
              required
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              dir="ltr"
              className="flex-1 h-11 px-4 rounded-full bg-white/10 border border-white/20 text-sm placeholder:text-white/30 focus:outline-none focus:border-[var(--emp-amber)] transition-colors"
            />
            <button type="submit" className="emp-btn emp-btn-amber h-11 px-6 text-[11px]">
              {newsletterButton}
            </button>
          </form>
        )}
      </div>

      {/* Links grid */}
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span className="emp-heading text-xl text-[var(--emp-amber)]">
              <InlineEditable
                sectionId={sectionId}
                settingKey="brand_name"
                value={brandName}
              />
            </span>
            <p className="text-sm opacity-50 mt-3 leading-relaxed">
              <InlineEditable
                sectionId={sectionId}
                settingKey="footer_text"
                value={footerText}
                multiline
              />
            </p>
            {socials.length > 0 && (
              <div className="flex gap-3 mt-4" aria-label="Social media">
                {socials.map(({ name, url }) => {
                  const Icon = SOCIAL_ICONS[name.toLowerCase()] ?? null;
                  return (
                    <a
                      key={name}
                      href={formatSocialHref(name, url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name}
                      title={name}
                      className="w-9 h-9 rounded-full bg-[var(--emp-amber)] text-[var(--emp-dark)] flex items-center justify-center hover:opacity-80 transition-opacity"
                    >
                      {Icon ? <Icon size={16} /> : <Send size={16} aria-hidden="true" />}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="emp-label text-[var(--emp-amber)] mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={`${col.title}-${l.label}`}>
                    <Link
                      to={l.href}
                      className="text-sm opacity-60 hover:opacity-100 hover:text-[var(--emp-amber)] transition-all"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3 text-center text-xs opacity-30">
          <p>
            © {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
          <span className="hidden md:inline">·</span>
          <p>Powered by NUMU</p>
        </div>
      </div>
    </footer>
  );
}
