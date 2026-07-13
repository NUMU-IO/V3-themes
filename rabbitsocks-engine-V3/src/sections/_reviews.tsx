"use client";
/**
 * _reviews — REAL product reviews on the PDP (honest-CRO replacement for the
 * decorative ★★★★★ "(reviews)" row, which advertised ratings that didn't
 * exist and erodes trust the moment a shopper clicks it).
 *
 * Data: host proxy `/api/storefront/products/{id}/reviews`
 *   GET  → { items: [{reviewer_name, rating, title, body, created_at}],
 *            stats: {average, count, distribution} }   (approved only)
 *   POST → { rating, title?, body? }  (requires customer login; new reviews
 *            await merchant approval, so we confirm rather than render).
 */
import { useEffect, useState } from "react";
import { Link, useCustomer } from "@numueg/theme-sdk";
import { Star } from "lucide-react";
import { localized } from "./_shared";

export interface ReviewItem {
  id: string;
  reviewer_name: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  created_at: string;
}
export interface ReviewStats {
  average: number;
  count: number;
}

export function useProductReviews(productId: string | undefined) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ average: 0, count: 0 });
  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    fetch(`/api/storefront/products/${encodeURIComponent(productId)}/reviews?limit=20`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return;
        setItems(Array.isArray(j.items) ? j.items : []);
        if (j.stats) setStats({ average: Number(j.stats.average) || 0, count: Number(j.stats.count) || 0 });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [productId]);
  return { items, stats };
}

/** Row of 5 stars filled to `value` (halves round to nearest). */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          aria-hidden="true"
          className={i <= Math.round(value) ? "fill-[var(--vn-ink)] text-[var(--vn-ink)]" : "text-[var(--vn-border)]"}
        />
      ))}
    </span>
  );
}

/** The full PDP reviews block: stats header + list + write form. */
export function ReviewsSection({ productId, locale }: { productId: string; locale: string }) {
  const { items, stats } = useProductReviews(productId);
  const customer = useCustomer();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [formOpen, setFormOpen] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "busy") return;
    setState("busy");
    try {
      const res = await fetch(`/api/storefront/products/${encodeURIComponent(productId)}/reviews`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title || undefined, body: body || undefined }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <section className="mt-12 pt-8 border-t border-[var(--vn-border)]" data-testid="storefront-reviews">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="vn-heading text-lg md:text-xl text-[var(--vn-ink)]">
            {localized(locale, "Customer reviews", "آراء العملاء")}
          </h2>
          {stats.count > 0 && (
            <p className="mt-1 flex items-center gap-2 text-sm text-[var(--vn-muted)]">
              <Stars value={stats.average} />
              <span>
                {stats.average.toFixed(1)} · {stats.count}{" "}
                {localized(locale, stats.count === 1 ? "review" : "reviews", "تقييم")}
              </span>
            </p>
          )}
        </div>
        {customer ? (
          !formOpen && state !== "done" && (
            <button type="button" onClick={() => setFormOpen(true)} className="vn-btn vn-btn-outline-dark !h-9 text-[10px]">
              {localized(locale, "Write a review", "اكتبي تقييم")}
            </button>
          )
        ) : (
          <Link to="/account/login" className="text-[12px] text-[var(--vn-muted)] underline underline-offset-2 hover:text-[var(--vn-ink)]">
            {localized(locale, "Sign in to write a review", "سجّلي الدخول لكتابة تقييم")}
          </Link>
        )}
      </div>

      {state === "done" && (
        <p className="mb-5 border border-dashed border-[var(--vn-border)] px-3 py-2 text-xs text-[var(--vn-muted)]" data-testid="storefront-review-thanks">
          {localized(
            locale,
            "Thanks! Your review was submitted and will appear once approved.",
            "شكرًا! تم إرسال تقييمك وهيظهر بعد الموافقة عليه.",
          )}
        </p>
      )}

      {formOpen && state !== "done" && (
        <form onSubmit={submit} className="mb-7 border border-[var(--vn-border)] p-4 space-y-3" data-testid="storefront-review-form">
          <div className="flex items-center gap-2">
            <span className="vn-eyebrow">{localized(locale, "Your rating", "تقييمك")}</span>
            <span className="inline-flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} / 5`} className="p-0.5">
                  <Star size={18} className={i <= rating ? "fill-[var(--vn-ink)] text-[var(--vn-ink)]" : "text-[var(--vn-border)]"} />
                </button>
              ))}
            </span>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder={localized(locale, "Title (optional)", "العنوان (اختياري)")}
            className="w-full h-10 bg-transparent border-b border-[var(--vn-border)] focus:border-[var(--vn-ink)] focus:outline-none text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            rows={3}
            placeholder={localized(locale, "What did you think?", "إيه رأيك؟")}
            className="w-full bg-transparent border-b border-[var(--vn-border)] focus:border-[var(--vn-ink)] focus:outline-none text-sm resize-none py-2"
          />
          {state === "error" && (
            <p className="text-xs text-[var(--vn-sale)]">
              {localized(locale, "Couldn't submit. Please try again.", "معرفناش نرسل التقييم، حاول تاني.")}
            </p>
          )}
          <button type="submit" disabled={state === "busy"} className="vn-btn vn-btn-filled disabled:opacity-50">
            {state === "busy"
              ? localized(locale, "Submitting…", "جارٍ الإرسال…")
              : localized(locale, "Submit review", "إرسال التقييم")}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-[var(--vn-muted)]">
          {localized(locale, "No reviews yet. Be the first to share your experience.", "لسه مفيش تقييمات. كن أول من يشارك تجربته.")}
        </p>
      ) : (
        <ul className="space-y-5">
          {items.map((r) => (
            <li key={r.id} className="border-b border-[var(--vn-border)] pb-5 last:border-0">
              <div className="flex items-center gap-2.5">
                <Stars value={r.rating} size={12} />
                <span className="text-[13px] font-medium text-[var(--vn-ink)]">{r.reviewer_name}</span>
                <span className="text-[11px] text-[var(--vn-muted)]">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB") : ""}
                </span>
              </div>
              {r.title && <p className="mt-1.5 text-sm font-semibold text-[var(--vn-ink)]">{r.title}</p>}
              {r.body && <p className="mt-1 text-sm text-[var(--vn-muted)] leading-relaxed">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
