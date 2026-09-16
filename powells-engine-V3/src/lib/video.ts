/**
 * Powell's — merchant video settings.
 *
 * The editor's `video_picker` stores `{ url, poster }`: `url` is either a file
 * the merchant uploaded (R2, an .mp4/.webm) or a link they pasted from
 * wherever the clip already lives. A native `<video>` plays the first and
 * nothing else, so a social URL is mapped to that platform's embeddable form
 * instead. An unrecognised host returns null and the caller shows the poster,
 * never a blank tile.
 */

import { asImageUrl, asRecord } from "./shared";

export type VideoEmbed =
  | { kind: "file"; src: string; poster: string }
  | { kind: "iframe"; src: string; provider: string; poster: string };

const FILE_RE = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i;

export function resolveVideo(raw: unknown): VideoEmbed | null {
  const url = asImageUrl(raw).trim();
  if (!url) return null;
  const poster = asImageUrl(asRecord(raw).poster);

  if (FILE_RE.test(url) || url.startsWith("blob:") || url.startsWith("data:")) {
    return { kind: "file", src: url, poster };
  }

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  const iframe = (src: string, provider: string): VideoEmbed => ({
    kind: "iframe",
    src,
    provider,
    poster,
  });

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be") {
    let id = "";
    if (host === "youtu.be") id = u.pathname.split("/").filter(Boolean)[0] ?? "";
    else if (u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2] ?? "";
    else id = u.searchParams.get("v") ?? "";
    if (!id) return null;
    const q = new URLSearchParams({ autoplay: "1", playsinline: "1", rel: "0", modestbranding: "1" });
    return iframe(`https://www.youtube-nocookie.com/embed/${id}?${q.toString()}`, "youtube");
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean).pop() ?? "";
    if (!/^\d+$/.test(id)) return null;
    return iframe(`https://player.vimeo.com/video/${id}?autoplay=1&playsinline=1`, "vimeo");
  }

  if (host === "instagram.com") {
    const m = u.pathname.match(/\/(reels?|p|tv)\/([^/]+)/);
    if (!m) return null;
    const kind = m[1] === "reels" ? "reel" : m[1];
    return iframe(`https://www.instagram.com/${kind}/${m[2]}/embed`, "instagram");
  }

  if (host === "tiktok.com") {
    const m = u.pathname.match(/\/video\/(\d+)/);
    if (!m) return null;
    return iframe(`https://www.tiktok.com/embed/v2/${m[1]}`, "tiktok");
  }

  // The Facebook plugin takes the original href, so there is no id to parse.
  if (host === "facebook.com" || host === "m.facebook.com" || host === "fb.watch") {
    const q = new URLSearchParams({ href: url, show_text: "false", autoplay: "true" });
    return iframe(`https://www.facebook.com/plugins/video.php?${q.toString()}`, "facebook");
  }

  return null;
}
