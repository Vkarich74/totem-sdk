import os
import re
import json
import hashlib
from datetime import datetime

ROOT = os.getcwd()

TEXT_EXT = {".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".css", ".html", ".env", ".mjs", ".cjs"}
SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".vite", "coverage"}

ROUTE_PATTERNS = [
    re.compile(r'path\s*:\s*["\']([^"\']+)["\']'),
    re.compile(r'<Route[^>]+path=["\']([^"\']+)["\']', re.IGNORECASE),
]

API_PATTERNS = {
    "public_calls": re.compile(r'/(public)/', re.IGNORECASE),
    "internal_calls": re.compile(r'/(internal)/', re.IGNORECASE),
    "api_base": re.compile(r'\bAPI_BASE\b|VITE_API|process\.env|import\.meta\.env', re.IGNORECASE),
    "internal_key": re.compile(r'\bINTERNAL_KEY\b|x-internal-key', re.IGNORECASE),
    "idempotency": re.compile(r'Idempotency-Key', re.IGNORECASE),
}

RISK_PATTERNS = {
    "console_log": re.compile(r'\bconsole\.log\b'),
    "console_error": re.compile(r'\bconsole\.error\b'),
    "alert": re.compile(r'\balert\s*\('),
    "todo_fixme": re.compile(r'\bTODO\b|\bFIXME\b'),
}

FETCH_PAT = re.compile(r'\bfetch\s*\(\s*([^\)]+)\)', re.IGNORECASE)

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

def is_text_file(path):
    _, ext = os.path.splitext(path)
    return ext.lower() in TEXT_EXT

