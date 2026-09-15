/**
 * The grading scale for used copies: four grades, each with a small line
 * drawing of what that grade looks like on a real book.
 *
 * A grade is matched from the words a bookseller already writes ("Very good —
 * light shelf wear"), so nothing needs re-entering. A condition that matches no
 * grade is still shown as written; it just gets no diagram.
 */

import { useT } from "./i18n";

export type GradeKey = "like_new" | "very_good" | "good" | "loved";

export const GRADES: Array<{ key: GradeKey; label: string; note: string }> = [
  { key: "like_new", label: "Like New", note: "Almost untouched" },
  { key: "very_good", label: "Very Good", note: "Minor shelf wear" },
  { key: "good", label: "Good", note: "Visible signs of reading" },
  { key: "loved", label: "Loved", note: "Heavily used, still complete" },
];

export function gradeOf(condition: string): GradeKey | null {
  const text = condition.toLowerCase();
  if (!text) return null;
  if (/like\s*new|as\s*new|mint|fine\b/.test(text)) return "like_new";
  if (/very\s*good/.test(text)) return "very_good";
  if (/loved|acceptable|fair|poor|worn|reading copy/.test(text)) return "loved";
  if (/\bgood\b/.test(text)) return "good";
  return null;
}

const line = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** One book, front on, with the wear of its grade drawn over it. */
export function GradeDiagram({ grade, size = 64 }: { grade: GradeKey; size?: number }) {
  const level = GRADES.findIndex((g) => g.key === grade);
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 64 80" aria-hidden="true" {...line} strokeWidth={1.2}>
      <rect x="12" y="6" width="42" height="66" rx="2" fill="var(--pw-scene-field)" />
      <path d="M18 6v66" strokeOpacity="0.6" />
      <path d="M26 22h20M26 28h14" strokeOpacity="0.55" />
      <path d="M54 9h3v66H15v-3" strokeOpacity="0.5" />
      {level >= 1 && <path d="M50 6l4 4M12 68l4 4" />}
      {level >= 2 && (
        <>
          <path d="M18 40c1 3-1 6 0 9M18 55c1 2-1 4 0 6" />
          <path d="M57 30h-2M57 42h-2M57 54h-2" />
        </>
      )}
      {level >= 3 && (
        <>
          <path d="M42 6l12 12H42z" fill="var(--pw-paper)" />
          <circle cx="36" cy="54" r="5" strokeOpacity="0.45" strokeDasharray="2 2" />
          <path d="M18 14c2 2-2 4 0 6" />
        </>
      )}
    </svg>
  );
}

/** The four grades in a row. `current` marks the copy being viewed. */
export function GradingScale({ current }: { current?: GradeKey | null }) {
  const t = useT();
  return (
    <ol className="pw-grades">
      {GRADES.map((grade) => (
        <li key={grade.key} className="pw-grade" aria-current={current === grade.key ? "true" : undefined}>
          <GradeDiagram grade={grade.key} />
          <b>{t(`grade.${grade.key}`, grade.label)}</b>
          <span>{t(`grade.${grade.key}_note`, grade.note)}</span>
        </li>
      ))}
    </ol>
  );
}
