const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CLOUD_NAME = "dgcec21nz";
const API_KEY = "196762278528777";
const API_SECRET = "phJBCKJkA8gwGsMqcvfnpWV_5uE";

const PRESET_NAME = "totem_unsigned_upload_v1";
const ROOT_FOLDER = "totem_media";

const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const TEST_SALON_SLUG = process.env.TEST_SALON_SLUG || "bootstrap-salon";
const TEST_MASTER_SLUG = process.env.TEST_MASTER_SLUG || "bootstrap-master";

const ASSET_KINDS = [
  "hero",
  "logo",
  "gallery",
  "promo",
  "services",
  "reviews",
  "team"
];

function logBlock(title, data) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(data, null, 2));
}

function adminAuthHeader() {
  return "Basic " + Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");
}

async function parseResponse(res) {
  const text = await res.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    ok: res.ok,
    status: res.status,
    text,
    json
  };
}

async function adminRequest(method, endpoint, body) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}${endpoint}`;
  const headers = {
    Authorization: adminAuthHeader()
  };

  let finalBody = undefined;

  if (body instanceof URLSearchParams) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    finalBody = body.toString();
  } else if (body && typeof body === "object") {
    headers["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  const res = await fetch(url, {
    method,
    headers,
    body: finalBody
  });

  return parseResponse(res);
}

async function getUploadPreset(name) {
  return adminRequest("GET", `/upload_presets/${encodeURIComponent(name)}`);
}

function buildPresetBody() {
  const body = new URLSearchParams();

  body.set("name", PRESET_NAME);
  body.set("unsigned", "true");
  body.set("disallow_public_id", "false");
  body.set("use_filename", "false");
  body.set("unique_filename", "true");
  body.set("overwrite", "false");
  body.set("resource_type", "image");
  body.set("allowed_formats", ALLOWED_FORMATS.join(","));
  body.set("return_delete_token", "false");
  body.set("type", "upload");
  body.set("access_mode", "public");
  body.set("use_asset_folder_as_public_id_prefix", "true");
  body.set("incoming_transformation", "c_limit,w_2400,h_2400,q_auto");

  return body;
}

async function createUploadPreset() {
  return adminRequest("POST", "/upload_presets", buildPresetBody());
}

async function updateUploadPreset() {
  return adminRequest("PUT", `/upload_presets/${encodeURIComponent(PRESET_NAME)}`, buildPresetBody());
}

async function ensureUploadPreset() {
  const current = await getUploadPreset(PRESET_NAME);

  if (current.ok) {
    logBlock("PRESET_FOUND", {
      name: PRESET_NAME,
      status: current.status
    });

    const updated = await updateUploadPreset();
    if (!updated.ok) {
      throw new Error(`PRESET_UPDATE_FAILED ${updated.status} ${updated.text}`);
    }

    logBlock("PRESET_UPDATED", updated.json || updated.text);
    return updated.json || {};
  }

  if (current.status !== 404) {
    throw new Error(`PRESET_LOOKUP_FAILED ${current.status} ${current.text}`);
  }

  logBlock("PRESET_NOT_FOUND", PRESET_NAME);

  const created = await createUploadPreset();
  if (!created.ok) {
    throw new Error(`PRESET_CREATE_FAILED ${created.status} ${created.text}`);
  }

  logBlock("PRESET_CREATED", created.json || created.text);
  return created.json || {};
}

function tinyPngBuffer() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnR2i0AAAAASUVORK5CYII=",
    "base64"
  );
}

function randomId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function signParams(params) {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b));

  const toSign = entries.map(([key, value]) => `${key}=${value}`).join("&");
  return crypto.createHash("sha1").update(`${toSign}${API_SECRET}`).digest("hex");
}

async function signedSmokeUpload({
  assetFolder,
  publicId,
  tags,
  context,
  displayName
}) {
  const timestamp = Math.floor(Date.now() / 1000);

  const signatureParams = {
    asset_folder: assetFolder,
    context,
    display_name: displayName,
    public_id: publicId,
    tags,
    timestamp,
    use_filename: "false"
  };

  const signature = signParams(signatureParams);

  const form = new FormData();
  const fileBlob = new Blob([tinyPngBuffer()], { type: "image/png" });

  form.append("file", fileBlob, "totem-smoke.png");
  form.append("api_key", API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);

  form.append("asset_folder", assetFolder);
  form.append("public_id", publicId);
  form.append("display_name", displayName);
  form.append("tags", tags);
  form.append("context", context);
  form.append("use_filename", "false");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form
  });

  const parsed = await parseResponse(res);

  if (!parsed.ok) {
    throw new Error(`SIGNED_SMOKE_UPLOAD_FAILED ${parsed.status} ${parsed.text}`);
  }

  return parsed.json;
}

async function listResourcesByAssetFolder(assetFolder) {
  const query = new URLSearchParams();
  query.set("asset_folder", assetFolder);
  query.set("max_results", "50");

  const res = await adminRequest("GET", `/resources/image/upload?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`LIST_BY_ASSET_FOLDER_FAILED ${res.status} ${res.text}`);
  }

  return res.json || {};
}

