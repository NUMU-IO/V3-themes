import { createContext, useContext, useEffect, useState } from "react";
// Shared guards from @numueg/theme-kit (import+re-export: local binding + public export).
import { asArray, asImageAlt, asImageUrl, asNumber, asString, localized } from "@numueg/theme-kit";
export { asArray, asImageAlt, asImageUrl, asNumber, asString, localized };

import type { SectionInstance } from "@numueg/theme-sdk";

export interface SectionRenderProps {
  instance: SectionInstance;
  sectionId: string;
}




/** ENG-3: pick the locale-appropriate default. Merchant-entered values still
 *  win because callers do `asString(s.x) || localized(locale, en, ar)`. */

// ── Non-destructive image transform (focal / zoom / rotation) ────────────────
// Now provided by the SDK (@numueg/theme-sdk >= 0.11.0) instead of a local
// copy that had to be hand-synced with the merchant-hub editor and 13 other
// themes. Re-exported from here so every section keeps importing it from
// "./_shared" unchanged. The SDK build is pinned against the previous local
// implementation by a parity suite, so this swap is render-identical.
export {
  applyImageTransform,
  asImageTransform,
  type ImageTransform,
} from "@numueg/theme-sdk";

/** True only in the marketplace "Try theme" preview (threaded from mount ctx). */
export const DemoContext = createContext<boolean>(false);
export const useDemo = (): boolean => useContext(DemoContext);

/**
 * Whether invented sample copy (reviews, offers, guarantees, category
 * taglines) may render: only in the marketplace preview or the editor canvas,
 * where it shows the merchant what to fill in. On a live store it would be
 * published in the merchant's name, so sections render nothing (or the
 * merchant's own text) instead. False on the server and first paint.
 */
export function useSampleContent(): boolean {
  const demo = useDemo();
  const [inEditor, setInEditor] = useState(false);
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("editor")) {
        setInEditor(true);
        return;
      }
    } catch {
      /* defensive */
    }
    setInEditor(window.parent !== window);
  }, []);
  return demo || inEditor;
}
