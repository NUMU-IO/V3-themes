"use client";

import { useMemo, useState } from "react";
import {
  Link,
  Money,
  useProducts,
  useResolvedSettings,
  useThemeSettings,
} from "@numueg/theme-sdk";
import type { Product } from "@numueg/theme-sdk";
import { ArrowUpRight } from "lucide-react";
import { asArray, asRecord, asString, demoOrPlaceholder, PLACEHOLDER_IMG, productHref, resolveBlocks, useBlockResolveContext, useDemo, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";

interface MenuTab {
  id: string;
  label: string;
  /** Optional tag/category filter; matches Product.tags or Product.category */
  match?: string;
}

const DEFAULT_TABS: MenuTab[] = [
  { id: "all", label: "All" },
  { id: "coffee", label: "Coffee", match: "coffee" },
  { id: "latte", label: "Latte", match: "latte" },
  { id: "iced", label: "Iced", match: "iced" },
  { id: "juice", label: "Juice", match: "juice" },
  { id: "dessert", label: "Desserts", match: "dessert" },
];

interface FallbackItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  badge?: string;
  tag: string;
}

// Prices are major units (EGP). Real products use <Money>, fallbacks
// use the formatter at the bottom of this file.
const FALLBACK_ITEMS: FallbackItem[] = [
  {
    id: "espresso",
    name: "Espresso",
    description: "Double shot of our seasonal blend. Dense and clean.",
    price: 45,
    image: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=900&q=70",
    badge: "Signature",
    tag: "coffee",
  },
  {
    id: "vanilla-latte",
    name: "Vanilla Latte",
    description: "Espresso, steamed milk and a slow swirl of vanilla syrup.",
    price: 85,
    image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=900&q=70",
    badge: "Popular",
    tag: "latte",
  },
  {
    id: "iced-mocha",
    name: "Iced Mocha",
    description: "Cold brew, dark chocolate, milk and a crown of cream.",
    price: 95,
    image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=70",
    tag: "iced",
  },
  {
    id: "mango-juice",
    name: "Fresh Mango",
    description: "Cold-pressed Egyptian mango. Nothing added.",
    price: 70,
    image: "https://images.unsplash.com/photo-1605191568878-8efe22b526ee?auto=format&fit=crop&w=900&q=70",
    tag: "juice",
  },
  {
    id: "basbousa",
    name: "Basbousa",
    description: "Semolina cake soaked in citrus syrup. House recipe.",
    price: 55,
    image: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=900&q=70",
    tag: "dessert",
  },
  {
    id: "flat-white",
    name: "Flat White",
    description: "Velvet microfoam over a double ristretto.",
    price: 80,
    image: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=900&q=70",
    tag: "coffee",
  },
  {
    id: "caramel-frappe",
    name: "Caramel Frappé",
    description: "Blended ice, espresso, caramel and milk.",
    price: 90,
    image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=900&q=70",
    badge: "New",
    tag: "iced",
  },
  {
    id: "brownie",
    name: "Walnut Brownie",
    description: "Fudgy, dense, with a slow caramel finish.",
    price: 65,
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=70",
    tag: "dessert",
  },
];

interface DisplayItem {
  key: string;
  href: string;
  name: string;
  description: string;
  badge?: string;
  image: string;
  price: number;
  currency?: string;
  tag: string;
  isFallback: boolean;
}

function productToDisplay(p: Product): DisplayItem {
  const variant = p.variants?.[0];
  return {
    key: p.id,
    href: productHref(p.slug || p.id),
    name: p.name,
    description: p.description ?? "",
    // Real products keep their name + price always; an imageless product
    // gets the neutral placeholder glyph (never blanked, never dropped).
    image: p.images?.[0]?.url || PLACEHOLDER_IMG,
    price: variant?.price ?? p.price ?? 0,
    currency: p.currency,
    tag:
      (p.tags?.find((t) => typeof t === "string") as string) ||
      p.category ||
      "all",
    isFallback: false,
  };
}

function fallbackToDisplay(f: FallbackItem, currency: string): DisplayItem {
  return {
    key: f.id,
    href: `/products/${f.id}`,
    name: f.name,
    description: f.description,
    badge: f.badge,
    image: f.image,
    price: f.price,
    currency,
    tag: f.tag,
    isFallback: true,
  };
}

