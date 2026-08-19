/**
 * tn-size-guide — the one section with no reference at all.
 *
 * The reference has a `Find my size` button on its tee page that goes nowhere
 * in the capture. This gives it a destination, which completes the design
 * rather than widening it (plan D14). `tn-product` links here only when the
 * product actually HAS a chart, so the button can never lead to an empty page.
 *
 * ## The chart is the store's, not the section's
 *
 * The platform already holds a store-wide `size_chart` (`store.settings`), and
 * the merchant hub already edits it — a per-section copy would be a second
 * place to keep the same numbers, which is a second place for them to be wrong.
 * So the table is resolved through the SDK's own `resolveSizeChart`, exactly as
 * the PDP accordion resolves it, and `row` blocks exist only as a fallback for
 * a store that has not set one.
 *
 * ## Unit conversion is real arithmetic, not a label swap
 *
 * The cm→inch toggle divides by 2.54 and rounds to one decimal. A guide that
 * relabels centimetres as inches is worse than having no toggle: it is the one
 * page a shopper consults precisely because they are unsure, and it decides
 * whether the parcel comes back.
 */

import { useMemo, useState } from "react";
import { resolveSizeChart, useResolvedSettings, useShop, type SizeChart } from "@numueg/theme-sdk";
import {
  asString,
  cx,
  readBlockNodes,
  useInsideEditor,
  waLink,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import { Accordion } from "../lib/accordion";
import { IconWhatsApp } from "../lib/icons";

const CM_PER_INCH = 2.54;

/** A number, converted and rounded — or the original string if it isn't one. */
function toInches(value: string): string {
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n === 0) return value;
  const inches = n / CM_PER_INCH;
  // One decimal: a size chart quoted to two is false precision on a garment.
  return String(Math.round(inches * 10) / 10);
}

export default function TnSizeGuide({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const shop = useShop();
  const insideEditor = useInsideEditor();

  // No product on this route, so this always resolves the STORE-wide chart —
  // the same one a product with `mode: "default"` shows on its PDP.
  const storeChart = useMemo(
    () => resolveSizeChart(undefined, shop?.settings),
    [shop?.settings],
  );

  // Fallback rows, for a store with no store-wide chart yet.
  const blockChart = useMemo<SizeChart | null>(() => {
    const headers = asString(s.chart_columns)
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    const rows = readBlockNodes(instance, "row")
      .map((node) => ({
        size: asString(node.settings.size),
        values: asString(node.settings.values)
          .split(",")
          .map((v) => v.trim()),
      }))
      .filter((r) => r.size);
    if (headers.length === 0 || rows.length === 0) return null;
    return {
      column_headers: headers,
      rows,
      unit: (asString(s.chart_unit, "cm") as SizeChart["unit"]) || "cm",
    };
  }, [instance, s.chart_columns, s.chart_unit]);

  const chart = storeChart ?? blockChart;

  const [unit, setUnit] = useState<"source" | "in">("source");
  // Converting anything but centimetres would be nonsense, so the toggle only
  // exists when there is something to convert.
  const canConvert = chart?.unit === "cm";
  const showInches = canConvert && unit === "in";

  const measures = readBlockNodes(instance, "measure")
    .map((node) => ({
      title: asString(node.settings.title),
      text: asString(node.settings.text),
    }))
    .filter((m) => m.title);

  const whatsapp = waLink(asString(s.whatsapp));

  if (!chart && measures.length === 0) {
    return insideEditor ? (
      <section className="tn-container tn-section">
        <div className="tn-editor-note">
          <p className="tn-label">{t("editor.size_note_title", "No size chart yet")}</p>
          <p className="tn-footer-text">
            {t(
              "editor.size_note",
              "This page shows your store's size chart — set it once under Settings and every product that opts in shows the same numbers. You can also type rows in here instead.",
            )}
          </p>
        </div>
      </section>
    ) : null;
  }

  return (
    <section className="tn-section tn-sizeguide">
      <div className="tn-container tn-sizeguide-inner">
        <header className="tn-plp-intro">
          <h1 className="tn-plp-title">{asString(s.heading) || t("size.heading", "Size guide")}</h1>
          {asString(s.intro) ? <p className="tn-plp-subtitle">{asString(s.intro)}</p> : null}
        </header>

        {chart && (
          <>
            {canConvert && (
              <div className="tn-unit-toggle" role="group" aria-label={t("size.units", "Units")}>
                <button
                  type="button"
                  className={cx("tn-unit-btn", !showInches && "is-active")}
                  aria-pressed={!showInches}
                  onClick={() => setUnit("source")}
                >
                  {t("size.cm", "cm")}
                </button>
                <button
                  type="button"
                  className={cx("tn-unit-btn", showInches && "is-active")}
                  aria-pressed={showInches}
                  onClick={() => setUnit("in")}
                >
                  {t("size.inches", "inches")}
                </button>
              </div>
            )}

            <div className="tn-sizetable-wrap">
              <table className="tn-sizetable tn-sizeguide-table">
                <caption className="tn-sr">
                  {asString(s.heading) || t("size.heading", "Size guide")}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{t("product.size", "Size")}</th>
                    {chart.column_headers.map((h) => (
                      <th key={h} scope="col">
                        {h}
                        {/* The unit belongs in the header, once, rather than
                            repeated in forty cells. */}
                        {` (${showInches ? t("size.in_short", "in") : chart.unit ?? ""})`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chart.rows.map((row) => (
                    <tr key={row.size}>
                      <th scope="row">{row.size}</th>
                      {row.values.map((v, i) => (
                        <td key={`${row.size}-${i}`}>{showInches ? toInches(v) : v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {chart.notes ? <p className="tn-footer-text">{chart.notes}</p> : null}
          </>
        )}

        {asString(s.model_note) ? (
          <p className="tn-footer-text tn-sizeguide-note">{asString(s.model_note)}</p>
        ) : null}

        {measures.length > 0 && (
          <div className="tn-sizeguide-measures">
            <h2 className="tn-faq-grouptitle">
              {asString(s.measure_heading) || t("size.how_to", "How to measure")}
            </h2>
            {measures.map((m, i) => (
              <Accordion key={`${m.title}-${i}`} title={m.title}>
                <p>{m.text}</p>
              </Accordion>
            ))}
          </div>
        )}

        {whatsapp && (
          <p className="tn-sizeguide-help">
            <a className="tn-btn tn-btn-outline" href={whatsapp} target="_blank" rel="noopener noreferrer">
              <IconWhatsApp size={16} />
              {asString(s.whatsapp_text) || t("size.ask", "Ask us which size to get")}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
