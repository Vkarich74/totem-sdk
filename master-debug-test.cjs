const fs = require("fs");
const path = require("path");

const ROOT = "C:\\Work\\totem-sdk";

const files = [
  "src\\App.jsx",
  "src\\master\\MasterContext.jsx",
  "src\\master\\MasterLayout.jsx",
  "src\\master\\MasterSidebar.jsx",
  "src\\master\\resolveMasterSlug.js",
  "src\\master\\masterFinanceRouteContract.js",
  "src\\api\\master.js"
];

function safeRead(relPath) {
  const fullPath = path.join(ROOT, relPath);
  try {
    return fs.readFileSync(fullPath, "utf8");
  } catch (e) {
    return null;
  }
}

function findAll(content, regex) {
  const out = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    out.push({
      match: match[0],
      index: match.index
    });
  }

  return out;
}

function printSection(title) {
  console.log("");
  console.log("=".repeat(80));
  console.log(title);
  console.log("=".repeat(80));
}

function printFileHeader(relPath) {
  console.log("");
  console.log("-".repeat(80));
  console.log(relPath);
  console.log("-".repeat(80));
}

function analyzeApp(content) {
  printSection("APP ANALYSIS");

  const masterPlainRoutes = findAll(
    content,
    /<Route\s+path="master"(?!\/:slug)[^>]*>/g
  );

  const masterSlugRoutes = findAll(
    content,
    /<Route\s+path="master\/:slug"[^>]*>/g
  );

  const salonPlainRoutes = findAll(
    content,
    /<Route\s+path="salon"(?!\/:slug)[^>]*>/g
  );

  const salonSlugRoutes = findAll(
    content,
    /<Route\s+path="salon\/:slug"[^>]*>/g
  );

  console.log("plain master routes:", masterPlainRoutes.length);
  masterPlainRoutes.forEach((x, i) => console.log(`  [${i + 1}] ${x.match}`));

  console.log("slug master routes:", masterSlugRoutes.length);
  masterSlugRoutes.forEach((x, i) => console.log(`  [${i + 1}] ${x.match}`));

  console.log("plain salon routes:", salonPlainRoutes.length);
  salonPlainRoutes.forEach((x, i) => console.log(`  [${i + 1}] ${x.match}`));

  console.log("slug salon routes:", salonSlugRoutes.length);
  salonSlugRoutes.forEach((x, i) => console.log(`  [${i + 1}] ${x.match}`));

  const hasGetSlugFromPath = content.includes("function getSlugFromPath()");
  const hasHashMasterParse = content.includes('if (parts[0] === "master" && parts[1])');

  console.log("has getSlugFromPath():", hasGetSlugFromPath);
  console.log("has hash master parse parts[1]:", hasHashMasterParse);
}

function analyzeMasterContext(content) {
  printSection("MASTER CONTEXT ANALYSIS");

  console.log("uses useParams:", content.includes("useParams"));
  console.log("uses window.MASTER_SLUG:", content.includes("window.MASTER_SLUG"));
  console.log("uses useEffect empty deps:", /\},\s*\[\s*\]\s*\)/.test(content));
  console.log("loads metrics:", content.includes("getMasterMetrics"));
  console.log("loads bookings:", content.includes("getMasterBookings"));
  console.log("loads clients:", content.includes("getMasterClients"));
  console.log("has explicit error state:", content.includes("setError") || content.includes("error,"));
}

function analyzeMasterLayout(content) {
  printSection("MASTER LAYOUT ANALYSIS");

  console.log("has local getMasterSlug():", content.includes("function getMasterSlug()"));
  console.log("uses window.MASTER_SLUG:", content.includes("window.MASTER_SLUG"));
  console.log("uses localStorage master slug:", content.includes('totem_master_slug'));
  console.log("parses hash master path:", content.includes('parts[0] === "master"'));
  console.log("renders <MasterProvider>:", content.includes("<MasterProvider>"));
  console.log("passes slug prop to MasterProvider:", /<MasterProvider\s+slug=/.test(content));
  console.log("passes slug prop to MasterSidebar:", /<MasterSidebar\s+slug=/.test(content));
  console.log("passes slug prop to CabinetHeader:", /<CabinetHeader\s+slug=/.test(content));
}

