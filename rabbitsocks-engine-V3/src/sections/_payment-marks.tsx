"use client";
/**
 * _payment-marks — payment-method badges for the footer bottom bar (B3).
 *
 * Full-color card-style badges (like real checkout trust rows): each known
 * method renders a small rounded badge in its brand colors — VISA blue,
 * Mastercard's interlocking red/orange circles, Fawry yellow, InstaPay
 * purple, Vodafone red, Apple Pay black — instead of plain text. Entries we
 * don't recognize fall back to a neutral chip, so custom values still render.
 *
 * The list itself is merchant-editable (the footer's `payment_methods`
 * setting + `show_payment_methods` toggle); when the setting is left empty
 * the marks are derived from the gateways the checkout actually offers
 * (`useEnabledPaymentMarks` below).
 *
 * Word-style marks use SVG <text> on always-available system sans stacks so
 * they render identically everywhere.
 */
import { useEffect, useState } from "react";
import { Banknote } from "lucide-react";

/**
 * B3 phase 2 — derive the footer's payment marks from the store's ACTUALLY
 * enabled gateways (host `/api/storefront/checkout-config`), so the trust row
 * never advertises a method the checkout doesn't offer. Gateway codes map to
 * the marks a shopper recognizes (card acquirers → the card networks).
 * Returns null until loaded / on any miss — callers fall back to the setting.
 */
const GATEWAY_MARKS: Record<string, string[]> = {
  cod: ["Cash on Delivery"],
  paymob: ["Visa", "Mastercard"],
  kashier: ["Visa", "Mastercard"],
  moyasar: ["Visa", "Mastercard"],
  stripe: ["Visa", "Mastercard"],
  tap: ["Visa", "Mastercard"],
  jt: ["Visa", "Mastercard"],
  fawry: ["Fawry"],
  instapay: ["InstaPay"],
  vodafone_cash: ["Vodafone Cash"],
  bank_transfer: ["InstaPay"],
  meeza: ["Meeza"],
  applepay: ["Apple Pay"],
  apple_pay: ["Apple Pay"],
};

export function useEnabledPaymentMarks(): string[] | null {
  const [marks, setMarks] = useState<string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/storefront/checkout-config", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.data) return;
        const codes: string[] = (j.data.payment_methods ?? [])
          .map((m: { code?: string }) => (m.code || "").toLowerCase())
          .filter(Boolean);
        if (j.data.cod && !codes.includes("cod")) codes.push("cod");
        const out: string[] = [];
        for (const c of codes) {
          for (const mark of GATEWAY_MARKS[c] ?? []) {
            if (!out.includes(mark)) out.push(mark);
          }
        }
        if (out.length > 0) setMarks(out);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return marks;
}

/** Normalize a merchant-entered method name to a mark key. */
function keyFor(raw: string): string {
  const k = raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (k.includes("visa")) return "visa";
  if (k.includes("master")) return "mastercard";
  if (k.includes("amex") || k.includes("americanexpress")) return "amex";
  if (k.includes("meeza") || k.includes("ميزة")) return "meeza";
  if (k.includes("fawry") || k.includes("فوري")) return "fawry";
  if (k.includes("instapay") || k.includes("انستاباي")) return "instapay";
  if (k.includes("vodafone") || k.includes("فودافون")) return "vodafonecash";
  if (k.includes("applepay") || k.includes("apple")) return "applepay";
  if (k === "cod" || k.includes("cashondelivery") || k.includes("عنداستلام") || k.includes("كاش"))
    return "cod";
  return "";
}

const SANS = "Helvetica, Arial, system-ui, sans-serif";

