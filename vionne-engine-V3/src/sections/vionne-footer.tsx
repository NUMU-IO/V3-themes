"use client";
import { useState } from "react";
import {
  Link,
  useCollections,
  useLocale,
  useResolvedSettings,
  useShop,
  useThemeSettings,
} from "@numueg/theme-sdk";
import { Facebook, Instagram, Mail, Phone, Youtube } from "lucide-react";
import {
  asString,
  localized,
  readBlocks,
  type SectionRenderProps,
} from "./_shared";
import { InlineEditable } from "./_inline-editable";

/**
 * vionne-footer — faithful V3 port of V2 VionneStoreFooter
 * (numu-egyptian-bazaar/src/components/store/vionne/VionneStoreFooter.tsx),
 * re-plumbed onto the V3 SDK seam.
 *
 * A DARK grey footer (`vn-footer` = --vn-surface-dark, white text) with a
 * 4-column grid:
 *   (1) brand   — store wordmark (`vn-heading tracking-[0.32em] uppercase`) +
 *                 editable blurb + social icons read from `shop.social_links`;
 *   (2) Shop    — All products + collections;
 *   (3) Help    — Shipping / Returns / Privacy / Terms / FAQ / Contact / Track;
 *   (4) Newsletter — eyebrow title + subtitle + email input.
 * Bottom bar carries the copyright + payment methods + "Powered by NUMU".
 *
 * The Shop / Help columns can be overridden via `column` blocks (same seam as
 * the Gilded / Empire footers). Settings: brand_name, footer_about_text,
 * shop_title, help_title, show_newsletter, newsletter_title,
 * newsletter_subtitle, payment_methods.
 */