export default function ByMenu({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const themeSettings = useThemeSettings();
  const { products } = useProducts();

  const eyebrow = asString(s.eyebrow) || "drinks & treats";
  const title = asString(s.title) || "Our menu";
  const subtitle =
    asString(s.subtitle) ||
    "From the first espresso of the morning to the last slice of basbousa — every item is made in-house, every day.";
  const viewAllLabel = asString(s.view_all_label) || "Browse the full menu";
  const viewAllHref = asString(s.view_all_link) || "/products";
  const cardCtaLabel = asString(s.card_cta_label) || "Order";
  const emptyText =
    asString(s.empty_category_text) || "No items in this category yet.";
  const fallbackCurrency =
    (themeSettings.global_settings?.currency as string) || "EGP";

  const blkCtx = useBlockResolveContext();
  const configuredTabs: MenuTab[] = resolveBlocks(instance, "tab", blkCtx)
    .map((r) => {
      const label = asString(r.label);
      return {
        id: asString(r.id) || label.toLowerCase(),
        label,
        match: asString(r.match) || undefined,
      };
    })
    .filter((t) => t.label);

  const tabs = configuredTabs.length > 0 ? configuredTabs : DEFAULT_TABS;
  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id ?? "all");

  const demo = useDemo();
  const items: DisplayItem[] = useMemo(() => {
    // Keep EVERY real product: an imageless one now carries the neutral
    // placeholder (see productToDisplay), so it is no longer dropped — which
    // previously emptied realItems and leaked the FALLBACK_ITEMS coffee cards.
    const realItems = products.map(productToDisplay);
    if (realItems.length > 0) return realItems;
    return demoOrPlaceholder(demo, FALLBACK_ITEMS).map((f) =>
      fallbackToDisplay(f, fallbackCurrency),
    );
  }, [products, fallbackCurrency, demo]);

  const activeMatch = tabs.find((t) => t.id === activeTab)?.match;
  const filtered = activeMatch
    ? items.filter((it) =>
        it.tag?.toLowerCase().includes(activeMatch.toLowerCase()),
      )
    : items;

  const shown = filtered.length > 0 ? filtered : items;

  return (
    <section
      className="by-menu"
      data-by-section={sectionId}
      aria-label={title}
    >
      <div className="by-shell">
        <div className="by-menu-head">
          <span className="by-eyebrow">
            <InlineEditable
              sectionId={sectionId}
              settingKey="eyebrow"
              value={eyebrow}
            />
          </span>
          <h2>
            <InlineEditable
              sectionId={sectionId}
              settingKey="title"
              value={title}
            />
          </h2>
          <p>
            <InlineEditable
              sectionId={sectionId}
              settingKey="subtitle"
              value={subtitle}
              multiline
            />
          </p>

          <div className="by-menu-tabs" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={t.id === activeTab}
                className={`by-menu-tab ${t.id === activeTab ? "is-active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="by-empty">{emptyText}</p>
        ) : (
          <div className="by-menu-grid">
            {/* Do not truncate the merchant's real catalog at 12; the demo
                fallback array is only 8 items, so a 60 cap leaves it intact
                while showing every real product the merchant created. */}
            {shown.slice(0, 60).map((it) => (
              <Link
                key={it.key}
                to={it.href}
                className="by-product-card"
                aria-label={it.name}
              >
                <div className="by-product-card-image">
                  {it.badge && (
                    <span className="by-product-card-badge">{it.badge}</span>
                  )}
                  <img
                    src={it.image}
                    alt={it.name}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="by-product-card-body">
                  <h3 className="by-product-card-name">{it.name}</h3>
                  {it.description && (
                    <p className="by-product-card-desc">{it.description}</p>
                  )}
                  <div className="by-product-card-foot">
                    <span className="by-product-card-price">
                      {it.isFallback ? (
                        formatFallbackPrice(it.price, it.currency)
                      ) : (
                        <Money amount={it.price} currency={it.currency} />
                      )}
                    </span>
                    <span className="by-product-card-cta">{cardCtaLabel}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
          <Link to={viewAllHref} className="by-btn by-btn-ghost">
            <InlineEditable
              sectionId={sectionId}
              settingKey="view_all_label"
              value={viewAllLabel}
            />
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function formatFallbackPrice(amount: number, currency?: string): string {
  const value = amount.toLocaleString("en-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${value} ${currency ?? "EGP"}`;
}
