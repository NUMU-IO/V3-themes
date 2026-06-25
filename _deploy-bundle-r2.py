"""Upload a built BYOT theme `dist/` to the R2 bundle bucket.

Reads S3/R2 creds from NUMU-api/.env (never prints them). Uploads every
file in dist/ flat under `<slug>/<version>/<file>` with the correct MIME
type — the storefront loads theme.js via native `import(url)`, so the
hashed chunks + import-map.json MUST sit in the same directory and be
served as JS, or the browser rejects the module.

Usage:
  python _deploy-bundle-r2.py <slug> <version> <dist_dir>
"""

import os
import pathlib
import sys

import boto3

# Path to an env file holding S3_* creds. Override with NUMU_R2_ENV so the
# script is portable across machines (default keeps the original location).
ENV_PATH = os.environ.get("NUMU_R2_ENV", r"C:\Users\PC\Desktop\NUMU\NUMU-api\.env")

CONTENT_TYPES = {
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".html": "text/html; charset=utf-8",
    ".map": "application/json",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
}


def load_env(path: str) -> dict[str, str]:
    env: dict[str, str] = {}
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            env[key.strip()] = val.strip().strip('"').strip("'")
    return env


def main() -> int:
    if len(sys.argv) != 4:
        print(__doc__)
        return 2
    slug, version, dist_dir = sys.argv[1], sys.argv[2], sys.argv[3]
    dist = pathlib.Path(dist_dir)
    if not dist.is_dir():
        print(f"ERROR: dist dir not found: {dist}")
        return 1

    env = load_env(ENV_PATH)
    public = env["S3_PUBLIC_URL"].rstrip("/")
    bucket = env["S3_BUCKET_NAME"]
    s3 = boto3.client(
        "s3",
        endpoint_url=env["S3_ENDPOINT_URL"],
        aws_access_key_id=env["S3_ACCESS_KEY_ID"],
        aws_secret_access_key=env["S3_SECRET_ACCESS_KEY"],
        region_name=env.get("S3_REGION", "auto"),
    )

    count = 0
    for path in sorted(dist.rglob("*")):
        if path.is_dir():
            continue
        rel = path.relative_to(dist).as_posix()
        key = f"{slug}/{version}/{rel}"
        ctype = CONTENT_TYPES.get(path.suffix.lower(), "application/octet-stream")
        s3.upload_file(
            str(path),
            bucket,
            key,
            ExtraArgs={"ContentType": ctype, "CacheControl": "public, max-age=300"},
        )
        print(f"  {key}  [{ctype}]")
        count += 1

    print(f"\nUploaded {count} files to bucket '{bucket}'.")
    print(f"bundle_url: {public}/{slug}/{version}/theme.js")
    print(f"css_url:    {public}/{slug}/{version}/theme.css")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
