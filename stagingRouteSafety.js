// TOTEM US06-STAGE-ROUTES: STAGING BUILD-ONLY deny-by-default routing.
// Normal Production builds use the existing Vite config and are untouched.
// Staging must pass explicit, non-production origins and a strict switch.
// © TOTEM, local feature branch. No runtime secrets or outgoing network.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const STAGING_FORBIDDEN_HOSTS = Object.freeze([
  "api.totemv.com",
  "app.totemv.com",
  "www.totemv.com",
  "totemv.com",
  "totem-platform.odoo.com",
  "honey.totemv.com",
]);

const replacementHosts = Object.freeze({
  "https://api.totemv.com": "api",
  "http://api.totemv.com": "api",
  "https://app.totemv.com": "app",
  "http://app.totemv.com": "app",
  "https://www.totemv.com": "public",
  "http://www.totemv.com": "public",
  "https://totemv.com": "public",
  "http://totemv.com": "public",
});

const forbiddenDomainRe =
  /(?<![A-Za-z0-9_.-])(?:api\.totemv\.com|app\.totemv\.com|www\.totemv\.com|totemv\.com|totem-platform\.odoo\.com|honey\.totemv\.com)(?![A-Za-z0-9_.-])/i;

export function checkStagingOrigin(value, purpose) {
  const input = String(value || "").trim();
  if (!input) throw new Error("STAGING_" + purpose + "_URL_REQUIRED");
  let url;
  try { url = new URL(input); }
  catch { throw new Error("STAGING_" + purpose + "_URL_INVALID"); }
  const hostname = url.hostname.toLowerCase();
  const localhost = hostname === "localhost" || hostname === "127.0.0.1";
  const forbiddenProductionLike = STAGING_FORBIDDEN_HOSTS.some(
    host => hostname === host || hostname.startsWith(host + ".")
  );
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && localhost)) ||
      url.username || url.password || url.search || url.hash ||
      url.pathname !== "/" || !url.hostname ||
      forbiddenProductionLike ||
      (
        // Reject all other Railway hosts AND .railway.app.evil lookalikes.
        /railway\.app/i.test(hostname) &&
        !/^totem-us-staging-(?:api|sdk)-staging\.up\.railway\.app$/i
          .test(hostname)
      ) ||
      /^(.+\.)?(?:cloudflare\.com|odoo\.com)$/i.test(url.hostname)) {
    throw new Error("STAGING_" + purpose + "_ORIGIN_REJECTED");
  }
  return url.origin;
}

function valuesForMode(mode, env) {
  const strict = mode === "staging" || env.VITE_STAGE_STRICT === "1";
  if (!strict) return null;
  if (env.VITE_STAGE_STRICT !== "1") {
    throw new Error("STAGING_EXPLICIT_VITE_STAGE_STRICT_REQUIRED");
  }
  const api = checkStagingOrigin(env.VITE_API_BASE, "API");
  const app = checkStagingOrigin(env.VITE_STAGE_APP_ORIGIN, "APP");
  const publicSite = checkStagingOrigin(env.VITE_STAGE_PUBLIC_ORIGIN, "PUBLIC");
  if (env.VITE_PUBLIC_API_BASE &&
      String(env.VITE_PUBLIC_API_BASE).replace(/\/$/, "") !== api + "/public") {
    throw new Error("STAGING_PUBLIC_API_MUST_MATCH_CONFIGURED_API");
  }
  if (env.VITE_STAGE_ALLOW_EXTERNAL || env.VITE_STAGE_ENABLE_PRODUCTION) {
    throw new Error("STAGING_UNSAFE_EXTERNAL_OVERRIDE_REJECTED");
  }
  return { api, app, public: publicSite };
}

export function checkForForbiddenStageHost(output, label = "bundle") {
  const match = forbiddenDomainRe.exec(String(output));
  if (match) {
    throw new Error("STAGING_PRODUCTION_HOST_IN_OUTPUT " +
      label + " " + match[0]);
  }
}

