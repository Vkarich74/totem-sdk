import os
import re
import sys
import json
import time
import subprocess
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

ROOT = Path(os.getcwd())

SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".vite", "coverage"}
TEXT_EXT = {".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".css", ".html", ".env", ".mjs", ".cjs", ".map"}

# Must-pass patterns (from audit)
PAT_INTERNAL_KEY = re.compile(r"\bINTERNAL_KEY\b|x-internal-key", re.IGNORECASE)
PAT_INTERNAL_PATH = re.compile(r"/internal/", re.IGNORECASE)
PAT_HEX_LITERAL = re.compile(r'["\']([a-f0-9]{48,})["\']', re.IGNORECASE)  # catches hardcoded tokens/keys

PAT_PUBLIC_PATH = re.compile(r"/public/", re.IGNORECASE)

def run(cmd, cwd=None, timeout=None):
    p = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return p.returncode, p.stdout

def walk_files(base: Path, include_ext=None):
    for dirpath, dirnames, filenames in os.walk(base):
        dn = Path(dirpath).name
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            p = Path(dirpath) / fn
            if include_ext is None:
                yield p
            else:
                if p.suffix.lower() in include_ext:
                    yield p

def read_text(p: Path):
    try:
        return p.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            return p.read_text(encoding="cp1251")
        except Exception:
            return None
    except Exception:
        return None

def find_matches_in_tree(base: Path, label: str, pattern: re.Pattern, limit=50):
    hits = []
    for p in walk_files(base, include_ext=TEXT_EXT):
        txt = read_text(p)
        if txt is None:
            continue
        if pattern.search(txt):
            hits.append(str(p.relative_to(ROOT)))
            if len(hits) >= limit:
                break
    return hits

def find_hex_literals_in_tree(base: Path, limit=50):
    hits = []
    for p in walk_files(base, include_ext=TEXT_EXT):
        txt = read_text(p)
        if txt is None:
            continue
        for m in PAT_HEX_LITERAL.finditer(txt):
            val = m.group(1)
            masked = val[:12] + "..." + val[-6:]
            hits.append(f"{p.relative_to(ROOT)} : {masked} (len={len(val)})")
            if len(hits) >= limit:
                return hits
    return hits

def http_get_json(url: str, timeout=10):
    req = Request(url, headers={"Accept": "application/json"})
    with urlopen(req, timeout=timeout) as resp:
        data = resp.read().decode("utf-8", errors="replace")
        return resp.status, json.loads(data)

def section(title):
    print("\n" + "=" * 78)
    print(title)
    print("=" * 78)

def ok(msg):
    print(f"[OK] {msg}")

def warn(msg):
    print(f"[WARN] {msg}")

def fail(msg):
    print(f"[FAIL] {msg}")

def main():
    # Args
    salon = None
    api_base = os.environ.get("SDK_API_BASE") or os.environ.get("VITE_API_BASE") or os.environ.get("API_BASE")

    for a in sys.argv[1:]:
        if a.startswith("--salon="):
            salon = a.split("=", 1)[1].strip()
        elif a.startswith("--api="):
            api_base = a.split("=", 1)[1].strip()

    if not api_base:
        # best guess for your setup; can override via --api= or SDK_API_BASE
        api_base = "https://api.totemv.com"

    section("SDK RELEASE TEST — MUST PASS (Release-1)")

    # 1) sanity: key files
    section("1) Key files sanity")
    must_exist = ["package.json", "vite.config.js", "src/main.jsx", "src/App.jsx"]
    missing = [p for p in must_exist if not (ROOT / p).exists()]
    if missing:
        fail("Missing key files: " + ", ".join(missing))
        sys.exit(2)
    ok("Key files exist")

    # 2) build
    section("2) Build test: npm run build")
    rc, out = run("npm run build", cwd=ROOT, timeout=600)
    print(out)
    if rc != 0:
        fail("npm run build FAILED")
        sys.exit(3)
    ok("npm run build PASSED")

    # Detect dist dir
    dist = ROOT / "dist"
    if not dist.exists():
        warn("dist/ not found after build (maybe output dir differs). Skipping dist scans.")
    else:
        ok("dist/ exists")

    # 3) Source scan (must-pass)
    section("3) Source scan (src/) — secrets & internal calls")
    src = ROOT / "src"

    hits_key = find_matches_in_tree(src, "internal_key", PAT_INTERNAL_KEY, limit=200)
    hits_internal = find_matches_in_tree(src, "internal_path", PAT_INTERNAL_PATH, limit=200)

    hex_hits = find_hex_literals_in_tree(src, limit=50)

    # Evaluate
    if hits_key:
        fail("Found INTERNAL_KEY/x-internal-key in src (MUST FIX):")
        for h in hits_key:
            print("  -", h)
    else:
        ok("No INTERNAL_KEY/x-internal-key in src")

    if hits_internal:
        fail("Found direct /internal/ usage in src (MUST FIX):")
        for h in hits_internal:
            print("  -", h)
    else:
        ok("No direct /internal/ usage in src")

    # hex literals in src (not always bad, but likely secrets)
    if hex_hits:
        warn("Found long hex-like literals in src (review):")
        for h in hex_hits:
            print("  -", h)
    else:
        ok("No long hex-like literals in src")

    # 4) Dist scan (must-pass)
    if dist.exists():
        section("4) Dist scan (dist/) — secrets & internal references in bundle")
        hits_key_dist = find_matches_in_tree(dist, "internal_key", PAT_INTERNAL_KEY, limit=200)
        hits_internal_dist = find_matches_in_tree(dist, "internal_path", PAT_INTERNAL_PATH, limit=200)
        hex_hits_dist = find_hex_literals_in_tree(dist, limit=50)

        if hits_key_dist:
            fail("Found INTERNAL_KEY/x-internal-key in dist (MUST FIX):")
            for h in hits_key_dist:
                print("  -", h)
        else:
            ok("No INTERNAL_KEY/x-internal-key in dist")

        if hits_internal_dist:
            fail("Found /internal/ references in dist (MUST FIX):")
            for h in hits_internal_dist:
                print("  -", h)
        else:
            ok("No /internal/ references in dist")

        if hex_hits_dist:
            warn("Found long hex-like literals in dist (review):")
            for h in hex_hits_dist:
                print("  -", h)
        else:
            ok("No long hex-like literals in dist")

    # 5) Public API smoke (optional but useful)
    section("5) Public API smoke (optional)")
    if not salon:
        warn("No salon slug provided. Skipping API smoke. Use --salon=totem-demo-salon")
    else:
        base = api_base.rstrip("/")
        tests = [
            (f"{base}/public/salons/{salon}", "salon profile"),
            (f"{base}/public/salons/{salon}/metrics", "salon metrics"),
            (f"{base}/public/salons/{salon}/masters", "salon masters"),
            (f"{base}/public/salons/{salon}/bookings", "salon bookings"),
        ]
        all_ok = True
        for url, name in tests:
            try:
                status, data = http_get_json(url, timeout=15)
                if status != 200 or not isinstance(data, dict) or not data.get("ok"):
                    all_ok = False
                    fail(f"{name}: bad response from {url} -> status={status}, ok={data.get('ok') if isinstance(data, dict) else 'n/a'}")
                else:
                    ok(f"{name}: OK ({url})")
            except (HTTPError, URLError, TimeoutError) as e:
                all_ok = False
                fail(f"{name}: ERROR ({url}) -> {e}")

        if all_ok:
            ok("Public API smoke PASSED")
        else:
            warn("Public API smoke FAILED (not always a SDK issue; check backend availability)")

    # Final gate
    section("6) FINAL GATE")
    must_fail = False
    if hits_key or hits_internal:
        must_fail = True
    if dist.exists():
        if find_matches_in_tree(dist, "internal_key", PAT_INTERNAL_KEY, limit=1):
            must_fail = True
        if find_matches_in_tree(dist, "internal_path", PAT_INTERNAL_PATH, limit=1):
            must_fail = True

    if must_fail:
        fail("RELEASE GATE: FAILED (secrets or internal calls detected)")
        sys.exit(10)

    ok("RELEASE GATE: PASSED")
    sys.exit(0)

if __name__ == "__main__":
    main()