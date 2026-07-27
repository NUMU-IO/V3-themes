"use client";

import { useState } from "react";
import {
  Link,
  useLocale,
  useNavigation,
  useResolvedSettings,
  useShop,
} from "@numueg/theme-sdk";
import { Facebook, Instagram, Phone, Twitter } from "lucide-react";
import { asBool, asString, localized, type StSectionProps } from "./_shared";

/**
 * st-footer — Street's chrome footer.
 *
 * Black ground with yellow rules (`.st-footer` + the token palette), the same
 * 900-weight uppercase tracking the header uses, and the pill buttons/inputs
 * already defined in `styles.css`.
 */
export default function StFooter({ instance, sectionId }: StSectionProps) {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const locale = useLocale();

  const brandName = asString(s.brand_name) || shop?.name || "";
  const tagline = (() => {
    const ar = asString(s.tagline_ar);
    const en = asString(s.tagline);
    return (locale || "").toLowerCase().startsWith("ar") ? ar || en : en || ar;
  })();

  const menu = useNavigation(asString(s.menu_handle) || "footer-menu");
  const links =
    menu.items.length > 0
      ? menu.items
          .filter((i) => i.target_visible !== false && i.title)
          .map((i) => ({ label: i.title, href: i.url || "/" }))
      : [
          { label: localized(locale, "Shop", "تسوق"), href: "/products" },
          { label: localized(locale, "Track order", "تتبع طلبك"), href: "/track" },
          { label: localized(locale, "Shipping", "الشحن"), href: "/pages/shipping" },
          { label: localized(locale, "Returns", "الإرجاع"), href: "/pages/returns" },
        ];

  const socials = (shop as { social_links?: Record<string, string> } | null)
    ?.social_links ?? {};
  const socialIcons: Array<[string, typeof Instagram]> = [
    ["instagram", Instagram],
    ["facebook", Facebook],
    ["twitter", Twitter],
  ];

  const showNewsletter = asBool(s.show_newsletter, true);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <footer className="st-footer" data-st-section={sectionId}>
      <div className="mx-auto max-w-[1400px] px-4 py-14 grid gap-10 md:grid-cols-3">
        <div>
          <p className="text-2xl font-black uppercase tracking-tight text-[var(--st-yellow)]">
            {brandName}
          </p>
          {tagline && (
            <p className="mt-3 text-sm text-white/70 max-w-xs leading-relaxed">
              {tagline}
            </p>
          )}
          <div className="mt-5 flex items-center gap-3">
            {socialIcons.map(([key, Icon]) =>
              socials[key] ? (
                <a
                  key={key}
                  href={socials[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={key}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--st-yellow)] text-[var(--st-yellow)] hover:bg-[var(--st-yellow)] hover:text-[var(--st-dark)] transition-colors"
                >
                  <Icon size={17} aria-hidden="true" />
                </a>
              ) : null,
            )}
            {(shop as { phone?: string } | null)?.phone && (
              <a
                href={`tel:${(shop as { phone?: string }).phone}`}
                aria-label={localized(locale, "Call us", "اتصل بنا")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--st-yellow)] text-[var(--st-yellow)] hover:bg-[var(--st-yellow)] hover:text-[var(--st-dark)] transition-colors"
              >
                <Phone size={17} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>

        <nav aria-label={localized(locale, "Footer", "روابط")}>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--st-yellow)]">
            {localized(locale, "Explore", "استكشف")}
          </p>
          <ul className="mt-4 space-y-2.5">
            {links.map((l) => (
              <li key={`${l.href}-${l.label}`}>
                <Link
                  to={l.href}
                  className="text-sm text-white/80 hover:text-[var(--st-yellow)] transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {showNewsletter && (
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--st-yellow)]">
              {localized(locale, "Join the crew", "انضم للكرو")}
            </p>
            <p className="mt-3 text-sm text-white/70">
              {localized(
                locale,
                "Drops, restocks and nothing else.",
                "الدروبات والتوفر الجديد وبس.",
              )}
            </p>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setSent(true);
              }}
            >
              <label className="sr-only" htmlFor={`st-news-${sectionId}`}>
                {localized(locale, "Email address", "البريد الإلكتروني")}
              </label>
              <input
                id={`st-news-${sectionId}`}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="st-input !bg-white/5 !text-white !border-[var(--st-yellow)] placeholder:text-white/40"
                placeholder={localized(locale, "Email address", "البريد الإلكتروني")}
              />
              <button type="submit" className="st-btn-yellow shrink-0">
                {localized(locale, "Join", "اشترك")}
              </button>
            </form>
            {sent && (
              <p role="status" className="mt-2 text-xs text-[var(--st-yellow)]">
                {localized(locale, "You're on the list.", "تمام، أنت معانا.")}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto max-w-[1400px] px-4 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-white/55">
          <p>
            © {new Date().getFullYear()} {brandName}.{" "}
            {localized(locale, "All rights reserved.", "كل الحقوق محفوظة.")}
          </p>
          <p className="uppercase tracking-[0.14em]">
            {localized(locale, "Powered by NUMU", "مدعوم من NUMU")}
          </p>
        </div>
      </div>
    </footer>
  );
}
