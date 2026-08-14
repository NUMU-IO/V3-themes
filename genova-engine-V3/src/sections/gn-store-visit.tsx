/**
 * ✦ gn-store-visit — Genova's signature retail section.
 *
 * A physical shop in Mansoura is proof the brand is real, which matters more in
 * this market than any trust badge: it is the difference between "an Instagram
 * page" and "a business you can walk into". So it gets an image, an address in
 * both languages, hours, directions and a phone number — not a footer line.
 *
 * Renders nothing until an address exists; a "visit us" block with no address is
 * worse than no block.
 */

import { asBool, asImageAlt, asImageUrl, asString } from "@numueg/theme-kit";
import { Image, useDirection, useShop } from "@numueg/theme-sdk";
import { type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { IconWhatsApp } from "../lib/icons";

export default function GnStoreVisit({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const direction = useDirection();
  const shop = useShop();

  // Address is authored per language; fall back to whichever exists so a store
  // that filled in only one still renders.
  const addressAr = asString(s.address_ar);
  const addressEn = asString(s.address);
  const address = direction === "rtl" ? addressAr || addressEn : addressEn || addressAr;

  if (!address) return null;

  const image = asImageUrl(s.image);
  const mapLink = asString(s.map_link);
  const phone = asString(s.phone);
  const whatsapp = asString(s.whatsapp);


  return (
    // ClothingStore microdata on the visible address — a real, verifiable
    // entity is the strongest local + AI-search signal this theme can emit,
    // and annotating the rendered text keeps it honest.
    <section
      className="gn-storevisit"
      itemScope
      itemType="https://schema.org/ClothingStore"
    >
      <meta itemProp="name" content={shop?.name ?? "Genova"} />
      <div className="gn-container gn-storevisit-inner">
        {image && (
          <span className="gn-plate gn-storevisit-image">
            <Image
              src={image}
              alt={asImageAlt(s.image, asString(s.heading))}
              sizes="(min-width: 1024px) 50vw, 100vw"
              loading="lazy"
            />
          </span>
        )}

        <div className="gn-storevisit-copy">
          <h2 className="gn-section-heading">
            {asString(s.heading) || t("store.heading", "Come and try them on")}
          </h2>

          <address className="gn-storevisit-address" itemProp="address">
            {address}
          </address>

          {asString(s.hours) && (
            <p className="gn-storevisit-hours">
              <span className="gn-label">{t("store.hours", "Hours")}</span>
              {asString(s.hours)}
            </p>
          )}

          <div className="gn-storevisit-actions">
            {asBool(s.show_directions_button, true) && mapLink && (
              <a
                href={mapLink}
                className="gn-btn gn-btn-outline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("store.directions", "Get directions")}
              </a>
            )}
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`}
                className="gn-btn gn-btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconWhatsApp size={18} />
                {t("store.whatsapp", "Message the shop")}
              </a>
            )}
          </div>

          {phone && (
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="gn-footer-link" itemProp="telephone">
              {phone}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
