import { createContext, useContext } from "react";

/**
 * Marketplace-preview flag, threaded from the mount ctx (`ThemeRenderArgs.demo`)
 * by main.tsx. True ONLY in the catalog "Try theme" preview — a real installed
 * store must never show demo imagery. Mirrors the fleet's `_shared.ts`
 * DemoContext idiom (empire has its own scaffold, so it lives in lib/).
 */
export const DemoContext = createContext<boolean>(false);
export const useDemo = (): boolean => useContext(DemoContext);

/**
 * Neutral "add an image" placeholder on Empire's palette (off-white paper,
 * blue ink). Inline data-URI so the bundle ships no asset files.
 */
export const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20400%20400'%3E%3Crect%20width='400'%20height='400'%20fill='%23ECEBE8'/%3E%3Cg%20fill='none'%20stroke='%230099FF'%20stroke-width='10'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Crect%20x='110'%20y='124'%20width='180'%20height='152'%20rx='14'/%3E%3Ccircle%20cx='160'%20cy='172'%20r='18'/%3E%3Cpath%20d='M122%20258l48-48%2038%2032%2044-54%2056%2070'/%3E%3C/g%3E%3C/svg%3E";
