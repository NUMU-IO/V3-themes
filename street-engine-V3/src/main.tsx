/**
 * Street (V3) — entry point.
 *
 * Rewritten from the `numu-theme migrate` stub. What that stub was:
 *   - two sections importing V2 paths (`@/components/store/shared/…`) that do
 *     not exist in V3, so the theme could not build at all;
 *   - no header, no footer, no hero — nothing navigable;
 *   - `ThemeApp` ignored `currentTemplate` and always rendered `home`, so
 *     every route showed the same page;
 *   - tokens scoped to `:root[data-theme="street"]`, a V2 selector that never
 *     matches in V3, so even a successful build would have rendered unstyled.
 *
 * Sections are imported EAGERLY (not React.lazy): lazy sections can't be
 * server-rendered by renderToString (they suspend on a chunk fetch) and the
 * per-chunk waterfall causes a blank-content flash on every navigation.
 */

import { type ComponentType } from "react";
import {
  Section,
  defineThemeEntry,
  selectChromeSections,
  selectTemplateSections,
  useThemeSettings,
  type MaybeOrderedTemplate,
  type SectionInstance,
} from "@numueg/theme-sdk";
import themeManifest from "../theme.json";
import "./theme.css";

import StHeader from "./sections/st-header";
import StFooter from "./sections/st-footer";
import StHero from "./sections/st-hero";
import StProductGrid from "./sections/st-product-grid";
import StProductDetail from "./sections/st-product-detail";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_REGISTRY: Record<string, ComponentType<any>> = {
  "st-hero": StHero,
  "st-product-grid": StProductGrid,
  "st-product-detail": StProductDetail,
  // Chrome, aliased to the GENERIC names too so chrome delivered via
  // section_groups resolves whichever form the customizer wrote.
  "st-header": StHeader,
  "st-footer": StFooter,
  header: StHeader,
  footer: StFooter,
};

const HEADER_TYPES = new Set(["st-header", "header"]);
const FOOTER_TYPES = new Set(["st-footer", "footer"]);

const isKnownType = (t: string) => Boolean(SECTION_REGISTRY[t]);

const PRESETS = (
  themeManifest as unknown as {
    presets?: {
      templates?: Record<string, MaybeOrderedTemplate>;
      section_groups?: Record<string, MaybeOrderedTemplate>;
    };
  }
).presets;
const BUILTIN_TEMPLATES = PRESETS?.templates ?? {};
const BUILTIN_GROUPS = PRESETS?.section_groups ?? {};

function UnknownSection({ type }: { type: string }) {
  return (
    <section style={{ padding: "1rem", border: "1px dashed #fb923c" }}>
      Unknown section: <strong>{type}</strong>
    </section>
  );
}

function RenderSection({
  instance,
  sectionId,
  groupId,
}: {
  instance: SectionInstance;
  sectionId: string;
  groupId?: string;
}) {
  const Component = SECTION_REGISTRY[instance.type];
  if (!Component) {
    return (
      <Section id={sectionId} type={instance.type} groupId={groupId}>
        <UnknownSection type={instance.type} />
      </Section>
    );
  }
  return (
    <Section id={sectionId} type={instance.type} groupId={groupId}>
      <Component instance={instance} sectionId={sectionId} />
    </Section>
  );
}

function ThemeApp({ currentTemplate }: { currentTemplate: string }) {
  const settings = useThemeSettings();
  const hostTemplate = settings.templates?.[currentTemplate] as
    | MaybeOrderedTemplate
    | undefined;
  const sections = selectTemplateSections(
    hostTemplate,
    BUILTIN_TEMPLATES[currentTemplate],
    isKnownType,
  );

  const inlineHeader = sections.filter(({ instance }) =>
    HEADER_TYPES.has(instance.type),
  );
  const inlineFooter = sections.filter(({ instance }) =>
    FOOTER_TYPES.has(instance.type),
  );
  const body = sections.filter(
    ({ instance }) =>
      !HEADER_TYPES.has(instance.type) && !FOOTER_TYPES.has(instance.type),
  );

  const groups = settings.section_groups as
    | Record<string, MaybeOrderedTemplate>
    | undefined;
  // Routes this theme ships no template for still get navigation: chrome falls
  // back to the customizer's section_groups, then the theme's own presets,
  // then whatever chrome another template carries inline.
  const chromeCandidates = [
    (settings.templates as Record<string, MaybeOrderedTemplate> | undefined)
      ?.home,
    BUILTIN_TEMPLATES.home,
    ...Object.values(
      (settings.templates ?? {}) as Record<string, MaybeOrderedTemplate>,
    ),
    ...Object.values(BUILTIN_TEMPLATES),
  ];
  const chrome = (
    inline: typeof inlineHeader,
    hostGroup: MaybeOrderedTemplate | undefined,
    presetGroup: MaybeOrderedTemplate | undefined,
    types: Set<string>,
  ) =>
    selectChromeSections({
      hostGroup,
      presetGroup,
      inline,
      templates: chromeCandidates,
      isChrome: (t) => types.has(t),
      isKnown: isKnownType,
    });

  const header = chrome(
    inlineHeader,
    groups?.header,
    BUILTIN_GROUPS.header,
    HEADER_TYPES,
  );
  const footer = chrome(
    inlineFooter,
    groups?.footer,
    BUILTIN_GROUPS.footer,
    FOOTER_TYPES,
  );

  return (
    <div data-street-v3-app data-theme="street-v3">
      {header.map(({ id, instance }) => (
        <RenderSection
          key={id}
          sectionId={id}
          instance={instance}
          groupId="header"
        />
      ))}
      {/* Exactly one <main> landmark, and the slot the host fills with the page
          body on routes this theme has no template for. */}
      <main>
        {body.map(({ id, instance }) => (
          <RenderSection key={id} sectionId={id} instance={instance} />
        ))}
      </main>
      {footer.map(({ id, instance }) => (
        <RenderSection
          key={id}
          sectionId={id}
          instance={instance}
          groupId="footer"
        />
      ))}
    </div>
  );
}

// defineThemeEntry yields both mount (client) and createApp (server SSR); the
// SDK's buildThemeElement owns the NuMuProvider wiring.
const entry = defineThemeEntry(({ currentTemplate }) => (
  <ThemeApp currentTemplate={currentTemplate} />
));

export const mount = entry.mount;
export const createApp = entry.createApp;

const v3Handle = {
  kind: "v3-mount" as const,
  numu_theme_version: 3 as const,
  mount_returns: "MountResult" as const,
  manifest: { id: "street-v3", name: "Street (V3)", version: "0.2.0" },
  mount,
};
export default v3Handle;