function extractSmokeSummary(payload) {
  return {
    asset_id: payload?.asset_id || null,
    public_id: payload?.public_id || null,
    asset_folder: payload?.asset_folder || null,
    secure_url: payload?.secure_url || null,
    width: payload?.width || null,
    height: payload?.height || null,
    format: payload?.format || null,
    resource_type: payload?.resource_type || null,
    bytes: payload?.bytes || null
  };
}

function buildRolePaths() {
  const result = {};

  for (const kind of ASSET_KINDS) {
    result[`salon_${kind}`] = `${ROOT_FOLDER}/salon/${TEST_SALON_SLUG}/${kind}`;
    result[`master_${kind}`] = `${ROOT_FOLDER}/master/${TEST_MASTER_SLUG}/${kind}`;
  }

  return result;
}

function buildUploadSpecs(paths) {
  const result = {};

  for (const [key, assetFolder] of Object.entries(paths)) {
    const [ownerType, assetKind] = key.split("_");
    const ownerSlug = ownerType === "salon" ? TEST_SALON_SLUG : TEST_MASTER_SLUG;

    result[key] = {
      assetFolder,
      publicId: randomId(`${ownerType}-${assetKind}`),
      displayName: `bootstrap-${ownerType}-${assetKind}`,
      tags: `totem,bootstrap,smoke,${ownerType},${assetKind}`,
      context: `owner_type=${ownerType}|owner_slug=${ownerSlug}|asset_kind=${assetKind}`
    };
  }

  return result;
}

async function runSmokeUploads(specs) {
  const result = {};

  for (const [key, spec] of Object.entries(specs)) {
    result[key] = await signedSmokeUpload(spec);
  }

  return result;
}

async function runFolderChecks(paths) {
  const result = {};

  for (const [key, assetFolder] of Object.entries(paths)) {
    result[key] = await listResourcesByAssetFolder(assetFolder);
  }

  return result;
}

function buildReport({ preset, paths, uploads, folderChecks }) {
  return {
    ok: true,
    cloud_name: CLOUD_NAME,
    preset_name: PRESET_NAME,
    root_folder: ROOT_FOLDER,
    allowed_formats: ALLOWED_FORMATS,
    max_file_size_bytes: MAX_FILE_SIZE,
    test_slugs: {
      salon: TEST_SALON_SLUG,
      master: TEST_MASTER_SLUG
    },
    preset_summary: {
      name: preset?.name || PRESET_NAME,
      unsigned: preset?.unsigned ?? true,
      resource_type: preset?.resource_type || "image",
      allowed_formats: preset?.allowed_formats || ALLOWED_FORMATS,
      use_asset_folder_as_public_id_prefix: preset?.use_asset_folder_as_public_id_prefix ?? true
    },
    role_strategy: {
      salon: ASSET_KINDS.map((kind) => `${ROOT_FOLDER}/salon/<slug>/${kind}`),
      master: ASSET_KINDS.map((kind) => `${ROOT_FOLDER}/master/<slug>/${kind}`)
    },
    created_paths: paths,
    smoke_uploads: Object.fromEntries(
      Object.entries(uploads).map(([key, payload]) => [key, extractSmokeSummary(payload)])
    ),
    folder_checks: Object.fromEntries(
      Object.entries(folderChecks).map(([key, payload]) => [
        `${key}_count`,
        Array.isArray(payload?.resources) ? payload.resources.length : 0
      ])
    )
  };
}

async function main() {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error("CLOUDINARY_CREDENTIALS_MISSING");
  }

  logBlock("BOOTSTRAP_START", {
    cloud_name: CLOUD_NAME,
    preset_name: PRESET_NAME,
    root_folder: ROOT_FOLDER,
    test_salon_slug: TEST_SALON_SLUG,
    test_master_slug: TEST_MASTER_SLUG
  });

  const preset = await ensureUploadPreset();
  const paths = buildRolePaths();
  const specs = buildUploadSpecs(paths);
  const uploads = await runSmokeUploads(specs);
  const folderChecks = await runFolderChecks(paths);

  const report = buildReport({ preset, paths, uploads, folderChecks });
  const reportPath = path.resolve("tools", "cloudinary-bootstrap-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  logBlock("CREATED_PATHS", paths);
  logBlock("SMOKE_UPLOADS_OK", report.smoke_uploads);
  logBlock("FOLDER_CHECKS_OK", report.folder_checks);
  logBlock("REPORT_WRITTEN", reportPath);
  logBlock("BOOTSTRAP_DONE", report);
}

main().catch((error) => {
  console.error("\n=== BOOTSTRAP_FAILED ===");
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});