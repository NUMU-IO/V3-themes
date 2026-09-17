import type { SectionProps } from "@numueg/theme-sdk";

/**
 * `main.tsx` passes each section component its instance `id` and `type` in
 * addition to the SDK's settings/blocks/blockOrder.
 *
 * This used to widen `SectionProps` with its own `id` and an OPTIONAL `type`,
 * because the SDK declared neither. The SDK now declares both, and `type` as
 * REQUIRED — so the local re-declaration narrowed the base type and became a
 * compile error the moment the build started typechecking. The alias is kept
 * so the ~30 sections importing `EmpSectionProps` need no change.
 */
export type EmpSectionProps = SectionProps;
