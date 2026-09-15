/**
 * The edition picker, shared by the book page and quick look.
 *
 * Variants are picked axis by axis — Format, Paper, Condition — as rows of
 * labelled chips, the way a shopper reads "TYPE: HARDCOVER". The chips drive
 * the SDK's `useVariantSelection`, which also publishes the choice so the cart
 * line is labelled. A book whose variants carry no option axes (older data)
 * falls back to a priced edition list, so every copy stays reachable.
 *
 * ⚠ MONEY UNITS. Variant prices here are CENTS — the SDK shape, which
 * product-detail.ts normalises the raw detail route to. `product.price` is
 * MAJOR. Every variant figure goes through `centsToMajor`; product figures do
 * not.
 *
 * `useVariantSelection` seeds its state once, on mount. Mount the consumer
 * with the product already loaded (and keyed by product id), or the picker
 * starts empty and never auto-selects.
 */

import { useMemo, useState } from "react";
import { centsToMajor } from "@numueg/theme-kit";
import { Money, useVariantSelection, type Product, type ProductVariant } from "@numueg/theme-sdk";
import { asNumber, asRecord, asString, isFormatAxis } from "./shared";
import { useT, type TFunction } from "./i18n";

/** The condition line: a `condition` option axis, when the bookseller keeps one. */
export function conditionOf(variant: ProductVariant): string {
  for (const [axis, value] of Object.entries(variant.option_values ?? {})) {
    if (axis.toLowerCase().includes("condition")) return asString(value);
  }
  return "";
}

function variantLabel(variant: ProductVariant, fallback: string): string {
  const values = Object.values(variant.option_values ?? {})
    .map((x) => asString(x))
    .filter(Boolean);
  return values.join(" · ") || asString(variant.name) || fallback;
}

/** The raw figure, however the payload shipped it: a number, a string, `{ amount }`. */
function rawAmount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return asNumber(asRecord(value).amount, 0);
}

/**
 * Which unit THIS product's variants are priced in.
 *
 * The convention says variant money is cents, and the SDK's own payloads keep
 * it — but the host server-renders a product page with `"price": 460`, a MAJOR
 * number, and reading that as cents turns 520 into 5.20 on the page. Neither
 * shape is going away, and a bare number cannot say which it is.
 *
 * `product.price` can, though: it is MAJOR by definition and it is one of the
 * variant prices (the cheapest, normally). So both readings are tried and the
 * one that lands near the product's own price wins. No variants, or no product
 * price to compare against, and the documented convention stands.
 */
function variantsAreMajor(product: Product): boolean {
  const productMajor = asNumber(product.price, 0);
  const raws = (product.variants ?? []).map((v) => rawAmount(v.price)).filter((n) => n > 0);
  if (productMajor <= 0 || raws.length === 0) return false;
  const lowest = Math.min(...raws);
  return Math.abs(lowest - productMajor) <= Math.abs(lowest / 100 - productMajor);
}

/** A variant figure in MAJOR units, whichever unit the payload used. */
export function variantMajor(product: Product, value: unknown): number {
  const raw = rawAmount(value);
  return variantsAreMajor(product) ? raw : centsToMajor(raw);
}

export function useVariantPicker(product: Product) {
  const variants = product.variants ?? [];
  const options = useMemo(
    () =>
      [...(product.options ?? [])]
        .filter((option) => (option.values?.length ?? 0) > 0)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [product],
  );
  const vs = useVariantSelection(product);
  const [chosenId, setChosenId] = useState<string | null>(null);

  // Axes over a single variant row are older products that keep their choices
  // in attributes: no row matches a selection, but the selection still reaches
  // the cart line through the SDK registry, so the one variant is bought.
  const hasAxes = options.length > 0;
  const legacyAxes = hasAxes && variants.length <= 1;
  const chosen: ProductVariant | null = hasAxes
    ? legacyAxes
      ? (variants[0] ?? null)
      : vs.variant
    : (variants.find((v) => String(v.id) === chosenId) ?? variants[0] ?? null);
  const unavailableCombo = hasAxes && !legacyAxes && !chosen;

  const cv = (chosen ?? {}) as unknown as Record<string, unknown>;
  const stock = asNumber(cv.inventory_quantity, 0);
  const tracksInventory = cv.track_inventory !== false;
  const fulfillmentType = asString(cv.fulfillment_type) || "physical";
  const inStock = unavailableCombo
    ? false
    : chosen
      ? typeof cv.is_in_stock === "boolean"
        ? cv.is_in_stock
        : !tracksInventory || stock > 0
      : product.in_stock !== false;
  const maxQty = fulfillmentType === "digital" ? 1 : tracksInventory && stock > 0 ? stock : 99;

  const chosenMajor = chosen ? variantMajor(product, cv.price) : 0;
  const price = chosenMajor > 0 ? chosenMajor : asNumber(product.price, 0);
  const compareAt = chosen
    ? variantMajor(product, cv.compare_at_price)
    : asNumber(product.compare_at_price, 0);
  const currency = asString(cv.price_currency) || product.currency;

  // Picking a value that does not exist alongside the other locked axes would
  // strand the shopper on "unavailable". Jump to the edition that has it
  // instead — in stock first — so every chip leads to a buyable copy. The SDK's
  // `select` is a functional state update, so one call per axis composes.
  const pickValue = (axis: string, value: string) => {
    const next = { ...vs.selection, [axis]: value };
    const matches = (v: ProductVariant) =>
      Object.entries(next).every(([k, val]) => v.option_values?.[k] === val);
    if (legacyAxes || variants.some(matches)) {
      vs.select(axis, value);
      return;
    }
    const withValue = variants.filter((v) => v.option_values?.[axis] === value);
    const target = withValue.find((v) => v.is_in_stock !== false) ?? withValue[0];
    if (!target) {
      vs.select(axis, value);
      return;
    }
    for (const [k, val] of Object.entries(target.option_values ?? {})) vs.select(k, val);
  };

  return {
    product,
    options,
    variants,
    hasAxes,
    chosen,
    unavailableCombo,
    selection: vs.selection,
    availability: vs.availability,
    pickValue,
    chooseVariant: setChosenId,
    optionValues: hasAxes ? vs.selection : chosen?.option_values,
    sku: asString(cv.sku),
    stock,
    tracksInventory,
    inStock,
    maxQty,
    fulfillmentType,
    price,
    compareAt,
    currency,
  };
}

