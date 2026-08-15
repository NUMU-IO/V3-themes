/**
 * Template / section-list normalisation.
 *
 * The engine hands a template's sections in one of two shapes and a theme has
 * to survive both: an ARRAY (what `theme.json` presets and a fresh activation
 * produce) or a MAP keyed by section id plus a separate `order` array (what the
 * V3 customizer writes once a merchant reorders anything). Reading only one
 * shape is how a theme renders perfectly from its preset and then goes blank
 * the first time someone drags a section in the editor.
 */

import type { SectionInstance } from "@numueg/theme-sdk";

export interface MaybeOrderedTemplate {
  name?: string;
  sections?: Record<string, SectionInstance> | SectionInstance[];
  order?: string[];
}

export interface ResolvedSection {
  id: string;
  instance: SectionInstance;
}

/** Normalise either shape to an ordered `[{id, instance}]` list. */
export function resolveSections(
  group: MaybeOrderedTemplate | undefined,
): ResolvedSection[] {
  if (!group) return [];
  if (Array.isArray(group.sections)) {
    return group.sections.map((instance, idx) => ({
      id: `${instance.type}-${idx}`,
      instance,
    }));
  }
  const map = (group.sections ?? {}) as Record<string, SectionInstance>;
  const order = group.order ?? Object.keys(map);
  const out: ResolvedSection[] = [];
  for (const id of order) {
    const instance = map[id];
    if (instance) out.push({ id, instance });
  }
  return out;
}

/**
 * Choose which section list to render for the current template.
 *
 * Prefers the merchant's saved customization, but falls back to the theme's
 * built-in preset when that customization is empty OR contains nothing this
 * bundle can render. The second case matters on a store that switched themes:
 * the saved template is full of the OLD theme's section types, every one of
 * them unknown here, and rendering "what the host sent" would produce an empty
 * page. Falling back to our own preset gives the shopper a real storefront.
 */
export function selectTemplateSections(
  hostTemplate: MaybeOrderedTemplate | undefined,
  builtinTemplate: MaybeOrderedTemplate | undefined,
  isKnown: (sectionType: string) => boolean,
): ResolvedSection[] {
  const hostSections = resolveSections(hostTemplate);
  if (hostSections.length === 0) return resolveSections(builtinTemplate);
  const anyKnown = hostSections.some(({ instance }) => isKnown(instance.type));
  if (!anyKnown) return resolveSections(builtinTemplate);
  return hostSections.filter(({ instance }) => isKnown(instance.type));
}
