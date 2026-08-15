/**
 * payment-marks — the ONE sanctioned colour surface in Genova.
 *
 * Everything else in this theme is greyscale by decision D1. These are not:
 * VISA blue, Mastercard's red/orange discs, Fawry yellow, InstaPay purple and
 * Apple Pay black are third-party trust marks. Recolouring them to fit the
 * palette makes them unrecognisable, and an unrecognisable payment mark reads
 * as a broken checkout rather than as good taste.
 *
 * The list is derived from the gateways the store's checkout ACTUALLY offers
 * (`/api/storefront/checkout-config`), never hardcoded — a trust row that
 * advertises Apple Pay on a store that only takes cash on delivery is worse
 * than no trust row. On any miss it renders nothing.
 *
 * Word marks are SVG <text> on an always-available system stack so they render
 * identically everywhere without shipping a font.
 */

import { useEffect, useState } from "react";

/** Gateway code → the marks a shopper actually recognises. */
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
  meeza: ["Meeza"],
  applepay: ["Apple Pay"],
  apple_pay: ["Apple Pay"],
};

/**
 * Marks for the gateways this store has enabled. `null` until resolved and on
 * any failure, so the caller can render nothing rather than a guess.
 */
export function useEnabledPaymentMarks(): string[] | null {
  const [marks, setMarks] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/storefront/checkout-config", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        const data = json?.data ?? json;
        if (!data) return;
        const codes: string[] = (data.payment_methods ?? [])
          .map((m: { code?: string }) => (m.code || "").toLowerCase())
          .filter(Boolean);
        if (data.cod && !codes.includes("cod")) codes.push("cod");

        const out: string[] = [];
        for (const code of codes) {
          for (const mark of GATEWAY_MARKS[code] ?? []) {
            if (!out.includes(mark)) out.push(mark);
          }
        }
        setMarks(out);
      })
      .catch(() => {
        if (!cancelled) setMarks(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return marks;
}

const SANS = "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";

function Badge({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="gn-pay-mark" role="img" aria-label={label}>
      {children}
    </span>
  );
}

function WordMark({
  label,
  bg,
  fg,
  size = 10,
  weight = 700,
  italic = false,
  letterSpacing = 0,
}: {
  label: string;
  bg: string;
  fg: string;
  size?: number;
  weight?: number;
  italic?: boolean;
  letterSpacing?: number;
}) {
  return (
    <Badge label={label}>
      <svg width="42" height="26" viewBox="0 0 42 26" aria-hidden="true" focusable="false">
        <rect width="42" height="26" rx="3" fill={bg} />
        <text
          x="21"
          y="17"
          textAnchor="middle"
          fill={fg}
          fontFamily={SANS}
          fontSize={size}
          fontWeight={weight}
          fontStyle={italic ? "italic" : undefined}
          letterSpacing={letterSpacing}
        >
          {label}
        </text>
      </svg>
    </Badge>
  );
}

function MarkFor({ name }: { name: string }) {
  switch (name) {
    case "Visa":
      return <WordMark label="VISA" bg="#1A1F71" fg="#FFFFFF" size={11} italic letterSpacing={0.5} />;
    case "Mastercard":
      return (
        <Badge label="Mastercard">
          <svg width="42" height="26" viewBox="0 0 42 26" aria-hidden="true" focusable="false">
            <rect width="42" height="26" rx="3" fill="#FFFFFF" stroke="#E2E0DC" />
            <circle cx="17" cy="13" r="7" fill="#EB001B" />
            <circle cx="25" cy="13" r="7" fill="#F79E1B" />
            {/* The overlap is the mark — without it these are just two dots. */}
            <path d="M21 7.6a7 7 0 0 0 0 10.8 7 7 0 0 0 0-10.8Z" fill="#FF5F00" />
          </svg>
        </Badge>
      );
    case "Fawry":
      return <WordMark label="fawry" bg="#FFC300" fg="#00539B" size={11} />;
    case "InstaPay":
      return <WordMark label="InstaPay" bg="#5B2D8E" fg="#FFFFFF" size={8} />;
    case "Meeza":
      return <WordMark label="meeza" bg="#00A651" fg="#FFFFFF" size={10} />;
    case "Vodafone Cash":
      return <WordMark label="vodafone" bg="#E60000" fg="#FFFFFF" size={7.5} />;
    case "Apple Pay":
      return <WordMark label=" Pay" bg="#000000" fg="#FFFFFF" size={11} />;
    case "COD":
      return <WordMark label="COD" bg="#141414" fg="#FFFFFF" size={9} letterSpacing={0.4} />;
    default:
      return <WordMark label={name} bg="#FFFFFF" fg="#141414" size={7} weight={600} />;
  }
}

/**
 * Renders the enabled payment marks, or nothing. Never renders a placeholder:
 * an empty trust row is honest, a fabricated one is not.
 */
export function PaymentMarks() {
  const marks = useEnabledPaymentMarks();
  if (!marks || marks.length === 0) return null;
  return (
    <div className="gn-pay-marks">
      {marks.map((m) => (
        <MarkFor key={m} name={m} />
      ))}
    </div>
  );
}