export type VariantPicker = ReturnType<typeof useVariantPicker>;

export function buyLabel(picker: VariantPicker, t: TFunction, added: boolean, busy: boolean): string {
  if (picker.unavailableCombo) return t("product.unavailable_combo", "This combination is unavailable");
  if (!picker.inStock) return t("product.out_of_stock", "Currently unavailable");
  if (added) return t("product.added", "Added to cart");
  if (busy) return t("product.adding", "Adding...");
  return t("product.add_to_cart", "Add to Cart");
}

export function PriceLine({ picker }: { picker: VariantPicker }) {
  return (
    <p className="pw-pdp-price">
      {picker.compareAt > picker.price && (
        <s>
          <Money amount={picker.compareAt} currency={picker.currency} />
        </s>
      )}
      <b>
        <Money amount={picker.price} currency={picker.currency} />
      </b>
    </p>
  );
}

/**
 * The cheapest edition carrying this value alongside the other axes as picked —
 * or, when that combination does not exist, any edition carrying it. That is
 * the price a click on the chip would land on.
 */
function priceForValue(picker: VariantPicker, axis: string, value: string): number {
  const withValue = picker.variants.filter((v) => v.option_values?.[axis] === value);
  const others = Object.entries(picker.selection).filter(([name]) => name !== axis);
  const exact = withValue.filter((v) => others.every(([name, picked]) => v.option_values?.[name] === picked));
  const list = exact.length > 0 ? exact : withValue;
  return list.length > 0 ? Math.min(...list.map((v) => variantMajor(picker.product, v.price))) : 0;
}

export function OptionChips({ picker }: { picker: VariantPicker }) {
  const t = useT();
  if (!picker.hasAxes) return null;
  return (
    <div className="pw-options">
      {picker.options.map((option) => {
        const picked = picker.selection[option.name];
        const available = picker.availability[option.name];
        const prices = option.values.map((value) => priceForValue(picker, option.name, value));
        const priced = new Set(prices.filter((p) => p > 0)).size > 1;
        return (
          <fieldset className="pw-option" key={option.name}>
            <legend>
              {isFormatAxis(option.name) ? t("product.edition", "Edition") : option.name}
              {picked && <span>: {picked}</span>}
            </legend>
            <div className={priced ? "pw-chips priced" : "pw-chips"}>
              {option.values.map((value, i) => {
                const soldOut = available ? !available.has(value) : false;
                return (
                  <button
                    key={value}
                    type="button"
                    className="pw-chip"
                    aria-pressed={picked === value}
                    aria-label={soldOut ? `${value} — ${t("product.sold_out", "unavailable")}` : undefined}
                    data-sold-out={soldOut || undefined}
                    onClick={() => picker.pickValue(option.name, value)}
                  >
                    <span className="v">{value}</span>
                    {priced && prices[i] > 0 && (
                      <span className="p">
                        <Money amount={prices[i]} currency={picker.currency} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

export function EditionList({ picker, productName }: { picker: VariantPicker; productName: string }) {
  const t = useT();
  if (picker.hasAxes || picker.variants.length <= 1) return null;
  return (
    <div className="pw-editions" role="radiogroup" aria-label={t("product.choose_edition", "Choose an edition")}>
      {picker.variants.map((variant) => {
        const isChosen = picker.chosen ? String(variant.id) === String(picker.chosen.id) : false;
        const available =
          variant.track_inventory === false || asNumber(variant.inventory_quantity, 0) > 0;
        const compare = variantMajor(picker.product, variant.compare_at_price);
        return (
          <button
            key={String(variant.id)}
            type="button"
            role="radio"
            className="pw-edition"
            aria-checked={isChosen}
            disabled={!available}
            onClick={() => picker.chooseVariant(String(variant.id))}
          >
            <span className="pw-dot" aria-hidden="true" />
            <span>
              {variantLabel(variant, productName)}
              <small>
                {variant.fulfillment_type === "digital"
                  ? t("product.digital_copy", "Digital copy")
                  : conditionOf(variant)}
              </small>
            </span>
            <span className="amt">
              <Money amount={variantMajor(picker.product, variant.price)} currency={picker.currency} />
              {compare > 0 && (
                <s>
                  <Money amount={compare} currency={picker.currency} />
                </s>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function QtyStepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const t = useT();
  return (
    <div className="pw-qty">
      <button
        type="button"
        aria-label={t("product.decrease", "Decrease quantity")}
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button
        type="button"
        aria-label={t("product.increase", "Increase quantity")}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}
