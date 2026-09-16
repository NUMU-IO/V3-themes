/**
 * "Looking for a specific book?" — the request form.
 *
 * One dialog for the whole theme, mounted once by main.tsx like the cart
 * drawer, opened from the request section, the search page's no-results state,
 * or ANY link to `#request-book` a merchant puts in a menu, the footer or the
 * announcement strip.
 *
 * It posts multipart to the storefront's product-requests route, which saves
 * the request for the merchant's hub and emails them. `website` is the honeypot
 * the route expects. Photos are checked here for type, size and count so a
 * shopper hears about a problem before sending, and the server checks them
 * again.
 */

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useLocale } from "@numueg/theme-sdk";
import { createOpenStore, Drawer } from "./cart-drawer";
import { fill, useT } from "./i18n";
import { IconArrow, IconClose, IconSearch, SceneLetter } from "./ornaments";

/**
 * A small tab pinned to the side of the page, so the shopper can ask for a
 * book from wherever they are rather than only from the band on the home
 * page. Deliberately narrow — the label reads vertically and it sits mid-
 * height against the edge, so it never covers a product card. On phones it
 * drops to a short horizontal pill above the thumb line for the same reason.
 */
export function RequestSideTab() {
  const t = useT();
  const label = t("request.button", "Request a book");
  return (
    <button
      type="button"
      className="pw-request-tab"
      onClick={openRequestForm}
      aria-label={label}
    >
      <IconSearch size={14} />
      <span>{label}</span>
    </button>
  );
}

const requestStore = createOpenStore();
export const openRequestForm = (): void => requestStore.set(true);
export const REQUEST_HASH = "#request-book";

const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Mounted once; renders nothing while closed, and turns `#request-book` links into openers. */
export function RequestFormDialog() {
  const open = requestStore.useOpen();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!link || !link.getAttribute("href")?.endsWith(REQUEST_HASH)) return;
      e.preventDefault();
      openRequestForm();
    };
    document.addEventListener("click", onClick);
    if (window.location.hash === REQUEST_HASH) openRequestForm();
    return () => document.removeEventListener("click", onClick);
  }, []);

  return open ? <RequestFormPanel /> : null;
}

interface Picked {
  file: File;
  url: string;
}

function RequestFormPanel() {
  const t = useT();
  const locale = useLocale();
  const close = () => requestStore.set(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const [trap, setTrap] = useState("");
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...photos];
    let note = "";
    for (const file of Array.from(list)) {
      if (!TYPES.includes(file.type)) {
        note = t("request.bad_type", "Photos must be JPG, PNG or WebP.");
        continue;
      }
      if (file.size > MAX_BYTES) {
        note = t("request.too_big", "Each photo must be under 5 MB.");
        continue;
      }
      if (next.length >= MAX_FILES) {
        note = fill(t("request.too_many", "You can add up to {{count}} photos."), { count: MAX_FILES });
        break;
      }
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setPhotos(next);
    setProblem(note);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photos[index].url);
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    const body = new FormData();
    body.set("name", name.trim());
    body.set("email", email.trim());
    if (phone.trim()) body.set("phone", phone.trim());
    body.set("details", details.trim());
    body.set("website", trap);
    body.set("locale", locale);
    body.set("source_url", window.location.href.split("#")[0]);
    photos.forEach((p) => body.append("images", p.file, p.file.name));
    try {
      const res = await fetch("/api/storefront/product-requests", { method: "POST", body });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  const title = t("request.title", "Looking for a specific book?");

  return (
    <Drawer side="end" modal title={title} closeLabel={t("drawer.close", "Close")} onClose={close}>
      {state === "done" ? (
        <div className="pw-request-done" role="status">
          <SceneLetter width={220} />
          <h3>{t("request.done_title", "Request sent")}</h3>
          <p>
            {t(
              "request.done_body",
              "Thank you — we'll look for your edition and get back to you with a price by email or phone.",
            )}
          </p>
          <button type="button" className="pw-btn pw-btn-primary" onClick={close}>
            {t("request.done_close", "Keep browsing")}
          </button>
        </div>
      ) : (
        <form className="pw-request" onSubmit={submit} noValidate={false}>
          <p className="pw-request-intro">
            {t(
              "request.intro",
              "Tell us the book and edition you want — the ISBN-13 helps most — and we'll come back to you with a price. Photos of the cover help too.",
            )}
          </p>

          <label className="pw-field">
            <span>
              {t("request.name", "Name")} <b aria-hidden="true">*</b>
            </span>
            <input type="text" required maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="pw-field">
            <span>
              {t("request.email", "Email")} <b aria-hidden="true">*</b>
            </span>
            <input type="email" required maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="pw-field">
            <span>{t("request.phone", "Phone number")}</span>
            <input type="tel" maxLength={32} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="pw-field">
            <span>
              {t("request.details", "ISBN-13 & edition")} <b aria-hidden="true">*</b>
            </span>
            <textarea
              required
              rows={4}
              maxLength={2000}
              value={details}
              placeholder={t("request.details_hint", "e.g. 978-1-250-78731-8, hardcover, UK edition")}
              onChange={(e) => setDetails(e.target.value)}
            />
          </label>

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

          <div className="pw-field">
            <span>{t("request.photos", "Upload photos")}</span>
            <div
              className="pw-drop"
              data-dragging={dragging || undefined}
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8a4 4 0 0 1 .5 7.97" />
                <path d="M12 12v8M9 15l3-3 3 3" />
              </svg>
              <b>{t("request.drop", "Drag and drop images here")}</b>
              <span>{t("request.browse", "or click to browse · JPG, PNG, WebP · up to 5 MB each")}</span>
              <input
                ref={inputRef}
                type="file"
                accept={TYPES.join(",")}
                multiple
                hidden
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            {photos.length > 0 && (
              <ul className="pw-drop-list">
                {photos.map((p, i) => (
                  <li key={p.url}>
                    <img src={p.url} alt="" />
                    <button
                      type="button"
                      aria-label={fill(t("request.remove_photo", "Remove photo {{number}}"), { number: i + 1 })}
                      onClick={() => removePhoto(i)}
                    >
                      <IconClose size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {problem && (
              <p className="pw-request-problem" role="alert">
                {problem}
              </p>
            )}
          </div>

          {state === "error" && (
            <p className="pw-request-problem" role="alert">
              {t("request.error", "We couldn't send your request. Please check your details and try again.")}
            </p>
          )}

          <button type="submit" className="pw-btn pw-btn-primary pw-btn-block" disabled={state === "sending"}>
            {state === "sending" ? t("request.sending", "Sending…") : t("request.send", "Send request")}
            {state !== "sending" && <IconArrow />}
          </button>
        </form>
      )}
    </Drawer>
  );
}
