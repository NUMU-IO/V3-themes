/**
 * payment-marks — the footer's row of accepted payment methods.
 *
 * The list comes from the gateways the store's checkout actually offers
 * (`/api/storefront/checkout-config`), never a hardcoded set: a footer that
 * advertises Visa on a shop that only takes cash on delivery is worse than no
 * row at all. On any miss it renders nothing.
 *
 * Fawry, InstaPay and Vodafone Cash use their official logo files, served by
 * the host (the same origin as the checkout config) rather than inlined into
 * the bundle, and are never recoloured. The card networks and WE Pay are
 * drawn as brand-coloured word marks. Cash on delivery is the shop's own
 * option, not a third-party brand, so it is a plain chip in the theme's ink.
 */

import { useEffect, useState } from "react";
import { useT } from "./i18n";

/** Gateway code → the marks a shopper recognises. */
const GATEWAY_MARKS: Record<string, string[]> = {
  cod: ["COD"],
  paymob: ["Visa", "Mastercard"],
  kashier: ["Visa", "Mastercard"],
  moyasar: ["Visa", "Mastercard"],
  stripe: ["Visa", "Mastercard"],
  tap: ["Visa", "Mastercard"],
  jt: ["Visa", "Mastercard"],
  fawry: ["Fawry"],
  instapay: ["InstaPay"],
  bank_transfer: ["InstaPay"],
  vodafone_cash: ["Vodafone Cash"],
  we_pay: ["WE Pay"],
  meeza: ["Meeza"],
  applepay: ["Apple Pay"],
  apple_pay: ["Apple Pay"],
};

const LOGOS: Record<string, string> = {
  Fawry: "/fawry-logo.webp",
  InstaPay: "/instapay-logo.svg",
  "Vodafone Cash": "/vodafone-cash-logo.png",
};

function useEnabledPaymentMarks(): string[] {
  const [marks, setMarks] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/storefront/checkout-config", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const data = json?.data ?? json;
        if (cancelled || !data) return;
        const codes: string[] = (data.payment_methods ?? [])
          .map((m: { code?: string }) => (m.code || "").toLowerCase())
          .filter(Boolean);
        // `cod` is an object ({ enabled }) on current hosts, a boolean on older ones.
        if ((data.cod === true || data.cod?.enabled === true) && !codes.includes("cod")) codes.push("cod");

        const out: string[] = [];
        for (const code of codes) {
          for (const mark of GATEWAY_MARKS[code] ?? []) {
            if (!out.includes(mark)) out.push(mark);
          }
        }
        setMarks(out);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return marks;
}

const SANS = "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";

function WordMark({
  label,
  bg,
  fg,
  size = 10,
  italic = false,
}: {
  label: string;
  bg: string;
  fg: string;
  size?: number;
  italic?: boolean;
}) {
  return (
    <svg width="42" height="26" viewBox="0 0 42 26" aria-hidden="true" focusable="false">
      <rect width="42" height="26" rx="4" fill={bg} />
      <text
        x="21"
        y="17"
        textAnchor="middle"
        fill={fg}
        fontFamily={SANS}
        fontSize={size}
        fontWeight={700}
        fontStyle={italic ? "italic" : undefined}
      >
        {label}
      </text>
    </svg>
  );
}

function MarkFor({ name }: { name: string }) {
  switch (name) {
    case "Visa":
      return <WordMark label="VISA" bg="#1A1F71" fg="#FFFFFF" size={11} italic />;
    case "Mastercard":
      return (
        <svg width="42" height="26" viewBox="0 0 42 26" aria-hidden="true" focusable="false">
          <rect width="42" height="26" rx="4" fill="#FFFFFF" />
          <circle cx="17" cy="13" r="7" fill="#EB001B" />
          <circle cx="25" cy="13" r="7" fill="#F79E1B" />
          <path d="M21 7.6a7 7 0 0 0 0 10.8 7 7 0 0 0 0-10.8Z" fill="#FF5F00" />
        </svg>
      );
    case "Meeza":
      return <WordMark label="meeza" bg="#00A651" fg="#FFFFFF" />;
    case "WE Pay":
      return <WordMark label="WE Pay" bg="#5C2D91" fg="#FFFFFF" size={9} />;
    case "Apple Pay":
      return <WordMark label="Apple Pay" bg="#000000" fg="#FFFFFF" size={8} />;
    default:
      return <img src={LOGOS[name]} alt="" loading="lazy" decoding="async" />;
  }
}

/** The enabled payment marks, or nothing. Never a placeholder row. */
export function PaymentMarks() {
  const t = useT();
  const marks = useEnabledPaymentMarks();
  if (marks.length === 0) return null;
  return (
    <div className="pw-pay-marks">
      {marks.map((mark) =>
        mark === "COD" ? (
          <span key={mark} className="pw-pay-mark pw-pay-cod">
            {t("footer.cod", "Cash on delivery")}
          </span>
        ) : (
          <span key={mark} className={LOGOS[mark] ? "pw-pay-mark pw-pay-logo" : "pw-pay-mark"} role="img" aria-label={mark}>
            <MarkFor name={mark} />
          </span>
        ),
      )}
    </div>
  );
}
