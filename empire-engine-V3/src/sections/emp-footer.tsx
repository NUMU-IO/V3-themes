"use client";

import {
  Link,
  useCollections,
  useLocale,
  useResolvedSettings,
  useShop,
  useThemeSettings,
} from "@numueg/theme-sdk";
import { asImageUrl, asString, localized, readBlocks, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";

interface FooterLink {
  label: string;
  href: string;
}
interface FooterColumn {
  title: string;
  links: FooterLink[];
}

/**
 * emp-footer — faithful V3 port of V2 EmpStoreFooter
 * (numu-egyptian-bazaar/src/components/store/empire/EmpStoreFooter.tsx).
 *
 * A BLACK footer (`bg-black text-white`). On top, a scrolling pre-footer
 * MARQUEE ("100% INDEPENDENT" repeated with the logo). Then a 4-column
 * grid: a brand block (logo / wordmark + blurb + social icons), a SHOP
 * column (All Products + collections), a HELP column (Contact / Shipping /
 * Returns), and a bottom bar with the copyright, payment badges, and
 * "Powered by NUMU". NOT the dark-navy newsletter footer it inherited from
 * the Bazar clone.
 *
 * Socials read from `store.social_links`; columns can be overridden via
 * `column` blocks (fallback to Shop / Help).
 *
 * Settings: brand_name, footer_text, marquee_text.
 */
export default function EmpFooter({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const { collections } = useCollections();
  const themeSettings = useThemeSettings();
  const locale = useLocale();

  const brandName =
    asString(s.brand_name) ||
    asString(themeSettings.global_settings?.brand_name) ||
    shop?.name ||
    "NUMU";

  const logoUrl =
    asImageUrl(s.logo_url) ||
    asImageUrl(themeSettings.global_settings?.logo_url) ||
    shop?.logo_url ||
    "";

  const footerText =
    asString(s.footer_text) ||
    localized(
      locale,
      "Handpicked essentials, made in Egypt. Bold design, honest prices.",
      "أساسيات مختارة بعناية، صناعة مصرية. تصميم جريء وأسعار صادقة.",
    );
  const marqueeText = asString(s.marquee_text) || localized(locale, "100% INDEPENDENT", "100% مستقل");

  // Socials from the live store.
  const socialEntries = Object.entries(
    (shop?.social_links as Record<string, string> | undefined) ?? {},
  )
    .map(([name, url]) => ({ name, url: asString(url) }))
    .filter(({ url }) => Boolean(url));
  const socialOrder = ["instagram", "twitter", "x", "facebook"];
  const socials = socialEntries.sort(
    (a, b) => socialOrder.indexOf(a.name.toLowerCase()) - socialOrder.indexOf(b.name.toLowerCase()),
  );

  // Optional override columns from `column` blocks.
  const overrideColumns: FooterColumn[] = readBlocks(instance, "column")
    .map((r) => {
      const links: FooterLink[] = [];
      for (let i = 1; i <= 5; i++) {
        const label = asString(r[`link${i}_label`]);
        const href = asString(r[`link${i}_href`]);
        if (label && href) links.push({ label, href });
      }
      return { title: asString(r.title), links };
    })
    .filter((c) => c.title && c.links.length > 0);

  const ICONS: Record<string, JSX.Element> = {
    instagram: <InstagramIcon />,
    twitter: <XIcon />,
    x: <XIcon />,
    facebook: <FacebookIcon />,
  };

  const formatSocialHref = (name: string, url: string) =>
    name.toLowerCase() === "whatsapp" ? `https://wa.me/${url.replace(/\D/g, "")}` : url;

  return (
    <footer className="bg-black text-white" data-emp-section={sectionId}>
      {/* Pre-footer marquee */}
      <div className="overflow-hidden py-4 border-b border-white/10">
        <div className="flex whitespace-nowrap animate-[emp-ticker_30s_linear_infinite]">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="flex items-center gap-5 mx-5">
              <span className="text-white font-black text-xl md:text-2xl uppercase tracking-wide">
                {marqueeText}
              </span>
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-6 object-contain opacity-60" />
              ) : (
                <span className="text-white/40 font-black text-xl">&#9679;</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Columns */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-14 object-contain mb-4" />
            ) : (
              <h3 className="text-white font-black text-2xl mb-4 uppercase tracking-wide">
                <InlineEditable sectionId={sectionId} settingKey="brand_name" value={brandName} />
              </h3>
            )}
            <p className="text-[13px] text-white/50 leading-relaxed mb-6">
              <InlineEditable sectionId={sectionId} settingKey="footer_text" value={footerText} multiline />
            </p>
            <div className="flex items-center gap-4">
              {socials.length > 0 ? (
                socials.map((soc) => (
                  <a
                    key={soc.name}
                    href={formatSocialHref(soc.name, soc.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-white transition-colors"
                    aria-label={soc.name}
                  >
                    {ICONS[soc.name.toLowerCase()] ?? <InstagramIcon />}
                  </a>
                ))
              ) : (
                <>
                  <span className="text-white/30"><InstagramIcon /></span>
                  <span className="text-white/30"><XIcon /></span>
                  <span className="text-white/30"><FacebookIcon /></span>
                </>
              )}
            </div>
          </div>

          {/* Shop / Help columns (override blocks win) */}
          {overrideColumns.length > 0 ? (
            overrideColumns.map((col) => (
              <div key={col.title}>
                <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60 mb-5">{col.title}</h4>
                <div className="space-y-3">
                  {col.links.map((l) => (
                    <Link key={`${col.title}-${l.label}`} to={l.href} className="block text-[13px] text-white/50 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <>
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60 mb-5">
                  {localized(locale, "Shop", "تسوّق")}
                </h4>
                <div className="space-y-3">
                  <Link to="/products" className="block text-[13px] text-white/50 hover:text-white transition-colors">
                    {localized(locale, "All Products", "كل المنتجات")}
                  </Link>
                  {collections.slice(0, 5).map((cat) => (
                    <Link key={cat.id} to={`/collections/${cat.slug}`} className="block text-[13px] text-white/50 hover:text-white transition-colors">
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60 mb-5">
                  {localized(locale, "Help", "المساعدة")}
                </h4>
                <div className="space-y-3">
                  <Link to="/contact" className="block text-[13px] text-white/50 hover:text-white transition-colors">
                    {localized(locale, "Contact us", "تواصل معنا")}
                  </Link>
                  <Link to="/shipping" className="block text-[13px] text-white/50 hover:text-white transition-colors">
                    {localized(locale, "Shipping", "الشحن")}
                  </Link>
                  <Link to="/returns" className="block text-[13px] text-white/50 hover:text-white transition-colors">
                    {localized(locale, "Returns", "الإرجاع")}
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/30">
            © {new Date().getFullYear()} {brandName}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <PaymentBadge>VISA</PaymentBadge>
              <PaymentBadge>Mastercard</PaymentBadge>
              <PaymentBadge>InstaPay</PaymentBadge>
              <PaymentBadge>COD</PaymentBadge>
            </div>
            <span className="text-[11px] text-white/30">
              {localized(locale, "Powered by NUMU", "مدعوم بواسطة NUMU")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Payment badge ── */
const PaymentBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center justify-center h-7 px-3 bg-white/10 rounded text-[10px] font-bold text-white/60 uppercase tracking-wider">
    {children}
  </span>
);

/* ── Social icons (inline SVGs, ported from V2) ── */
const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
