/**
 * pw-newsletter — the book club letter.
 *
 * Posts to the storefront's newsletter route, which answers the same way for a
 * new address, an existing customer and a bot, so the form shows one thank-you
 * for all of them. `website` is the honeypot the route expects: hidden from
 * people, filled in by scripts.
 */

import { useState, type FormEvent } from "react";
import { useResolvedSettings } from "@numueg/theme-sdk";
import { asString, useOrnaments, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { IconArrow, SceneLetter } from "../lib/ornaments";

export default function PwNewsletter({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const ornaments = useOrnaments();
  const [email, setEmail] = useState("");
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || state === "busy") return;
    setState("busy");
    try {
      const res = await fetch("/api/storefront/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), website: trap }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  const inputId = `pw-club-${sectionId}`;

  return (
    <section className="pw-section">
      <div className="pw-club">
        {ornaments && (
          <div className="pw-club-art">
            <SceneLetter width={260} />
          </div>
        )}
        <div className="pw-club-copy">
          {asString(s.eyebrow) && <p className="pw-kicker">{asString(s.eyebrow)}</p>}
          <h2>{asString(s.heading) || t("club.heading", "Join the book club")}</h2>
          {asString(s.body) && <p className="pw-synopsis">{asString(s.body)}</p>}

          {state === "done" ? (
            <p className="pw-club-done" role="status">
              {asString(s.success) || t("club.success", "Thank you — watch your inbox for the next letter.")}
            </p>
          ) : (
            <form className="pw-club-form" onSubmit={submit}>
              <label className="pw-sr" htmlFor={inputId}>
                {t("club.email", "Email address")}
              </label>
              <input
                id={inputId}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={asString(s.placeholder) || t("club.placeholder", "Your email address")}
              />
              <input
                className="pw-hp"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={trap}
                onChange={(e) => setTrap(e.target.value)}
              />
              <button type="submit" className="pw-btn pw-btn-primary" disabled={state === "busy"}>
                {asString(s.button) || t("club.button", "Subscribe")}
                <IconArrow />
              </button>
            </form>
          )}
          {state === "error" && (
            <p className="pw-club-error" role="alert">
              {t("club.error", "That didn't go through. Please try again.")}
            </p>
          )}
          {asString(s.note) && <p className="pw-note">{asString(s.note)}</p>}
        </div>
      </div>
    </section>
  );
}
