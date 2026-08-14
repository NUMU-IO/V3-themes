/**
 * Accordion — PDP content sections, FAQ groups, mobile filter groups.
 *
 * Built on `<details>/<summary>` rather than a div + aria-expanded, so it works
 * before hydration, is keyboard- and screen-reader-correct for free, and is
 * findable by the browser's own in-page search (Chrome expands a closed
 * `<details>` to reveal a match; a div-based accordion hides that content from
 * Ctrl+F entirely).
 *
 * Height animates via the `grid-template-rows: 0fr → 1fr` technique, which
 * transitions to auto height without measuring anything in JS. `height: auto`
 * cannot be transitioned, and a fixed max-height either clips long copy or
 * makes short copy animate slowly against an invented ceiling.
 */

import type { ReactNode } from "react";
import { cx } from "./shared";
import { IconChevronDown } from "./icons";

export interface AccordionItemProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  /**
   * Mark the summary text as schema.org `name`. Set by the FAQ section so each
   * question participates in FAQPage microdata; off everywhere else, since a
   * PDP's "Care" heading is not a Question.
   */
  nameProp?: boolean;
}

export function AccordionItem({
  title,
  children,
  defaultOpen,
  className,
  nameProp,
}: AccordionItemProps) {
  return (
    <details className={cx("gn-acc", className)} open={defaultOpen}>
      <summary className="gn-acc-summary">
        <span itemProp={nameProp ? "name" : undefined}>{title}</span>
        <IconChevronDown size={16} className="gn-acc-caret" />
      </summary>
      <div className="gn-acc-panel">
        <div className="gn-acc-inner">{children}</div>
      </div>
    </details>
  );
}
