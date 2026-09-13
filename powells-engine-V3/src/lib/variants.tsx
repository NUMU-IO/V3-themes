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
import { asNumber, asRecord, asString } from "./shared";
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

/** Variant money is CENTS, shipped either as a number or as `{ amount }`. */
export function variantCents(value: unknown): number {
  return typeof value === "number" ? value : asNumber(asRecord(value).amount, 0);
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

  const variantMajor = chosen ? centsToMajor(variantCents(cv.price)) : 0;
  const price = variantMajor > 0 ? variantMajor : asNumber(product.price, 0);
  const compareAt = chosen
    ? centsToMajor(variantCents(cv.compare_at_price))
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
      <b>
        <Money amount={picker.price} currency={picker.currency} />
      </b>
      {picker.compareAt > picker.price && (
        <s>
          <Money amount={picker.compareAt} currency={picker.currency} />
        </s>
      )}
    </p>
  );
}

export function OptionChips({ picker }: { picker: VariantPicker }) {
  const t = useT();
  if (!picker.hasAxes) return null;
  return (
    <div className="pw-options">
      {picker.options.map((option) => {
        const picked = picker.selection[option.name];
        const available = picker.availability[option.name];
        return (
          <fieldset className="pw-option" key={option.name}>
            <legend>
              {option.name}
              {picked && <span>: {picked}</span>}
            </legend>
            <div className="pw-chips">
              {option.values.map((value) => {
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
                    {value}
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
        const compare = variantCents(variant.compare_at_price);
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
              <Money amount={centsToMajor(variantCents(variant.price))} currency={picker.currency} />
              {compare > 0 && (
                <s>
                  <Money amount={centsToMajor(compare)} currency={picker.currency} />
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
