/**
 * Teen translation lookup.
 *
 * WHY THIS EXISTS — the host does not ship theme translations.
 * `ByotThemeBoundary` builds the mount context with `themeSettings`,
 * `storeData`, `page` and `locale`, but never `translations`. The SDK's
 * `useTranslation()` reads exactly that field, so in practice `t(key, fallback)`
 * always returns the fallback and every theme's `locales/*.json` is inert at
 * runtime. The plugin *does* emit them into `dist/manifest.json`, which is
 * exactly why they look wired when they are not — measured on Genova: rendering
 * the home template under `locale: "ar"` produced byte-identical English
 * output to `locale: "en"`.
 *
 * So the theme resolves its own bundle. Static imports, not a fetch, so this
 * works unchanged inside the SSR worker. Precedence:
 *
 *   1. a host-supplied translation, if the host ever starts sending them,
 *   2. this theme's locale file for the active locale (English fills any gap —
 *      `pickTranslations` does that),
 *   3. the inline fallback at the call site.
 *
 * ⚠ ALWAYS pass a real fallback string. The SDK's `t` is
 * `translations[key] || fallback || key`, so an EMPTY fallback renders the raw
 * key — `footer.newsletter_title` shipped to a shopper. This behaves the same
 * way by design, to stay a drop-in replacement.
 */

import { useCallback, useMemo } from "react";
import { buildLocaleBundle, pickTranslations, useLocale, useTranslation } from "@numueg/theme-sdk";
import en from "../../locales/en.json";
import ar from "../../locales/ar.json";

const BUNDLE = buildLocaleBundle({
  "./locales/en.json": en as Record<string, unknown>,
  "./locales/ar.json": ar as Record<string, unknown>,
});

export type TFunction = (key: string, fallback: string) => string;

export function useT(): TFunction {
  const locale = useLocale();
  const { t: hostT } = useTranslation();
  const messages = useMemo(() => pickTranslations(BUNDLE, locale), [locale]);

  return useCallback<TFunction>(
    (key, fallback) => {
      // The SDK returns the KEY on a miss, so "not the key" is the only way to
      // tell a real host translation from a miss.
      const hosted = hostT(key, "");
      if (hosted && hosted !== key) return hosted;
      return messages[key] || fallback;
    },
    [hostT, messages],
  );
}