interface FooterLink {
  label: string;
  href: string;
}
interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export default function VionneFooter({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const shop = useShop();
  const { collections } = useCollections();
  const themeSettings = useThemeSettings();

  const brandName =
    asString(s.brand_name) ||
    asString(themeSettings.global_settings?.brand_name) ||
    shop?.name ||
    "VIONNE";

  const aboutText =
    asString(s.footer_about_text) ||
    asString(themeSettings.global_settings?.footer_tagline) ||
    localized(
      locale,
      "Modest, refined, made to be lived in.",
      "موضة محتشمة وراقية — مصمَّمة تتلبس كل يوم.",
    );

  const shopTitle = asString(s.shop_title) || localized(locale, "Shop", "تسوّقي");
  const helpTitle = asString(s.help_title) || localized(locale, "Help", "المساعدة");

  const showNewsletter = (s.show_newsletter as boolean) !== false;
  const newsletterTitle =
    asString(s.newsletter_title) || localized(locale, "Stay in the loop", "ابقي على اطّلاع");
  const newsletterSubtitle =
    asString(s.newsletter_subtitle) ||
    localized(
      locale,
      "Be first to know about new arrivals and exclusive drops.",
      "كوني أول من يعرف بكل جديد وعروضنا الحصرية.",
    );

  const paymentMethods = (
    asString(s.payment_methods) || "Visa, Mastercard, Cash on Delivery, Fawry"
  )
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  // Optional override columns from `column` blocks (gilded/empire seam).
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

  // V2 default Shop / Help columns.
  const shopColumn: FooterColumn = {
    title: shopTitle,
    links: [
      { label: localized(locale, "All products", "كل المنتجات"), href: "/products" },
      ...collections.slice(0, 5).map((cat) => ({
        label: cat.name,
        href: `/collections/${cat.slug}`,
      })),
    ],
  };
  const helpColumn: FooterColumn = {
    title: helpTitle,
    links: [
      { label: localized(locale, "Shipping", "الشحن"), href: "/pages/shipping" },
      { label: localized(locale, "Returns", "الإرجاع"), href: "/pages/returns" },
      { label: localized(locale, "Privacy", "الخصوصية"), href: "/pages/privacy" },
      { label: localized(locale, "Terms", "الشروط"), href: "/pages/terms" },
      { label: localized(locale, "FAQ", "الأسئلة الشائعة"), href: "/pages/faq" },
      { label: localized(locale, "Contact", "تواصلي"), href: "/pages/contact" },
      { label: localized(locale, "Track order", "تتبع الطلب"), href: "/track" },
    ],
  };

  const columnsToRender =
    overrideColumns.length > 0 ? overrideColumns : [shopColumn, helpColumn];

  // Socials from the live store (`shop.social_links`).
  const social = (shop?.social_links as Record<string, string> | undefined) ?? {};
  const instagram = asString(social.instagram);
  const facebook = asString(social.facebook);
  const youtube = asString(social.youtube);
  const emailLink = asString(social.email);
  const whatsapp = asString(social.whatsapp);
  const hasSocial = Boolean(instagram || facebook || youtube || emailLink || whatsapp);

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setEmail("");
    setTimeout(() => setSubmitted(false), 2000);
  };

  const year = new Date().getFullYear();

  return (
    <footer className="vn-footer" data-vionne-section={sectionId}>
      <div className="container mx-auto px-4 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
          {/* Brand column */}
          <div className="md:col-span-1">
            <Link to="/" className="vn-heading text-lg tracking-[0.32em] uppercase block mb-4">
              <InlineEditable sectionId={sectionId} settingKey="brand_name" value={brandName} />
            </Link>
            <p className="text-sm text-white/70 leading-relaxed mb-5 max-w-xs">
              <InlineEditable
                sectionId={sectionId}
                settingKey="footer_about_text"
                value={aboutText}
                multiline
              />
            </p>
            {hasSocial && (
              <div className="flex items-center gap-3">
                {instagram && (
                  <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <Instagram size={18} />
                  </a>
                )}
                {facebook && (
                  <a href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <Facebook size={18} />
                  </a>
                )}
                {youtube && (
                  <a href={youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                    <Youtube size={18} />
                  </a>
                )}
                {emailLink && (
                  <a href={`mailto:${emailLink}`} aria-label="Email">
                    <Mail size={18} />
                  </a>
                )}
                {whatsapp && (
                  <a
                    href={
                      whatsapp.startsWith("http")
                        ? whatsapp
                        : `https://wa.me/${whatsapp.replace(/\D/g, "")}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                  >
                    <Phone size={18} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Shop / Help (or override) columns */}
          {columnsToRender.map((col, ci) => (
            <div key={`${col.title}-${ci}`}>
              <h3 className="vn-eyebrow mb-4 text-white">{col.title}</h3>
              <ul className="space-y-2 text-sm">
                {col.links.map((l, li) => (
                  <li key={`${ci}-${li}-${l.label}`}>
                    <Link to={l.href}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter column */}
          {showNewsletter && (
            <div>
              <h3 className="vn-eyebrow mb-4 text-white">{newsletterTitle}</h3>
              <p className="text-sm text-white/70 mb-4 max-w-xs">{newsletterSubtitle}</p>
              <form onSubmit={submit} className="flex gap-2" noValidate>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={localized(locale, "Email address", "البريد الإلكتروني")}
                  aria-label="Email address"
                  className="flex-1 min-w-0 h-11 px-3 rounded-md bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/55 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <button
                  type="submit"
                  className="h-11 px-4 rounded-md bg-white text-[var(--vn-ink)] text-xs font-semibold uppercase tracking-[0.18em] hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  {localized(locale, "Join", "اشتركي")}
                </button>
              </form>
              {submitted && (
                <p className="text-xs text-white/80 mt-2">
                  {localized(locale, "Thanks for subscribing.", "شكرًا لاشتراكك.")}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-white/55">
          <span>
            © {year} {brandName}. {localized(locale, "All rights reserved.", "جميع الحقوق محفوظة.")}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {paymentMethods.map((m) => (
              <span key={m}>{m}</span>
            ))}
            {paymentMethods.length > 0 && <span aria-hidden="true">·</span>}
            <span>{localized(locale, "Powered by NUMU", "مدعوم من NUMU")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
