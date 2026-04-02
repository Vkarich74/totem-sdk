const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe.configure({ mode: 'serial' });

const ROOT_DIR = path.resolve(__dirname, '..');
const SDK_DIR = path.resolve(ROOT_DIR, '..');
const SRC_DIR = path.join(SDK_DIR, 'src');
const SALON_DIR = path.join(SRC_DIR, 'salon');
const APP_FILE = path.join(SRC_DIR, 'App.jsx');

const BASE_URL = process.env.TOTEM_QA_BASE || 'http://localhost:5173';
const DEFAULT_SALON_SLUG = process.env.TOTEM_QA_SALON_SLUG || 'totem-demo-salon';
const REPORT_DIR = path.join(ROOT_DIR, 'artifacts', 'salon-full-audit');

const EXTRA_AUDIT_FILES = [
  path.join(SRC_DIR, 'core', 'dev-bootstrap.js'),
  path.join(SRC_DIR, 'core', 'runtime.js'),
  path.join(SRC_DIR, 'main.jsx'),
  path.join(SRC_DIR, 'utils', 'salon.js'),
  path.join(SRC_DIR, 'utils', 'slug.js')
];

const HARD_CODED_SLUG_PATTERNS = [
  'totem-demo-salon',
  'demo-salon',
  'salon-demo'
];

const CRASH_MARKERS = [
  'Something went wrong',
  'Application error',
  'Unexpected Application Error',
  'No routes matched',
  'Cannot read properties of undefined',
  'TypeError:',
  'ReferenceError:',
  'SyntaxError:',
  'Unhandled Runtime Error',
  'Minified React error'
];

const results = {
  structure: {
    directories: [],
    files: [],
    pageFiles: [],
    supportFiles: [],
    orphanFiles: [],
    duplicateResponsibility: [],
    appRouteBindings: []
  },
  coverageMatrix: [],
  apiDiscovery: {
    discovered: [],
    active: [],
    unreachable: [],
    emptyOrSuspect: [],
    brokenBindings: []
  },
  pageRuntime: [],
  dataContracts: [],
  emptyErrorStates: [],
  slugAudit: {
    hardcodedHits: [],
    windowSlugHits: [],
    routeSlugHits: [],
    apiSlugHits: [],
    fallbackHits: [],
    mismatches: []
  },
  odooBridge: {
    injectDetectedInCode: false,
    injectHits: [],
    runtimeChecks: [],
    devFallbackDetected: false,
    devFallbackHits: []
  },
  financeChain: [],
  navigation: [],
  hardcodeAudit: [],
  performance: {
    pageRuns: [],
    endpointRuns: []
  },
  final: {
    passed: 0,
    failed: 0,
    warnings: 0,
    brokenChains: 0,
    emptyResponses: 0,
    suspectedStubs: 0,
    slugMismatches: 0,
    odooIssues: 0,
    performanceIssues: 0
  }
};

const discoveredPages = [];
const discoveredEndpoints = [];

function nowIsoSafe() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function normalizeSlashes(p) {
  return String(p || '').replace(/\\/g, '/');
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function safeExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function scanTree(rootDir) {
  const directories = [];
  const files = [];

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    directories.push(current);

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        files.push(full);
      }
    }
  }

  walk(rootDir);
  return { directories, files };
}

function relativeToSdk(filePath) {
  return normalizeSlashes(path.relative(SDK_DIR, filePath));
}

function isCodeFile(filePath) {
  return /\.(jsx?|tsx?)$/i.test(filePath);
}

function isPageFile(filePath) {
  const base = path.basename(filePath);
  return /Page\.(jsx?|tsx?)$/i.test(base);
}

function uniqueBy(array, keyFn) {
  const map = new Map();
  for (const item of array) {
    map.set(keyFn(item), item);
  }
  return Array.from(map.values());
}

function mean(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((acc, value) => acc + value, 0) / values.length);
}

function min(values) {
  if (!values.length) return 0;
  return Math.min(...values);
}

function max(values) {
  if (!values.length) return 0;
  return Math.max(...values);
}

function formatList(items, formatter) {
  if (!items || items.length === 0) return 'none';
  return items.map(formatter).join('\n');
}

function hasCrashMarkers(bodyText) {
  const body = String(bodyText || '');
  return CRASH_MARKERS.some((marker) => body.includes(marker));
}

function isIgnoredConsole(text) {
  const lower = String(text || '').toLowerCase();
  return (
    lower.includes('download the react devtools') ||
    lower.includes('favicon') ||
    lower.includes('resizeobserver')
  );
}

function isLikelyApiUrl(url) {
  const lower = String(url || '').toLowerCase();
  return (
    lower.includes('/internal/') ||
    lower.includes('/public/') ||
    lower.includes('/api/')
  );
}