def walk_files(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            p = os.path.join(dirpath, fn)
            yield p

def safe_read(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except UnicodeDecodeError:
        try:
            with open(path, "r", encoding="cp1251") as f:
                return f.read()
        except Exception:
            return None
    except Exception:
        return None

def rel(p):
    return os.path.relpath(p, ROOT)

def pick_file(*candidates):
    for c in candidates:
        p = os.path.join(ROOT, c)
        if os.path.exists(p):
            return p
    return None

def extract_routes(text):
    routes = set()
    for pat in ROUTE_PATTERNS:
        for m in pat.finditer(text):
            routes.add(m.group(1).strip())
    return sorted(routes)

def extract_fetch_calls(text):
    calls = []
    for m in FETCH_PAT.finditer(text):
        frag = m.group(1).strip()
        frag = frag.replace("\n", " ")[:200]
        calls.append(frag)
    return calls

def main():
    started = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    report = []
    report.append(f"# TOTEM SDK AUDIT REPORT")
    report.append(f"- Root: `{ROOT}`")
    report.append(f"- Generated: `{started}`")
    report.append("")

    # Basic inventory
    all_files = list(walk_files(ROOT))
    text_files = [p for p in all_files if is_text_file(p)]
    report.append("## 1) Inventory")
    report.append(f"- Total files (excluding skip dirs): **{len(all_files)}**")
    report.append(f"- Text-like files scanned: **{len(text_files)}**")
    report.append("")

    # Key files
    report.append("## 2) Key files presence")
    key_files = {
        "package.json": pick_file("package.json"),
        "vite config": pick_file("vite.config.js", "vite.config.mjs", "vite.config.ts"),
        "main entry": pick_file("src/main.jsx", "src/main.tsx"),
        "app": pick_file("src/App.jsx", "src/App.tsx", "src/app.jsx", "src/app.tsx"),
        "router candidates": [],
        ".env files": [],
    }

    for p in all_files:
        r = rel(p)
        if r.lower().startswith(".env"):
            key_files[".env files"].append(r)
        if r.startswith("src") and ("router" in r.lower() or "routes" in r.lower()):
            if r.lower().endswith((".js", ".jsx", ".ts", ".tsx")):
                key_files["router candidates"].append(r)

    for k, v in key_files.items():
        if isinstance(v, list):
            report.append(f"- {k}: **{len(v)}**")
            for item in sorted(v)[:50]:
                report.append(f"  - `{item}`")
            if len(v) > 50:
                report.append(f"  - ... (+{len(v)-50} more)")
        else:
            report.append(f"- {k}: {'`'+rel(v)+'`' if v else '**MISSING**'}")
    report.append("")

    # package.json parse
    report.append("## 3) package.json summary")
    pkg_path = key_files["package.json"]
    if pkg_path:
        pkg_txt = safe_read(pkg_path) or ""
        try:
            pkg = json.loads(pkg_txt)
        except Exception:
            pkg = {}
        report.append(f"- name: `{pkg.get('name','?')}`")
        report.append(f"- version: `{pkg.get('version','?')}`")
        scripts = pkg.get("scripts", {}) if isinstance(pkg.get("scripts", {}), dict) else {}
        deps = pkg.get("dependencies", {}) if isinstance(pkg.get("dependencies", {}), dict) else {}
        devdeps = pkg.get("devDependencies", {}) if isinstance(pkg.get("devDependencies", {}), dict) else {}
        report.append(f"- scripts: {', '.join([f'`{k}`' for k in scripts.keys()]) if scripts else '(none)'}")
        report.append(f"- dependencies: **{len(deps)}**, devDependencies: **{len(devdeps)}**")
        if "react-router-dom" in deps or "react-router-dom" in devdeps:
            report.append("- router: `react-router-dom` ✅")
        else:
            report.append("- router: `react-router-dom` ❗ not found in deps")
    else:
        report.append("- package.json not found")
    report.append("")

    # Scan src structure
    report.append("## 4) src structure (top-level)")
    src_dir = os.path.join(ROOT, "src")
    if os.path.isdir(src_dir):
        top = []
        for name in sorted(os.listdir(src_dir)):
            top.append(name)
        report.append("`src/` contains:")
        for name in top[:80]:
            report.append(f"- `{name}`")
        if len(top) > 80:
            report.append(f"- ... (+{len(top)-80} more)")
    else:
        report.append("- src/ not found")
    report.append("")

    # Deep scan findings
    routes_found = set()
    api_hits = {k: [] for k in API_PATTERNS.keys()}
    risks = {k: [] for k in RISK_PATTERNS.keys()}
    fetch_calls = []
    internal_key_literals = []

    # detect INTERNAL_KEY literal (long hex-like)
    hexkey_pat = re.compile(r'["\']([a-f0-9]{48,})["\']', re.IGNORECASE)

    for p in text_files:
        txt = safe_read(p)
        if txt is None:
            continue

        r = rel(p)

        # routes
        for rt in extract_routes(txt):
            routes_found.add(rt)

        # api patterns
        for k, pat in API_PATTERNS.items():
            if pat.search(txt):
                api_hits[k].append(r)

        # risks
        for k, pat in RISK_PATTERNS.items():
            if pat.search(txt):
                risks[k].append(r)

        # fetch calls
        if "fetch(" in txt:
            for frag in extract_fetch_calls(txt):
                fetch_calls.append((r, frag))

        # internal key literal
        if "INTERNAL_KEY" in txt or "x-internal-key" in txt:
            for m in hexkey_pat.finditer(txt):
                val = m.group(1)
                if len(val) >= 48:
                    internal_key_literals.append((r, val[:12] + "..." + val[-6:], len(val)))

    # Routes section
    report.append("## 5) Routes detected (best-effort)")
    if routes_found:
        for rt in sorted(routes_found):
            report.append(f"- `{rt}`")
    else:
        report.append("- No routes detected by regex (router may be dynamic).")
    report.append("")

    # API usage section
    report.append("## 6) API usage & contracts (files referencing patterns)")
    for k, files in api_hits.items():
        report.append(f"- {k}: **{len(files)}**")
        for f in sorted(set(files))[:40]:
            report.append(f"  - `{f}`")
        if len(set(files)) > 40:
            report.append(f"  - ... (+{len(set(files))-40} more)")
    report.append("")

    # Internal key literal detection
    report.append("## 7) Security red flags")
    if internal_key_literals:
        report.append(f"- INTERNAL_KEY-like literals found: **{len(internal_key_literals)}**")
        for r, masked, ln in internal_key_literals[:20]:
            report.append(f"  - `{r}` : `{masked}` (len={ln})")
        if len(internal_key_literals) > 20:
            report.append(f"  - ... (+{len(internal_key_literals)-20} more)")
    else:
        report.append("- No obvious INTERNAL_KEY literals detected.")
    report.append("")

    # Risky patterns
    report.append("## 8) Code hygiene (where to clean before release)")
    for k, files in risks.items():
        report.append(f"- {k}: **{len(files)}**")
        for f in sorted(set(files))[:40]:
            report.append(f"  - `{f}`")
        if len(set(files)) > 40:
            report.append(f"  - ... (+{len(set(files))-40} more)")
    report.append("")

    # Fetch calls (sample)
    report.append("## 9) fetch() calls (sample)")
    if fetch_calls:
        for r, frag in fetch_calls[:60]:
            report.append(f"- `{r}` → `fetch({frag}...)`")
        if len(fetch_calls) > 60:
            report.append(f"- ... (+{len(fetch_calls)-60} more)")
    else:
        report.append("- No fetch() calls detected.")
    report.append("")

    # File fingerprints (small set)
    report.append("## 10) Fingerprints (for control / reproducibility)")
    fp_targets = []
    for c in ["package.json", "vite.config.js", "vite.config.mjs", "vite.config.ts", "src/main.jsx", "src/main.tsx"]:
        p = os.path.join(ROOT, c)
        if os.path.exists(p):
            fp_targets.append(p)
    for p in fp_targets:
        report.append(f"- `{rel(p)}` sha256: `{sha256_file(p)[:16]}...`")
    report.append("")

    # Minimal release checklist suggestion
    report.append("## 11) Release-10d minimal checklist (generated)")
    report.append("- [ ] Remove INTERNAL_KEY from frontend (0 secrets in bundle)")
    report.append("- [ ] No direct `/internal/*` calls from browser (proxy only)")
    report.append("- [ ] `npm run build` passes")
    report.append("- [ ] No `console.log` in release pages")
    report.append("- [ ] Bookings page shows date/time, statuses, actions working")
    report.append("- [ ] Basic pagination or at least limit safeguard (frontend/back)")
    report.append("")

    out_path = os.path.join(ROOT, "SDK_AUDIT_REPORT.md")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(report))

    print("OK: report generated ->", out_path)

if __name__ == "__main__":
    main()