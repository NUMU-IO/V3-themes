#!/usr/bin/env python3
"""
upload-bundle-to-r2.py — Session G canary uploader (file 08 slice 1).

Uploads a built theme `dist/` to an S3-compatible bucket (Cloudflare R2),
preserving directory structure so the bundle's RELATIVE chunk imports
(`./main-*.js`, `./by-*.js`) resolve next to `theme.js` on the static host.

Why Python/boto3 (not the brief's .mjs):
  `@aws-sdk/client-s3` is NOT installed in any node_modules here, but the
  NUMU-api venv already ships boto3 1.42.30 (used by
  src/infrastructure/external_services/cloudflare_r2/storage_service.py).
  A standalone boto3 script runs with ZERO install and no app bootstrap.
  Functionally identical to the prescribed .mjs (walk dist/, preserve
  structure, correct Content-Type, immutable Cache-Control).

Run it with the NUMU-api venv python so boto3 is available, e.g.:
  C:\\Users\\PC\\Desktop\\NUMU\\NUMU-api\\.venv\\Scripts\\python.exe \\
    scripts/upload-bundle-to-r2.py --slug bon-younes-v3 --version 0.1.0 \\
    --dist ./dist --verify

Credentials are read from the environment ONLY (never hard-coded):
  S3_ENDPOINT_URL, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
  S3_BUCKET_NAME, S3_PUBLIC_URL, S3_REGION
(R2_* names accepted as fallbacks.)

SAFETY:
  - Refuses to upload to a bucket whose name contains "prod"/"production"
    unless --allow-prod is passed (this canary targets numu-theme-bundles-dev).
  - --dry-run lists what WOULD upload without writing anything.
  - Prints the SHA-256 of theme.js (the value for
    marketplace_theme_versions.checksum) and the public URLs to curl.

This script does NOT touch the database. Repointing the version row is a
separate, explicit step (Phase C) once the public GETs verify.
"""

from __future__ import annotations

import argparse
import hashlib
import mimetypes
import os
import sys
from pathlib import Path

# Explicit Content-Type per extension. R2 defaults unknown types to
# application/octet-stream, which makes the browser REFUSE to dynamically
# import the module — the #1 R2-bundle failure mode. .js MUST be
# text/javascript.
CONTENT_TYPES = {
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".map": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".html": "text/html",
    ".txt": "text/plain",
}

CACHE_CONTROL = "public, max-age=31536000, immutable"


def env(*names: str) -> str | None:
    for n in names:
        v = os.environ.get(n)
        if v:
            return v
    return None


