"""Upload a built BYOT theme `dist/` to the R2 bundle bucket.

Reads S3/R2 creds from NUMU-api/.env (never prints them). Uploads every
file in dist/ flat under `<slug>/<version>/<file>` with the correct MIME
type — the storefront loads theme.js via native `import(url)`, so the
hashed chunks + import-map.json MUST sit in the same directory and be
served as JS, or the browser rejects the module.

Usage:
  python _deploy-bundle-r2.py <slug> <version> <dist_dir> [--allow-overwrite]

Refuses by default to publish over a version that already exists, because the
keys are served `immutable` for a year — see the note on `cache_control` in
`main()`. `--allow-overwrite` is for the one legitimate case: a deliberate
`version_bump: none` redeploy of the current version, where the operator has
accepted that already-cached clients will not see it.
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
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    if len(args) != 3 or flags - {"--allow-overwrite"}:
        print(__doc__)
        return 2
    slug, version, dist_dir = args
    allow_overwrite = "--allow-overwrite" in flags
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

    # Assets live under an IMMUTABLE, version-scoped key (`<slug>/<version>/…`),
    # so cache them for a year with `immutable` — the browser/CDN never
    # re-validate, making repeat visits + navigations instant. A theme update
    # ships a NEW version → new URL → fresh fetch.
    #
    # ⚠️ INVARIANT: never OVERWRITE an existing version's files — bump the
    # version (publish-theme.sh --bump) instead. With `immutable`, an in-place
    # overwrite would be silently ignored by already-cached clients for up to a
    # year. (This replaces the old max-age=300, which existed only to let the
    # overwrite hotfix pattern propagate.)
    cache_control = "public, max-age=31536000, immutable"

    # Enforce the invariant above instead of only documenting it.
    #
    # It was documented and violated for months: the workflow's `push` trigger
    # has no `version_bump` input, so every merge to main re-uploaded each
    # theme under its UNCHANGED version. The bytes did land in R2 — but the URL
    # never changed, so every browser and edge that had already fetched it kept
    # serving the previous build, and the registry seed (idempotent by
    # slug+version) updated the existing row rather than inserting one, so no
    # merchant was ever offered the update. A silent no-op that looked green.
    #
    # `theme.js` is the probe: it is the one file every theme dist has, and the
    # storefront's entry point.
    probe = f"{slug}/{version}/theme.js"
    if not allow_overwrite:
        try:
            s3.head_object(Bucket=bucket, Key=probe)
        except Exception:
            pass  # 404 (or no permission to check) — nothing to protect.
        else:
            print(
                f"ERROR: {slug} {version} is already published "
                f"({public}/{probe}).\n"
                f"       Those files are served immutable for a year, so "
                f"overwriting them\n"
                f"       reaches nobody who has already loaded the theme. "
                f"Bump the version in\n"
                f"       {slug}'s theme.json (and keep package.json in "
                f"lockstep), or pass\n"
                f"       --allow-overwrite if you truly mean to redeploy in "
                f"place."
            )
            return 1

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
            ExtraArgs={"ContentType": ctype, "CacheControl": cache_control},
        )
        print(f"  {key}  [{ctype}]")
        count += 1

    print(f"\nUploaded {count} files to bucket '{bucket}'.")
    print(f"bundle_url: {public}/{slug}/{version}/theme.js")
    print(f"css_url:    {public}/{slug}/{version}/theme.css")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