/** Word-style mark rendered as SVG text — crisp at badge size. */
function Word({ text, fill, italic = false, weight = 800, size = 10, w = 40 }: {
  text: string; fill: string; italic?: boolean; weight?: number; size?: number; w?: number;
}) {
  return (
    <svg viewBox={`0 0 ${w} 14`} className="h-3.5 w-auto" aria-hidden="true">
      <text
        x={w / 2}
        y="11"
        textAnchor="middle"
        fontFamily={SANS}
        fontSize={size}
        fontWeight={weight}
        fontStyle={italic ? "italic" : "normal"}
        letterSpacing={0.4}
        fill={fill}
      >
        {text}
      </text>
    </svg>
  );
}

/** Apple mark (simple-icons path, CC0) for the Apple Pay badge. */
function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true" fill="#ffffff">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.03 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702" />
    </svg>
  );
}

/** One badge: brand background + mark. */
function Badge({ bg, ring = "ring-black/10", children, wide = false }: {
  bg: string; ring?: string; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-7 ${wide ? "px-2" : "min-w-[46px] px-1.5"} items-center justify-center gap-1 rounded-md shadow-sm ring-1 ${ring}`}
      style={{ backgroundColor: bg }}
    >
      {children}
    </span>
  );
}

function markFor(key: string, label: string, isAr: boolean) {
  switch (key) {
    case "visa":
      return (
        <Badge bg="#1434CB">
          <Word text="VISA" fill="#ffffff" italic weight={800} size={10} w={34} />
        </Badge>
      );
    case "mastercard":
      return (
        <Badge bg="#1b1b1b">
          <svg viewBox="0 0 30 19" className="h-4 w-auto" aria-hidden="true">
            <circle cx="12" cy="9.5" r="8" fill="#EB001B" />
            <circle cx="19" cy="9.5" r="8" fill="#F79E1B" fillOpacity="0.95" />
            <path d="M15.5 3.3a8 8 0 010 12.4 8 8 0 010-12.4z" fill="#FF5F00" />
          </svg>
        </Badge>
      );
    case "amex":
      return (
        <Badge bg="#2E77BC">
          <Word text="AMEX" fill="#ffffff" weight={800} size={9} w={36} />
        </Badge>
      );
    case "applepay":
      return (
        <Badge bg="#000000" ring="ring-white/20">
          <AppleGlyph />
          <Word text="Pay" fill="#ffffff" weight={600} size={10} w={24} />
        </Badge>
      );
    case "fawry":
      return (
        <Badge bg="#FEDD00">
          <Word text="fawry" fill="#0064B4" italic weight={800} size={10} w={36} />
        </Badge>
      );
    case "instapay":
      return (
        <Badge bg="#ffffff" wide>
          <Word text="InstaPay" fill="#63297B" italic weight={800} size={10} w={48} />
        </Badge>
      );
    case "vodafonecash":
      return (
        <Badge bg="#E60000" wide>
          <Word text={isAr ? "فودافون كاش" : "Vodafone Cash"} fill="#ffffff" weight={700} size={8.5} w={72} />
        </Badge>
      );
    case "meeza":
      return (
        <Badge bg="#ffffff">
          <Word text="meeza" fill="#00A88E" weight={800} size={10} w={40} />
        </Badge>
      );
    case "cod":
      return (
        <Badge bg="#2f3a34" ring="ring-white/15" wide>
          <Banknote size={13} color="#8fd6a8" aria-hidden="true" />
          <span className="text-[9px] font-semibold leading-none text-white">
            {isAr ? "الدفع عند الاستلام" : "Cash on Delivery"}
          </span>
        </Badge>
      );
    default:
      return (
        <Badge bg="#3a3a3a" ring="ring-white/15" wide>
          <span className="text-[9px] font-medium leading-none text-white/90">{label}</span>
        </Badge>
      );
  }
}

/**
 * One payment-method badge. `name` is the raw merchant-entered value from the
 * `payment_methods` setting; `isAr` localizes the COD/Vodafone labels.
 */
export function PaymentMark({ name, isAr }: { name: string; isAr: boolean }) {
  return (
    <span role="img" aria-label={name} title={name} className="inline-flex">
      {markFor(keyFor(name), name, isAr)}
    </span>
  );
}
