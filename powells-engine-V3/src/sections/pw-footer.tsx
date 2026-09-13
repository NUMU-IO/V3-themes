/**
 * pw-footer — the shop's name and a line about itself, link columns, and the
 * copyright row. Compact on purpose: it closes the page, it does not compete
 * with it.
 *
 * Columns are nested blocks (`column → link`), which is why this reads them
 * with `readBlockNodes` rather than theme-kit's flat `readBlocks`: the latter
 * hands back only a settings bag and cannot recurse. A column with no links is
 * not rendered — an empty "SHOP" heading is a promise with nothing behind it.
 *
 * Global chrome, so it renders on data-less routes. It reads nothing from
 * `page.data`.
 */

import { useEffect, useState } from "react";
import { Link, useResolvedSettings, useShop } from "@numueg/theme-sdk";
import { asString, readBlockNodes, useOrnaments, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { BookStack } from "../lib/ornaments";

export default function PwFooter({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const shop = useShop();
  const ornaments = useOrnaments();

  const storeName = asString(s.brand_name) || shop?.name || "";
  const about = asString(s.about);
  const note = asString(s.hand_note);

  const columns = readBlockNodes(instance, "column")
    .map((column) => ({
      title: asString(column.settings.title),
      links: readBlockNodes(column, "link")
        .map((l) => ({ label: asString(l.settings.label), href: asString(l.settings.link) || "/" }))
        .filter((l) => l.label),
    }))
    .filter((column) => column.links.length > 0);

  /**
   * The year is read AFTER mount, not during render.
   *
   * `new Date()` on the server and on the client are two different clocks in
   * two different time zones, and on 31 December they disagree — which is a
   * hydration mismatch on the one night of the year nobody is watching. The
   * first paint ships the copyright line without a year and fills it in.
   */
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => setYear(new Date().getFullYear()), []);

  return (
    <footer className="pw-footer">
      <div className="pw-footer-inner">
        <div className="pw-footer-brand">
          <h3 className="pw-footer-name">{storeName}</h3>
          {about && <p>{about}</p>}
          {ornaments && note && (
            <p className="pw-footer-note">
              <span aria-hidden="true">
                <BookStack size={30} />
              </span>
              <span className="pw-hand">{note.split("\n").join(" ")}</span>
            </p>
          )}
        </div>

        {columns.map((column, i) => (
          <div key={`${column.title}-${i}`}>
            {column.title && <h3>{column.title}</h3>}
            <ul>
              {column.links.map((link, j) => (
                <li key={`${link.href}-${j}`}>
                  <Link to={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="pw-footer-bottom">
        <span>
          © {year ?? ""} {storeName}. {t("footer.rights", "All rights reserved.")}
        </span>
      </div>
    </footer>
  );
}