function rewriteKnownOrigins(source, origins, label, replaced) {
  let result = source;
  for (const [needle, kind] of Object.entries(replacementHosts)) {
    const occurrences = result.split(needle).length - 1;
    if (!occurrences) continue;
    result = result.replaceAll(needle, origins[kind]);
    replaced.set(label + "#" + needle, occurrences);
  }
  // The independent Odoo connector is intentionally NOT accessed in
  // staging. If an Odoo absolute hostname appears in the output, fail.
  return result;
}

export function createStagingRouteSafety({ mode, env }) {
  const origins = valuesForMode(mode, env);
  if (!origins) return null; // Existing production/development is unchanged.
  const rewrites = new Map();
  const csp = [
    "default-src 'self'",
    "connect-src 'self' " + origins.api,
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    // Do not permit an image-tag GET against the live Production API.
    "img-src 'self' data: blob: https://res.cloudinary.com",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'self'",
  ].join("; ");
  return {
    name: "totem-us06-staging-routing-fail-closed",
    apply: "build",
    enforce: "pre",
    transform(source, moduleId) {
      const normalized = moduleId.split("?")[0].replaceAll("\\", "/");
      if (!normalized.includes("/src/") ||
          !/\.(?:m?js|jsx|tsx|ts)$/.test(normalized)) return null;
      const code = rewriteKnownOrigins(source, origins,
        normalized.slice(normalized.indexOf("/src/")), rewrites);
      return code === source ? null : { code, map: null };
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const cleaned = rewriteKnownOrigins(html, origins, "index.html", rewrites);
        checkForForbiddenStageHost(cleaned, "index.html");
        return {
          html: cleaned,
          tags: [{
            tag: "meta",
            attrs: { "http-equiv": "Content-Security-Policy", content: csp },
            injectTo: "head-prepend",
          }],
        };
      },
    },
    generateBundle(_options, bundle) {
      // Stage-only static allowlist. Never copy public/index.html,
      // public/assets/index.js, the legacy sw.js or any unknown public file.
      for (const name of [
        "manifest.webmanifest",
        "icons/apple-touch-icon.png",
        "icons/icon-192.png",
        "icons/icon-512.png",
      ]) {
        const data = readFileSync(join(process.cwd(), "public", name));
        if (name.endsWith(".webmanifest")) {
          checkForForbiddenStageHost(data.toString("utf8"), name);
        }
        this.emitFile({ type: "asset", fileName: name, source: data });
      }
      for (const [name, artifact] of Object.entries(bundle)) {
        const output = artifact.type === "chunk"
          ? artifact.code
          : (typeof artifact.source === "string" ? artifact.source : "");
        checkForForbiddenStageHost(output, name);
      }
      if (!rewrites.size) {
        throw new Error("STAGING_EXPECTED_KNOWN_SOURCE_ROUTES_NOT_FOUND");
      }
    },
    writeBundle(options) {
      const outputRoot = options.dir;
      if (!outputRoot) throw new Error("STAGING_BUILD_OUTPUT_DIR_REQUIRED");
      const html = readFileSync(join(outputRoot, "index.html"), "utf8");
      checkForForbiddenStageHost(html, "dist/index.html");
      if (!html.includes("Content-Security-Policy") ||
          !html.includes("connect-src 'self' " + origins.api)) {
        throw new Error("STAGING_CSP_NOT_DELIVERED_IN_HTML");
      }
      for (const forbidden of ["assets/index.js", "sw.js"]) {
        try {
          readFileSync(join(outputRoot, forbidden));
          throw new Error("STAGING_LEGACY_PUBLIC_JS_COPIED " + forbidden);
        } catch (error) {
          if (error?.code !== "ENOENT") throw error;
        }
      }
    },
    closeBundle() {
      // Only filenames are printed. No source code or secrets.
      const items = [...rewrites.values()].reduce((a, b) => a + b, 0);
      if (!items) throw new Error("STAGING_ROUTE_REWRITE_ZERO");
      console.log("US06_STAGE_ROUTING_BUILD_PASS", JSON.stringify({
        replacements: items,
        affected_literal_kinds: new Set(
          [...rewrites.keys()].map(x => x.split("#").at(-1))
        ).size,
        staging_api: origins.api,
        staging_app: origins.app,
        staging_public: origins.public,
        production_api_requests_allowed: false,
        csp_connect_src: "self+staging-api-only",
      }));
    },
  };
}