function extractStringLiterals(content) {
  const matches = [];
  const regex = /(['"`])((?:(?!\1)[\s\S])*?)\1/g;
  let m;

  while ((m = regex.exec(content)) !== null) {
    matches.push(m[2]);
  }

  return matches;
}

function normalizeEndpoint(endpoint) {
  let ep = String(endpoint || '').trim();
  if (!ep) return '';

  const internalIndex = ep.indexOf('/internal/');
  const publicIndex = ep.indexOf('/public/');
  const apiIndex = ep.indexOf('/api/');
  const indices = [internalIndex, publicIndex, apiIndex].filter((i) => i >= 0);

  if (indices.length > 0) {
    ep = ep.slice(Math.min(...indices));
  }

  ep = ep.replace(/^https?:\/\/[^/]+/i, '');
  ep = ep.replace(/\?.*$/, '');
  ep = ep.replace(/\$\{[^}]+\}/g, ':var');
  ep = ep.replace(/\bslug\b/gi, ':slug');
  ep = ep.replace(/['"`+ ]/g, '');
  ep = ep.replace(/\/{2,}/g, '/');
  ep = ep.replace(/^:var/, '');
  ep = ep.replace(/^:slug/, '');
  ep = ep.replace(/\/internal\/salons\/:var\//g, '/internal/salons/:slug/');
  ep = ep.replace(/\/internal\/salons\/[^/]+\//g, '/internal/salons/:slug/');
  ep = ep.replace(/\/public\/salons\/:var\//g, '/public/salons/:slug/');
  ep = ep.replace(/\/public\/salons\/[^/]+\//g, '/public/salons/:slug/');

  return ep;
}

function extractEndpoints(content) {
  const endpoints = new Set();
  const literals = extractStringLiterals(content);

  for (const value of literals) {
    if (isLikelyApiUrl(value)) {
      const normalized = normalizeEndpoint(value);
      if (normalized) endpoints.add(normalized);
    }
  }

  const helperRegexes = [
    /api\.(get|post|put|patch|delete)\s*\(\s*(['"`])([\s\S]*?)\2/g,
    /fetch\s*\(\s*(['"`])([\s\S]*?)\1/g,
    /axios\.(get|post|put|patch|delete)\s*\(\s*(['"`])([\s\S]*?)\2/g
  ];

  for (const re of helperRegexes) {
    let m;
    while ((m = re.exec(content)) !== null) {
      const raw = m[m.length - 1];
      if (isLikelyApiUrl(raw)) {
        const normalized = normalizeEndpoint(raw);
        if (normalized) endpoints.add(normalized);
      }
    }
  }

  return Array.from(endpoints).filter(Boolean).sort();
}

function inferRouteFromFile(filePath) {
  const base = path.basename(filePath);

  const direct = {
    'DashboardPage.jsx': 'dashboard',
    'BookingsPage.jsx': 'bookings',
    'CalendarPage.jsx': 'calendar',
    'ClientsPage.jsx': 'clients',
    'MastersPage.jsx': 'masters',
    'MoneyPage.jsx': 'money',
    'ServicesPage.jsx': 'services',
    'SettingsPage.jsx': 'settings',
    'SalonFinancePage.jsx': 'finance',
    'SalonMoneyPage.jsx': 'money',
    'SalonPayoutsPage.jsx': 'payouts',
    'SalonSettlementsPage.jsx': 'settlements',
    'SalonTransactionsPage.jsx': 'transactions',
    'SalonContractsPage.jsx': 'contracts'
  };

  if (direct[base]) return direct[base];

  return base
    .replace(/^Salon/i, '')
    .replace(/Page\.(jsx?|tsx?)$/i, '')
    .replace(/\.(jsx?|tsx?)$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function inferExpectedBlocks(routeName) {
  const map = {
    dashboard: ['dashboard', 'сегодня', 'today', 'метрик', 'metrics'],
    bookings: ['booking', 'запис', 'client', 'клиент'],
    calendar: ['calendar', 'календар', 'date', 'дат'],
    clients: ['client', 'клиент', 'phone', 'тел'],
    masters: ['master', 'мастер', 'service', 'услуг'],
    services: ['service', 'услуг', 'price', 'цен'],
    money: ['balance', 'баланс', 'wallet'],
    finance: ['balance', 'transactions', 'settlements', 'payouts', 'баланс'],
    transactions: ['transaction', 'ledger', 'транзак'],
    settlements: ['settlement', 'period', 'расчет', 'период'],
    payouts: ['payout', 'amount', 'выплат', 'сумм'],
    contracts: ['contract', 'active', 'pending', 'контракт'],
    settings: ['settings', 'настрой', 'profile', 'контакт']
  };

  return map[routeName] || [];
}

function guessRequiredFields(routeName) {
  const map = {
    dashboard: ['ok'],
    bookings: ['ok'],
    calendar: [],
    clients: ['ok'],
    masters: ['ok'],
    services: ['ok'],
    finance: ['ok'],
    money: ['ok'],
    transactions: ['ok'],
    settlements: ['ok'],
    payouts: ['ok'],
    contracts: ['ok'],
    settings: []
  };

  return map[routeName] || ['ok'];
}

function summarizePayload(payload) {
  if (payload == null) {
    return { empty: true, suspect: true, reason: 'null' };
  }

  if (Array.isArray(payload)) {
    return {
      empty: payload.length === 0,
      suspect: payload.length === 0,
      reason: payload.length === 0 ? 'empty_array' : 'array'
    };
  }

  if (typeof payload !== 'object') {
    return { empty: false, suspect: false, reason: typeof payload };
  }

  const keys = Object.keys(payload);
  if (keys.length === 0) {
    return { empty: true, suspect: true, reason: 'empty_object' };
  }

  if (payload.ok === true && keys.length === 1) {
    return { empty: false, suspect: true, reason: 'ok_only' };
  }

  let hasArray = false;
  let nonEmptyArray = false;

  for (const key of keys) {
    if (Array.isArray(payload[key])) {
      hasArray = true;
      if (payload[key].length > 0) nonEmptyArray = true;
    }
  }

  if (hasArray && !nonEmptyArray) {
    return { empty: true, suspect: true, reason: 'all_arrays_empty' };
  }

  return { empty: false, suspect: false, reason: 'object' };
}

function endpointTail(endpoint) {
  const normalized = normalizeEndpoint(endpoint);
  const internalSalonPrefix = '/internal/salons/:slug/';
  const publicSalonPrefix = '/public/salons/:slug/';
  const apiPrefix = '/api/';

  if (normalized.startsWith(internalSalonPrefix)) return normalized.slice(internalSalonPrefix.length);
  if (normalized.startsWith(publicSalonPrefix)) return normalized.slice(publicSalonPrefix.length);
  if (normalized.startsWith(apiPrefix)) return normalized.slice(apiPrefix.length);

  return normalized;
}

function endpointMatch(expectedEndpoint, actualUrl) {
  const expectedTail = endpointTail(expectedEndpoint);
  const normalizedActual = normalizeEndpoint(actualUrl);
  const actualTail = endpointTail(normalizedActual);

  if (!expectedTail || !actualTail) return false;
  if (actualTail === expectedTail) return true;
  if (actualTail.endsWith(expectedTail)) return true;
  if (expectedTail.endsWith(actualTail)) return true;

  return false;
}

function routeLooksLikeFinance(routeName) {
  return ['finance', 'money', 'transactions', 'settlements', 'payouts', 'contracts'].includes(routeName);
}

function extractWindowSalonSlugHits(content, filePath) {
  const hits = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].includes('window.SALON_SLUG')) {
      hits.push({
        file: relativeToSdk(filePath),
        line: i + 1,
        text: lines[i].trim()
      });
    }
  }

  return hits;
}

function extractHardcodedSlugHits(content, filePath) {
  const hits = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    for (const pattern of HARD_CODED_SLUG_PATTERNS) {
      if (lines[i].includes(pattern)) {
        hits.push({
          file: relativeToSdk(filePath),
          line: i + 1,
          pattern,
          text: lines[i].trim()
        });
      }
    }
  }

  return hits;
}

function extractRouteSlugHits(content, filePath) {
  const hits = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (
      line.includes('/salon/:slug') ||
      line.includes('#/salon/') ||
      line.includes('salon/:slug')
    ) {
      hits.push({
        file: relativeToSdk(filePath),
        line: i + 1,
        text: line.trim()
      });
    }
  }

  return hits;
}

function buildDiscoveredPages(files) {
  const pageFiles = files.filter((file) => isCodeFile(file) && isPageFile(file));

  const pages = pageFiles.map((filePath) => {
    const content = safeRead(filePath);
    const route = inferRouteFromFile(filePath);
    const endpoints = extractEndpoints(content);

    return {
      filePath,
      relativePath: relativeToSdk(filePath),
      route,
      endpoints,
      expectedBlocks: inferExpectedBlocks(route),
      requiredFields: guessRequiredFields(route),
      content
    };
  });

  return pages.sort((a, b) => a.route.localeCompare(b.route));
}

test('01. Static structure / route / endpoint / slug / hardcode map', async () => {
  ensureDir(REPORT_DIR);

  const salonTree = scanTree(SALON_DIR);

  results.structure.directories = salonTree.directories.map(relativeToSdk).sort();
  results.structure.files = salonTree.files.map(relativeToSdk).sort();
  results.structure.pageFiles = salonTree.files.filter((file) => isCodeFile(file) && isPageFile(file)).map(relativeToSdk).sort();
  results.structure.supportFiles = salonTree.files.filter((file) => isCodeFile(file) && !isPageFile(file)).map(relativeToSdk).sort();

  const pageModels = buildDiscoveredPages(salonTree.files);
  discoveredPages.push(...pageModels);

  for (const page of discoveredPages) {
    results.coverageMatrix.push({
      file: page.relativePath,
      route: page.route,
      endpoints: page.endpoints.slice(),
      slugSource: page.content.includes('window.SALON_SLUG')
        ? 'window.SALON_SLUG'
        : page.content.includes('useParams')
          ? 'route_param'
          : page.content.includes('SalonContext')
            ? 'context'
            : 'unknown',
      odooBridge: page.content.includes('window.SALON_SLUG'),
      status: 'DISCOVERED'
    });

    if (page.endpoints.length === 0 && !['calendar', 'settings'].includes(page.route)) {
      results.structure.orphanFiles.push({
        file: page.relativePath,
        reason: 'page_without_discovered_endpoint'
      });
    }
  }

  const routeCounts = {};
  for (const page of discoveredPages) {
    routeCounts[page.route] = (routeCounts[page.route] || 0) + 1;
  }

  for (const [route, count] of Object.entries(routeCounts)) {
    if (count > 1) {
      results.structure.duplicateResponsibility.push({
        route,
        count,
        files: discoveredPages.filter((page) => page.route === route).map((page) => page.relativePath)
      });
    }
  }

  const appContent = safeRead(APP_FILE);
  const appRouteRegexes = [
    /\/salon\/:slug\/([a-z0-9-]+)/gi,
    /salon\/:slug\/([a-z0-9-]+)/gi,
    /#\/salon\/:slug\/([a-z0-9-]+)/gi
  ];

  const appRoutes = new Set();
  for (const regex of appRouteRegexes) {
    let m;
    while ((m = regex.exec(appContent)) !== null) {
      appRoutes.add(m[1]);
    }
  }
  results.structure.appRouteBindings = Array.from(appRoutes).sort();

  const endpointSet = new Set();
  for (const page of discoveredPages) {
    for (const endpoint of page.endpoints) endpointSet.add(endpoint);
  }
  discoveredEndpoints.push(...Array.from(endpointSet).sort());
  results.apiDiscovery.discovered = discoveredEndpoints.slice();

  const slugAuditFiles = [
    ...salonTree.files.filter(isCodeFile),
    ...EXTRA_AUDIT_FILES.filter((file) => safeExists(file))
  ];

  for (const filePath of slugAuditFiles) {
    const content = safeRead(filePath);

    const windowHits = extractWindowSalonSlugHits(content, filePath);
    const hardcodedHits = extractHardcodedSlugHits(content, filePath);
    const routeSlugHits = extractRouteSlugHits(content, filePath);

    results.slugAudit.windowSlugHits.push(...windowHits);
    results.slugAudit.hardcodedHits.push(...hardcodedHits);
    results.slugAudit.routeSlugHits.push(...routeSlugHits);

    if (windowHits.length > 0) {
      results.odooBridge.injectDetectedInCode = true;
      results.odooBridge.injectHits.push(...windowHits);
    }

    if (/dev-bootstrap/i.test(relativeToSdk(filePath)) || content.includes('isLocal') || content.includes('localhost')) {
      if (content.includes('window.SALON_SLUG')) {
        results.odooBridge.devFallbackDetected = true;
        results.odooBridge.devFallbackHits.push({
          file: relativeToSdk(filePath)
        });
        results.slugAudit.fallbackHits.push({
          file: relativeToSdk(filePath),
          reason: 'dev_bootstrap_or_local_fallback'
        });
      }
    }
  }

  results.hardcodeAudit = uniqueBy(
    results.slugAudit.hardcodedHits.map((item) => ({
      file: item.file,
      line: item.line,
      pattern: item.pattern,
      text: item.text
    })),
    (item) => `${item.file}:${item.line}:${item.pattern}`
  );
});

for (let runIndex = 1; runIndex <= 3; runIndex += 1) {
  test(`02.${runIndex} Runtime / chain / contract / navigation / odoo / performance pass ${runIndex}`, async ({ page }) => {
    for (const pageModel of discoveredPages) {
      const routeUrl = `${BASE_URL}/#/salon/${DEFAULT_SALON_SLUG}/${pageModel.route}`;
      const startedAt = Date.now();

      const consoleErrors = [];
      const requestFails = [];
      const responseMeta = [];

      page.removeAllListeners('console');
      page.removeAllListeners('requestfailed');
      page.removeAllListeners('response');

      page.on('console', (msg) => {
        if (msg.type() === 'error' && !isIgnoredConsole(msg.text())) {
          consoleErrors.push(msg.text());
        }
      });

      page.on('requestfailed', (req) => {
        requestFails.push({
          url: req.url(),
          method: req.method(),
          failure: req.failure() ? req.failure().errorText : 'unknown'
        });
      });

      page.on('response', async (res) => {
        const url = res.url();
        const headers = res.headers();
        const contentType = String(headers['content-type'] || headers['Content-Type'] || '');

        const shouldTrack = isLikelyApiUrl(url) || contentType.includes('application/json');
        if (!shouldTrack) return;

        let jsonPayload = null;
        let jsonReadable = false;
        let empty = false;
        let suspect = false;
        let payloadReason = 'non_json';

        if (contentType.includes('application/json') || isLikelyApiUrl(url)) {
          try {
            jsonPayload = await res.json();
            jsonReadable = true;
            const inspection = summarizePayload(jsonPayload);
            empty = inspection.empty;
            suspect = inspection.suspect;
            payloadReason = inspection.reason;
          } catch {
            payloadReason = 'unreadable_json';
          }
        }

        responseMeta.push({
          url,
          status: res.status(),
          ok: res.ok(),
          jsonReadable,
          jsonPayload,
          empty,
          suspect,
          payloadReason
        });
      });

      await page.goto(routeUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(1500);

      const bodyText = await page.locator('body').innerText();
      const bodyLower = bodyText.toLowerCase();
      const uiOk = bodyText.trim().length > 50 && !hasCrashMarkers(bodyText);
      const expectedBlockHits = pageModel.expectedBlocks.filter((block) => bodyLower.includes(block.toLowerCase()));
      const expectedBlocksOk = pageModel.expectedBlocks.length === 0 ? true : expectedBlockHits.length > 0;

      const resourceEntries = await page.evaluate(() => {
        return performance.getEntriesByType('resource').map((entry) => ({
          name: entry.name,
          duration: Math.round(entry.duration || 0)
        }));
      });

      const apiResponses = responseMeta.filter((item) => isLikelyApiUrl(item.url));
      const matchedResponses = pageModel.endpoints.length > 0
        ? apiResponses.filter((meta) => pageModel.endpoints.some((endpoint) => endpointMatch(endpoint, meta.url)))
        : apiResponses;

      const matchedResourceEntries = resourceEntries.filter((entry) => {
        if (!isLikelyApiUrl(entry.name)) return false;
        if (pageModel.endpoints.length === 0) return true;
        return pageModel.endpoints.some((endpoint) => endpointMatch(endpoint, entry.name));
      });

      const apiCalled = matchedResponses.length > 0;
      const apiOk = matchedResponses.length > 0 ? matchedResponses.every((meta) => meta.status < 400) : pageModel.endpoints.length === 0;
      const apiReadable = matchedResponses.length > 0 ? matchedResponses.some((meta) => meta.jsonReadable) : pageModel.endpoints.length === 0;

      const contractChecks = [];
      if (pageModel.requiredFields.length > 0 && matchedResponses.length > 0) {
        for (const response of matchedResponses) {
          if (response.jsonPayload && typeof response.jsonPayload === 'object') {
            const missing = pageModel.requiredFields.filter((field) => !(field in response.jsonPayload));
            contractChecks.push({
              url: response.url,
              missing
            });
          }
        }
      }

      const contractOk = contractChecks.every((item) => item.missing.length === 0);
      const emptyResponses = matchedResponses.filter((meta) => meta.empty);
      const suspectResponses = matchedResponses.filter((meta) => meta.suspect);

      const runtimeWindow = await page.evaluate(() => {
        return {
          windowSalonSlug: typeof window.SALON_SLUG === 'undefined' ? null : window.SALON_SLUG,
          hash: window.location.hash,
          href: window.location.href,
          title: document.title || ''
        };
      });

      const apiSlugs = matchedResponses
        .map((meta) => {
          const match = meta.url.match(/\/salons\/([^/?#]+)/);
          return match ? match[1] : null;
        })
        .filter(Boolean);

      const routeSlugOk = runtimeWindow.hash.includes(`/salon/${DEFAULT_SALON_SLUG}/${pageModel.route}`);
      const injectedSlugOk = runtimeWindow.windowSalonSlug == null || runtimeWindow.windowSalonSlug === DEFAULT_SALON_SLUG;
      const apiSlugOk = apiSlugs.length === 0 || apiSlugs.every((slug) => slug === DEFAULT_SALON_SLUG);
      const slugMismatch = !(routeSlugOk && injectedSlugOk && apiSlugOk);

      const routeTime = Date.now() - startedAt;

      results.pageRuntime.push({
        run: runIndex,
        route: pageModel.route,
        url: routeUrl,
        uiOk,
        expectedBlocksOk,
        expectedBlockHits,
        renderTime: routeTime,
        consoleErrors,
        requestFails,
        apiCalled,
        apiOk,
        apiReadable,
        contractOk,
        emptyResponseCount: emptyResponses.length,
        suspectResponseCount: suspectResponses.length,
        slugMismatch,
        windowSalonSlug: runtimeWindow.windowSalonSlug,
        apiSlugs,
        hash: runtimeWindow.hash
      });

      results.dataContracts.push({
        run: runIndex,
        route: pageModel.route,
        requiredFields: pageModel.requiredFields,
        contractOk,
        checks: contractChecks
      });

      results.odooBridge.runtimeChecks.push({
        run: runIndex,
        route: pageModel.route,
        windowSalonSlug: runtimeWindow.windowSalonSlug,
        hash: runtimeWindow.hash,
        injectOk: runtimeWindow.windowSalonSlug == null || runtimeWindow.windowSalonSlug === DEFAULT_SALON_SLUG,
        routeSlugOk
      });

      results.slugAudit.apiSlugHits.push({
        run: runIndex,
        route: pageModel.route,
        apiSlugs
      });

      if (slugMismatch) {
        results.slugAudit.mismatches.push({
          run: runIndex,
          route: pageModel.route,
          windowSalonSlug: runtimeWindow.windowSalonSlug,
          apiSlugs,
          hash: runtimeWindow.hash
        });
      }

      results.navigation.push({
        run: runIndex,
        route: pageModel.route,
        url: routeUrl,
        slugPersistOk: routeSlugOk,
        foreignRouteLeak: runtimeWindow.hash.includes('/master/') || runtimeWindow.hash.includes('/owner/')
      });

      if (routeLooksLikeFinance(pageModel.route)) {
        results.financeChain.push({
          run: runIndex,
          route: pageModel.route,
          apiCalled,
          apiOk,
          contractOk,
          emptyResponseCount: emptyResponses.length,
          suspectResponseCount: suspectResponses.length
        });
      }

      results.performance.pageRuns.push({
        run: runIndex,
        route: pageModel.route,
        duration: routeTime
      });

      for (const entry of matchedResourceEntries) {
        results.performance.endpointRuns.push({
          run: runIndex,
          route: pageModel.route,
          endpoint: normalizeEndpoint(entry.name),
          duration: entry.duration
        });
      }

      if (pageModel.endpoints.length > 0 && !apiCalled) {
        results.apiDiscovery.brokenBindings.push({
          route: pageModel.route,
          file: pageModel.relativePath,
          reason: 'no_runtime_call_detected'
        });
      }

      for (const response of matchedResponses) {
        results.apiDiscovery.active.push({
          route: pageModel.route,
          endpoint: normalizeEndpoint(response.url),
          status: response.status
        });

        if (response.status >= 400) {
          results.apiDiscovery.unreachable.push({
            route: pageModel.route,
            endpoint: normalizeEndpoint(response.url),
            status: response.status
          });
        }

        if (response.empty || response.suspect) {
          results.apiDiscovery.emptyOrSuspect.push({
            route: pageModel.route,
            endpoint: normalizeEndpoint(response.url),
            empty: response.empty,
            suspect: response.suspect,
            reason: response.payloadReason
          });
        }
      }
    }
  });
}

test('03. Error-state audit by forced network abort', async ({ page }) => {
  for (const pageModel of discoveredPages) {
    if (pageModel.endpoints.length === 0) {
      results.emptyErrorStates.push({
        route: pageModel.route,
        simulated: false,
        errorUiOk: true,
        reason: 'no_discovered_endpoint'
      });
      continue;
    }

    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (isLikelyApiUrl(url)) {
        return route.abort();
      }
      return route.continue();
    });

    await page.goto(`${BASE_URL}/#/salon/${DEFAULT_SALON_SLUG}/${pageModel.route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const bodyText = await page.locator('body').innerText();
    const errorUiOk = bodyText.trim().length > 0 && !hasCrashMarkers(bodyText);

    results.emptyErrorStates.push({
      route: pageModel.route,
      simulated: true,
      errorUiOk,
      reason: errorUiOk ? 'ui_survived_abort' : 'ui_crashed_on_abort'
    });

    await page.unroute('**/*');
  }
});

test.afterAll(async () => {
  ensureDir(REPORT_DIR);

  const pageSummaryByRoute = {};
  for (const item of results.pageRuntime) {
    if (!pageSummaryByRoute[item.route]) {
      pageSummaryByRoute[item.route] = [];
    }
    pageSummaryByRoute[item.route].push(item);
  }

  const endpointSummaryByName = {};
  for (const item of results.performance.endpointRuns) {
    const key = item.endpoint;
    if (!endpointSummaryByName[key]) endpointSummaryByName[key] = [];
    endpointSummaryByName[key].push(item.duration);
  }

  const slowPages = [];
  const unstablePages = [];
  const routeAuditLines = [];

  for (const [route, items] of Object.entries(pageSummaryByRoute)) {
    const pageTimes = items.map((item) => item.renderTime);
    const avgPageTime = mean(pageTimes);
    const maxPageTime = max(pageTimes);
    const minPageTime = min(pageTimes);

    const failures = items.filter((item) =>
      !item.uiOk ||
      item.consoleErrors.length > 0 ||
      item.requestFails.length > 0 ||
      !item.apiOk ||
      !item.contractOk ||
      item.slugMismatch
    );

    const warnings = items.filter((item) =>
      !item.expectedBlocksOk ||
      item.emptyResponseCount > 0 ||
      item.suspectResponseCount > 0
    );

    if (avgPageTime > 4000 || maxPageTime > 6000) {
      slowPages.push(`${route}(avg=${avgPageTime}ms,max=${maxPageTime}ms)`);
    }

    if (maxPageTime - minPageTime > 1500) {
      unstablePages.push(`${route}(min=${minPageTime}ms,max=${maxPageTime}ms)`);
    }

    routeAuditLines.push({
      route,
      avgPageTime,
      maxPageTime,
      minPageTime,
      failures: failures.length,
      warnings: warnings.length
    });
  }

  const slowEndpoints = [];
  const unstableEndpoints = [];

  for (const [endpoint, durations] of Object.entries(endpointSummaryByName)) {
    const avgTime = mean(durations);
    const maxTimeValue = max(durations);
    const minTimeValue = min(durations);

    if (avgTime > 1500 || maxTimeValue > 3000) {
      slowEndpoints.push(`${endpoint}(avg=${avgTime}ms,max=${maxTimeValue}ms)`);
    }

    if (maxTimeValue - minTimeValue > 1200) {
      unstableEndpoints.push(`${endpoint}(min=${minTimeValue}ms,max=${maxTimeValue}ms)`);
    }
  }

  const brokenBindings = uniqueBy(results.apiDiscovery.brokenBindings, (item) => `${item.route}:${item.file}:${item.reason}`);
  const emptyOrSuspect = uniqueBy(results.apiDiscovery.emptyOrSuspect, (item) => `${item.route}:${item.endpoint}:${item.reason}`);
  const hardcodedHits = uniqueBy(results.hardcodeAudit, (item) => `${item.file}:${item.line}:${item.pattern}`);
  const slugMismatches = uniqueBy(results.slugAudit.mismatches, (item) => `${item.run}:${item.route}:${item.hash}`);
  const odooRuntimeIssues = uniqueBy(
    results.odooBridge.runtimeChecks.filter((item) => !item.injectOk || !item.routeSlugOk),
    (item) => `${item.run}:${item.route}:${item.hash}`
  );
  const errorStateIssues = results.emptyErrorStates.filter((item) => !item.errorUiOk);
  const foreignRouteLeaks = results.navigation.filter((item) => item.foreignRouteLeak);
  const pageConsoleIssues = results.pageRuntime.filter((item) => item.consoleErrors.length > 0);
  const requestFailIssues = results.pageRuntime.filter((item) => item.requestFails.length > 0);
  const contractIssues = results.dataContracts.filter((item) => !item.contractOk);
  const uiIssues = results.pageRuntime.filter((item) => !item.uiOk);
  const warningBlockIssues = results.pageRuntime.filter((item) => !item.expectedBlocksOk);

  results.final.brokenChains = brokenBindings.length;
  results.final.emptyResponses = emptyOrSuspect.filter((item) => item.empty).length;
  results.final.suspectedStubs = emptyOrSuspect.filter((item) => item.suspect).length;
  results.final.slugMismatches = slugMismatches.length;
  results.final.odooIssues = odooRuntimeIssues.length;
  results.final.performanceIssues = slowPages.length + slowEndpoints.length + unstablePages.length + unstableEndpoints.length;

  const criticalIssueCount =
    brokenBindings.length +
    results.apiDiscovery.unreachable.length +
    requestFailIssues.length +
    pageConsoleIssues.length +
    contractIssues.length +
    slugMismatches.length +
    errorStateIssues.length +
    foreignRouteLeaks.length +
    uiIssues.length;

  const warningIssueCount =
    emptyOrSuspect.length +
    hardcodedHits.length +
    slowPages.length +
    slowEndpoints.length +
    unstablePages.length +
    unstableEndpoints.length +
    warningBlockIssues.length;

  results.final.failed = criticalIssueCount;
  results.final.warnings = warningIssueCount;
  results.final.passed =
    results.structure.files.length +
    results.coverageMatrix.length +
    results.apiDiscovery.active.length;

  const finalStatus = criticalIssueCount > 0 ? 'FAIL' : warningIssueCount > 0 ? 'WARNING' : 'PASS';

  const ts = nowIsoSafe();
  const reportPath = path.join(REPORT_DIR, `salon-full-audit-${ts}.txt`);

  const lines = [];
  lines.push('TOTEM SALON FULL AUDIT');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Base: ${BASE_URL}`);
  lines.push(`Slug: ${DEFAULT_SALON_SLUG}`);
  lines.push('');

  lines.push('=== 1. STRUCTURE AUDIT ===');
  lines.push(`Total directories: ${results.structure.directories.length}`);
  lines.push(`Total files: ${results.structure.files.length}`);
  lines.push(`Page files: ${results.structure.pageFiles.length}`);
  lines.push(`Support files: ${results.structure.supportFiles.length}`);
  lines.push(`Orphan files: ${results.structure.orphanFiles.length}`);
  lines.push(`Duplicate responsibility groups: ${results.structure.duplicateResponsibility.length}`);
  lines.push('');
  lines.push('Page files:');
  lines.push(formatList(results.structure.pageFiles, (item) => `- ${item}`));
  lines.push('');
  lines.push('Orphan files:');
  lines.push(formatList(results.structure.orphanFiles, (item) => `- ${item.file} | reason=${item.reason}`));
  lines.push('');
  lines.push('Duplicate responsibility:');
  lines.push(formatList(results.structure.duplicateResponsibility, (item) => `- route=${item.route} | count=${item.count} | files=${item.files.join(', ')}`));
  lines.push('');

  lines.push('=== 2. ROUTE AUDIT ===');
  lines.push(`Routes declared in App.jsx: ${results.structure.appRouteBindings.length}`);
  lines.push(`Discovered page routes: ${discoveredPages.length}`);
  lines.push('App route bindings:');
  lines.push(formatList(results.structure.appRouteBindings, (item) => `- ${item}`));
  lines.push('');
  lines.push('Runtime route summary:');
  lines.push(formatList(routeAuditLines.sort((a, b) => a.route.localeCompare(b.route)), (item) =>
    `- ${item.route} | avg=${item.avgPageTime}ms | min=${item.minPageTime}ms | max=${item.maxPageTime}ms | failures=${item.failures} | warnings=${item.warnings}`
  ));
  lines.push('');

  lines.push('=== 3. COVERAGE MATRIX ===');
  lines.push(formatList(results.coverageMatrix, (item) =>
    `- file=${item.file} | route=${item.route} | endpoints=${item.endpoints.length ? item.endpoints.join(', ') : 'none'} | slug_source=${item.slugSource} | odoo_bridge=${item.odooBridge} | status=${item.status}`
  ));
  lines.push('');

  lines.push('=== 4. API DISCOVERY AUDIT ===');
  lines.push(`Total discovered endpoints: ${results.apiDiscovery.discovered.length}`);
  lines.push(`Total active endpoint calls: ${results.apiDiscovery.active.length}`);
  lines.push(`Broken bindings: ${brokenBindings.length}`);
  lines.push(`Unreachable endpoints: ${results.apiDiscovery.unreachable.length}`);
  lines.push(`Empty or suspect endpoints: ${emptyOrSuspect.length}`);
  lines.push('');
  lines.push('Discovered endpoints:');
  lines.push(formatList(results.apiDiscovery.discovered, (item) => `- ${item}`));
  lines.push('');
  lines.push('Broken bindings:');
  lines.push(formatList(brokenBindings, (item) => `- route=${item.route} | file=${item.file} | reason=${item.reason}`));
  lines.push('');
  lines.push('Unreachable endpoints:');
  lines.push(formatList(results.apiDiscovery.unreachable, (item) => `- route=${item.route} | endpoint=${item.endpoint} | status=${item.status}`));
  lines.push('');
  lines.push('Empty or suspect endpoints:');
  lines.push(formatList(emptyOrSuspect, (item) => `- route=${item.route} | endpoint=${item.endpoint} | empty=${item.empty} | suspect=${item.suspect} | reason=${item.reason}`));
  lines.push('');

  lines.push('=== 5. PAGE RUNTIME AUDIT ===');
  lines.push(`Total runtime checks: ${results.pageRuntime.length}`);
  lines.push(formatList(results.pageRuntime, (item) =>
    `- run=${item.run} | route=${item.route} | ui_ok=${item.uiOk} | expected_blocks_ok=${item.expectedBlocksOk} | render=${item.renderTime}ms | console=${item.consoleErrors.length} | req_fail=${item.requestFails.length} | api_called=${item.apiCalled} | api_ok=${item.apiOk} | api_readable=${item.apiReadable} | contract_ok=${item.contractOk} | empty=${item.emptyResponseCount} | suspect=${item.suspectResponseCount} | slug_mismatch=${item.slugMismatch}`
  ));
  lines.push('');

  lines.push('=== 6. DATA CONTRACT AUDIT ===');
  lines.push(`Contract issues: ${contractIssues.length}`);
  lines.push(formatList(results.dataContracts, (item) =>
    `- run=${item.run} | route=${item.route} | contract_ok=${item.contractOk} | required=${item.requiredFields.join(', ') || 'none'} | missing=${
      item.checks.filter((check) => check.missing.length > 0).map((check) => check.missing.join('|')).join('; ') || 'none'
    }`
  ));
  lines.push('');

  lines.push('=== 7. EMPTY / ERROR STATE AUDIT ===');
  lines.push(`Error-state issues: ${errorStateIssues.length}`);
  lines.push(formatList(results.emptyErrorStates, (item) =>
    `- route=${item.route} | simulated=${item.simulated} | error_ui_ok=${item.errorUiOk} | reason=${item.reason}`
  ));
  lines.push('');

  lines.push('=== 8. SLUG AUDIT ===');
  lines.push(`Hardcoded slug hits: ${hardcodedHits.length}`);
  lines.push(`window.SALON_SLUG hits: ${results.slugAudit.windowSlugHits.length}`);
  lines.push(`Route slug hits: ${results.slugAudit.routeSlugHits.length}`);
  lines.push(`Slug mismatches: ${slugMismatches.length}`);
  lines.push('');
  lines.push('Hardcoded slug hits:');
  lines.push(formatList(hardcodedHits, (item) => `- ${item.file}:${item.line} | pattern=${item.pattern} | ${item.text}`));
  lines.push('');
  lines.push('Slug mismatches:');
  lines.push(formatList(slugMismatches, (item) => `- run=${item.run} | route=${item.route} | window_slug=${item.windowSalonSlug} | api_slugs=${item.apiSlugs.join(', ') || 'none'} | hash=${item.hash}`));
  lines.push('');

  lines.push('=== 9. ODOO BRIDGE AUDIT ===');
  lines.push(`Inject detected in code: ${results.odooBridge.injectDetectedInCode}`);
  lines.push(`Dev fallback detected: ${results.odooBridge.devFallbackDetected}`);
  lines.push(`Runtime inject issues: ${odooRuntimeIssues.length}`);
  lines.push('');
  lines.push('Inject hits:');
  lines.push(formatList(results.odooBridge.injectHits, (item) => `- ${item.file}:${item.line} | ${item.text}`));
  lines.push('');
  lines.push('Runtime checks:');
  lines.push(formatList(results.odooBridge.runtimeChecks, (item) =>
    `- run=${item.run} | route=${item.route} | window_slug=${item.windowSalonSlug} | inject_ok=${item.injectOk} | route_slug_ok=${item.routeSlugOk} | hash=${item.hash}`
  ));
  lines.push('');

  lines.push('=== 10. FINANCE CHAIN AUDIT ===');
  lines.push(formatList(results.financeChain, (item) =>
    `- run=${item.run} | route=${item.route} | api_called=${item.apiCalled} | api_ok=${item.apiOk} | contract_ok=${item.contractOk} | empty=${item.emptyResponseCount} | suspect=${item.suspectResponseCount}`
  ));
  lines.push('');

  lines.push('=== 11. NAVIGATION AUDIT ===');
  lines.push(`Foreign route leaks: ${foreignRouteLeaks.length}`);
  lines.push(formatList(results.navigation, (item) =>
    `- run=${item.run} | route=${item.route} | slug_persist_ok=${item.slugPersistOk} | foreign_route_leak=${item.foreignRouteLeak} | url=${item.url}`
  ));
  lines.push('');

  lines.push('=== 12. HARDCODE / DEV-ONLY AUDIT ===');
  lines.push(`Hardcoded findings: ${hardcodedHits.length}`);
  lines.push(`Dev fallback findings: ${results.slugAudit.fallbackHits.length}`);
  lines.push(formatList(results.slugAudit.fallbackHits, (item) => `- file=${item.file} | reason=${item.reason}`));
  lines.push('');

  lines.push('=== 13. PERFORMANCE AUDIT ===');
  lines.push(`Avg page time: ${mean(results.performance.pageRuns.map((item) => item.duration))}ms`);
  lines.push(`Max page time: ${max(results.performance.pageRuns.map((item) => item.duration))}ms`);
  lines.push(`Avg api time: ${mean(results.performance.endpointRuns.map((item) => item.duration))}ms`);
  lines.push(`Max api time: ${max(results.performance.endpointRuns.map((item) => item.duration))}ms`);
  lines.push(`Slow pages: ${slowPages.length}`);
  lines.push(`Slow endpoints: ${slowEndpoints.length}`);
  lines.push(`Unstable pages: ${unstablePages.length}`);
  lines.push(`Unstable endpoints: ${unstableEndpoints.length}`);
  lines.push('');
  lines.push('Slow pages:');
  lines.push(formatList(slowPages, (item) => `- ${item}`));
  lines.push('');
  lines.push('Slow endpoints:');
  lines.push(formatList(slowEndpoints, (item) => `- ${item}`));
  lines.push('');
  lines.push('Unstable pages:');
  lines.push(formatList(unstablePages, (item) => `- ${item}`));
  lines.push('');
  lines.push('Unstable endpoints:');
  lines.push(formatList(unstableEndpoints, (item) => `- ${item}`));
  lines.push('');

  lines.push('=== 14. FINAL PASS / FAIL MATRIX ===');
  lines.push(`Total files scanned: ${results.structure.files.length}`);
  lines.push(`Total pages discovered: ${discoveredPages.length}`);
  lines.push(`Total routes discovered: ${discoveredPages.length}`);
  lines.push(`Total endpoints discovered: ${results.apiDiscovery.discovered.length}`);
  lines.push(`Total endpoint calls checked: ${results.apiDiscovery.active.length}`);
  lines.push(`Passed markers: ${results.final.passed}`);
  lines.push(`Failed markers: ${results.final.failed}`);
  lines.push(`Warning markers: ${results.final.warnings}`);
  lines.push(`Broken chains: ${results.final.brokenChains}`);
  lines.push(`Empty responses: ${results.final.emptyResponses}`);
  lines.push(`Suspected stubs: ${results.final.suspectedStubs}`);
  lines.push(`Slug mismatches: ${results.final.slugMismatches}`);
  lines.push(`Odoo issues: ${results.final.odooIssues}`);
  lines.push(`Performance issues: ${results.final.performanceIssues}`);
  lines.push(`FINAL STATUS: ${finalStatus}`);
  lines.push('');

  const consoleSummaryLines = [
    '=== TOTEM SALON FULL AUDIT SUMMARY ===',
    `Files=${results.structure.files.length}`,
    `Pages=${discoveredPages.length}`,
    `Endpoints=${results.apiDiscovery.discovered.length}`,
    `Passed=${results.final.passed}`,
    `Failed=${results.final.failed}`,
    `Warnings=${results.final.warnings}`,
    `BrokenChains=${results.final.brokenChains}`,
    `EmptyResponses=${results.final.emptyResponses}`,
    `SuspectedStubs=${results.final.suspectedStubs}`,
    `SlugMismatches=${results.final.slugMismatches}`,
    `OdooIssues=${results.final.odooIssues}`,
    `AvgPageTime=${mean(results.performance.pageRuns.map((item) => item.duration))}ms`,
    `AvgApiTime=${mean(results.performance.endpointRuns.map((item) => item.duration))}ms`,
    `SlowPages=${slowPages.length}`,
    `SlowEndpoints=${slowEndpoints.length}`,
    `FINAL_STATUS=${finalStatus}`,
    `Saved to: ${reportPath}`,
    `Open report: notepad ${reportPath}`
  ];

  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');

  for (const line of consoleSummaryLines) {
    console.log(line);
  }
});