def content_type_for(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in CONTENT_TYPES:
        return CONTENT_TYPES[ext]
    guess, _ = mimetypes.guess_type(str(path))
    return guess or "application/octet-stream"


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser(description="Upload a theme dist/ to R2.")
    ap.add_argument("--slug", required=True, help="theme slug, e.g. bon-younes-v3")
    ap.add_argument("--version", required=True, help="version string, e.g. 0.1.0")
    ap.add_argument("--dist", default="./dist", help="path to the built dist/ dir")
    ap.add_argument("--dry-run", action="store_true", help="list, don't upload")
    ap.add_argument("--allow-prod", action="store_true", help="permit a prod-named bucket")
    ap.add_argument("--verify", action="store_true", help="after upload, GET key URLs + print results")
    args = ap.parse_args()

    dist = Path(args.dist).resolve()
    if not dist.is_dir():
        print(f"ERROR: dist dir not found: {dist}", file=sys.stderr)
        return 2

    endpoint = env("S3_ENDPOINT_URL")
    access_key = env("S3_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID")
    secret_key = env("S3_SECRET_ACCESS_KEY", "R2_SECRET_ACCESS_KEY")
    bucket = env("S3_BUCKET_NAME", "R2_BUCKET_NAME")
    public_url = (env("S3_PUBLIC_URL", "R2_PUBLIC_URL") or "").rstrip("/")
    region = env("S3_REGION") or "auto"

    missing = [
        n
        for n, v in [
            ("S3_ENDPOINT_URL", endpoint),
            ("S3_ACCESS_KEY_ID", access_key),
            ("S3_SECRET_ACCESS_KEY", secret_key),
            ("S3_BUCKET_NAME", bucket),
            ("S3_PUBLIC_URL", public_url),
        ]
        if not v
    ]
    if missing:
        print(f"ERROR: missing env vars: {', '.join(missing)}", file=sys.stderr)
        print("Set the R2 dev credentials before running (see SESSION-G-AUDIT.md).", file=sys.stderr)
        return 2

    # Safety: this canary targets the DEV bucket. Block obvious prod buckets.
    if ("prod" in bucket.lower()) and not args.allow_prod:
        print(f"ERROR: bucket '{bucket}' looks like production. Pass --allow-prod to override.", file=sys.stderr)
        return 2
    # Loud warning if the endpoint is clearly MinIO/localhost (not R2) — the
    # whole point of this slice is the R2 public path; MinIO has no r2.dev URL.
    if endpoint and ("minio" in endpoint.lower() or "localhost" in endpoint.lower() or "127.0.0.1" in endpoint):
        print(f"WARNING: endpoint '{endpoint}' looks like MinIO/localhost, not Cloudflare R2.")
        print("         The R2 public-CDN decisive test needs a real r2.dev bucket.")

    # theme.js checksum — the value for marketplace_theme_versions.checksum.
    theme_js = dist / "theme.js"
    if not theme_js.is_file():
        print(f"ERROR: {theme_js} not found — is this a built theme dist?", file=sys.stderr)
        return 2
    checksum = sha256_of(theme_js)

    files = sorted(p for p in dist.rglob("*") if p.is_file())
    prefix = f"{args.slug}/{args.version}"

    print(f"dist        : {dist}")
    print(f"endpoint    : {endpoint}")
    print(f"bucket      : {bucket}")
    print(f"public_url  : {public_url}")
    print(f"key prefix  : {prefix}/")
    print(f"files       : {len(files)}")
    print(f"theme.js sha256 = {checksum}")
    print("-" * 72)

    if args.dry_run:
        for p in files:
            rel = p.relative_to(dist).as_posix()
            print(f"DRY  {content_type_for(p):24s} {prefix}/{rel}")
        print("-" * 72)
        print("dry-run only — nothing uploaded.")
        return 0

    try:
        import boto3  # noqa
        from botocore.config import Config
    except ImportError:
        print("ERROR: boto3 not importable. Run with the NUMU-api venv python.", file=sys.stderr)
        return 2

    s3 = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region,
        config=Config(signature_version="s3v4"),
    )

    uploaded = 0
    for p in files:
        rel = p.relative_to(dist).as_posix()
        key = f"{prefix}/{rel}"
        ct = content_type_for(p)
        s3.upload_file(
            str(p),
            bucket,
            key,
            ExtraArgs={"ContentType": ct, "CacheControl": CACHE_CONTROL},
        )
        uploaded += 1
        print(f"  PUT {ct:24s} {key}")
    print("-" * 72)
    print(f"uploaded {uploaded} files to {bucket}/{prefix}/")
    print()
    print("Version-row values for Phase C:")
    print(f"  bundle_url = {public_url}/{prefix}/theme.js")
    print(f"  css_url    = {public_url}/{prefix}/theme.css")
    print(f"  checksum   = {checksum}")
    print()
    print("Verify (curl):")
    for f in ("theme.js", "theme.css", "manifest.json", "main-*.js (a chunk)"):
        print(f"  curl -sI {public_url}/{prefix}/{f}   # expect 200 + correct Content-Type")
    print(f"  curl -sI -H 'Origin: http://localhost:3100' {public_url}/{prefix}/theme.js   # expect Access-Control-Allow-Origin")

    if args.verify:
        import urllib.request
        print("-" * 72)
        for f in ("theme.js", "theme.css", "manifest.json"):
            url = f"{public_url}/{prefix}/{f}"
            try:
                req = urllib.request.Request(url, method="HEAD")
                with urllib.request.urlopen(req, timeout=15) as r:
                    print(f"  GET {r.status} {r.headers.get('Content-Type')}  {url}")
            except Exception as e:  # noqa
                print(f"  GET FAIL {url} -> {e}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