function analyzeMasterSidebar(content) {
  printSection("MASTER SIDEBAR ANALYSIS");

  console.log("file exists:", true);
  console.log("uses slug prop:", /function\s+MasterSidebar\s*\(\s*\{\s*slug/.test(content) || /const\s+MasterSidebar\s*=\s*\(\s*\{\s*slug/.test(content));
  console.log("contains '/master/bookings':", content.includes('"/master/bookings"') || content.includes("'/master/bookings'"));
  console.log("contains '/master/${slug}':", content.includes("/master/${slug}") || content.includes('`/master/${slug}`'));
  console.log("contains hash links '#/master/':", content.includes("#/master/"));
}

function analyzeResolveFile(relPath, content) {
  printSection(`ANALYSIS ${relPath}`);

  console.log("file exists:", true);
  console.log("uses window.MASTER_SLUG:", content.includes("window.MASTER_SLUG"));
  console.log("uses localStorage:", content.includes("localStorage"));
  console.log("uses sessionStorage:", content.includes("sessionStorage"));
  console.log("uses useParams:", content.includes("useParams"));
  console.log("parses hash:", content.includes("window.location.hash") || content.includes("location.hash"));
}

function analyzeApiMaster(content) {
  printSection("API MASTER ANALYSIS");

  const endpoints = [
    "/internal/masters/\" + slug + \"/metrics",
    "/internal/masters/\" + slug + \"/bookings",
    "/internal/masters/\" + slug + \"/clients",
    "/internal/masters/\" + slug + \"/services"
  ];

  endpoints.forEach((ep) => {
    console.log(`${ep}:`, content.includes(ep));
  });
}

function main() {
  console.log("TOTEM MASTER DEBUG TEST");
  console.log("ROOT =", ROOT);

  const loaded = {};

  for (const relPath of files) {
    const content = safeRead(relPath);
    loaded[relPath] = content;

    printFileHeader(relPath);

    if (content == null) {
      console.log("STATUS: MISSING");
      continue;
    }

    console.log("STATUS: OK");
    console.log("LINES:", content.split(/\r?\n/).length);
    console.log("CHARS:", content.length);
  }

  if (loaded["src\\App.jsx"]) {
    analyzeApp(loaded["src\\App.jsx"]);
  }

  if (loaded["src\\master\\MasterContext.jsx"]) {
    analyzeMasterContext(loaded["src\\master\\MasterContext.jsx"]);
  }

  if (loaded["src\\master\\MasterLayout.jsx"]) {
    analyzeMasterLayout(loaded["src\\master\\MasterLayout.jsx"]);
  }

  if (loaded["src\\master\\MasterSidebar.jsx"]) {
    analyzeMasterSidebar(loaded["src\\master\\MasterSidebar.jsx"]);
  }

  if (loaded["src\\master\\resolveMasterSlug.js"]) {
    analyzeResolveFile("src\\master\\resolveMasterSlug.js", loaded["src\\master\\resolveMasterSlug.js"]);
  }

  if (loaded["src\\master\\masterFinanceRouteContract.js"]) {
    analyzeResolveFile("src\\master\\masterFinanceRouteContract.js", loaded["src\\master\\masterFinanceRouteContract.js"]);
  }

  if (loaded["src\\api\\master.js"]) {
    analyzeApiMaster(loaded["src\\api\\master.js"]);
  }

  printSection("NEXT");
  console.log("1. Run this script.");
  console.log("2. Send me full output.");
  console.log("3. Send me the full contents of missing files, if any.");
}

main();