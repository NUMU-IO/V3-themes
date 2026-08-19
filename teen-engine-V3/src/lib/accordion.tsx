/**
 * Accordion — `<details>`/`<summary>`, not a JS disclosure.
 *
 * Three reasons this is not a `useState` toggle:
 *
 * 1. **Ctrl+F finds closed content.** Chrome and Edge auto-expand a `<details>`
 *    to reveal a find-in-page hit (`hidden=until-found` semantics). A
 *    JS-collapsed panel is unfindable, which on a PDP means the shipping times
 *    and the return window — the two things shoppers search the page for — are
 *    invisible to the browser's own search.
 * 2. **It works before hydration and without JS**, so the answer is reachable
 *    on the first frame rather than after the bundle lands.
 * 3. **The semantics are free**: `<summary>` is a button, it is keyboard
 *    operable, and screen readers announce the expanded state without a single
 *    `aria-*` attribute — all of which a hand-rolled version has to reimplement
 *    and usually gets half right.
 *
 * The `+`/`−` indicator is a `::after` on the summary, driven by `[open]`.
 */

import type { ReactNode } from "react";

export function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="tn-acc" open={defaultOpen}>
      <summary className="tn-acc-summary">{title}</summary>
      <div className="tn-acc-body">{children}</div>
    </details>
  );
}
