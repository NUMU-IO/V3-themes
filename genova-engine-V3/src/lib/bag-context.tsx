/**
 * Bag + quick-add contexts, extracted so the two components that need each
 * other don't import each other.
 *
 * `cart-drawer.tsx` renders `QuickAddSheet` (you must be able to add a
 * recommendation without leaving the bag), and `quick-add.tsx` calls
 * `useCartDrawer()` (a successful add should open the bag). That is a genuine
 * import cycle. ES modules would *technically* survive this one — both
 * bindings are only read at call time — but a cycle that happens to work is a
 * trap for whoever next moves a `const` to module scope and gets an undefined
 * at import time with no obvious cause.
 *
 * Holding the contexts in a leaf module both sides import removes the cycle
 * instead of relying on it being benign.
 */

import { createContext, useContext } from "react";
import type { Product } from "@numueg/theme-sdk";

export interface CartDrawerApi {
  /** Open the bag. Pass a name to show "<name> added to your bag". */
  open: (justAddedName?: string) => void;
  close: () => void;
}

/**
 * Default is a NO-OP pair, and that is load-bearing in a bad way: a provider
 * rendered without children silently routes every consumer here, producing a
 * perfectly styled bag that nothing can open. `CartDrawerProvider` therefore
 * requires `children`. See the note in main.tsx.
 */
export const CartDrawerContext = createContext<CartDrawerApi>({
  open: () => {},
  close: () => {},
});

export const useCartDrawer = (): CartDrawerApi => useContext(CartDrawerContext);

export interface QuickAddApi {
  /** Open the size picker for a product. Thin listing records are fine — the
   *  sheet hydrates the full record itself. */
  open: (product: Product) => void;
  close: () => void;
}

export const QuickAddContext = createContext<QuickAddApi>({
  open: () => {},
  close: () => {},
});

export const useQuickAddSheet = (): QuickAddApi => useContext(QuickAddContext);
