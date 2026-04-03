const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = process.env.TOTEM_QA_BASE || 'http://localhost:5173';
const SALON_SLUG = process.env.TOTEM_SALON_SLUG || 'totem-demo-salon';
const OUTPUT_DIR = path.join(process.cwd(), 'artifacts', 'salon-intermediate-audit');

const ODOO_URL_PATTERNS = [
  'https://www.totemv.com/odoo/',
  '/odoo/salon/'
];

const ODOO_CONSOLE_PATTERNS = [
  'ODOO BRIDGE ERROR',
  'blocked by CORS policy',
  "No 'Access-Control-Allow-Origin' header",
  'Failed to load resource: net::ERR_FAILED'
];

const salonRoutes = [
  { route: 'dashboard', path: `/#/salon/${SALON_SLUG}/dashboard` },
  { route: 'masters', path: `/#/salon/${SALON_SLUG}/masters` },
  { route: 'bookings', path: `/#/salon/${SALON_SLUG}/bookings` },
  { route: 'calendar', path: `/#/salon/${SALON_SLUG}/calendar` },
  { route: 'clients', path: `/#/salon/${SALON_SLUG}/clients` },
  { route: 'services', path: `/#/salon/${SALON_SLUG}/services` },
  { route: 'settings', path: `/#/salon/${SALON_SLUG}/settings` },
  { route: 'finance', path: `/#/salon/${SALON_SLUG}/finance` },
  { route: 'money', path: `/#/salon/${SALON_SLUG}/money` },
  { route: 'transactions', path: `/#/salon/${SALON_SLUG}/transactions` },
  { route: 'settlements', path: `/#/salon/${SALON_SLUG}/settlements` },
  { route: 'payouts', path: `/#/salon/${SALON_SLUG}/payouts` },
  { route: 'contracts', path: `/#/salon/${SALON_SLUG}/contracts` }
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function dedupe(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function trimList(arr, max = 10) {
  return dedupe(arr).slice(0, max);
}

function isOdooUrl(url) {
  const value = String(url || '');
  return ODOO_URL_PATTERNS.some((pattern) => value.includes(pattern));
}

function isOdooConsoleMessage(text) {
  const value = String(text || '');
  return ODOO_CONSOLE_PATTERNS.some((pattern) => value.includes(pattern)) || isOdooUrl(value);
}

function classifyResult(row) {
  const issues = [];

  if (row.navError) issues.push('nav_error');
  if (row.hasReactCrash) issues.push('react_crash');
  if (row.consoleErrors.length) issues.push('console_errors');
  if (row.pageErrors.length) issues.push('page_errors');
  if (row.failedRequests.length) issues.push('failed_requests');
  if (row.badResponses.length) issues.push('bad_http');
  if (row.bodyLength <= 120) issues.push('low_body');
  if (row.divs <= 8) issues.push('low_divs');
  if (row.duration >= 12000) issues.push('slow_critical');

  const isHardFail =
    Boolean(row.navError) ||
    row.hasReactCrash ||
    row.pageErrors.length > 0 ||
    row.failedRequests.length > 0 ||
    row.badResponses.length > 0;

  const isSoftFail =
    row.consoleErrors.length > 0 ||
    row.bodyLength <= 120 ||
    row.divs <= 8 ||
    row.duration >= 12000 ||
    row.headings <= 0;

  let status = 'PASS';
  if (isHardFail) {
    status = 'FAIL';
  } else if (isSoftFail) {
    status = 'WARN';
  }

  return { status, issues };
}

function generateCases() {
  const cases = [];

  for (let run = 1; run <= 3; run += 1) {
    for (const entry of salonRoutes) {
      cases.push({
        name: `salon ${entry.route} run ${run}`,
        route: entry.route,
        run,
        path: entry.path,
        globals: { SALON_SLUG }
      });
    }
  }

  cases.push({
    name: 'salon root redirect',
    route: 'root-redirect',
    run: 1,
    path: `/#/salon/${SALON_SLUG}`,
    globals: { SALON_SLUG }
  });

  return cases;
}

const CASES = generateCases();
const RESULTS = [];

async function auditPage(page, entry) {
  const consoleErrors = [];
  const ignoredOdooConsoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const ignoredOdooFailedRequests = [];
  const badResponses = [];
  const ignoredOdooBadResponses = [];

  const onConsole = (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (isOdooConsoleMessage(text)) {
      ignoredOdooConsoleErrors.push(text);
      return;
    }
    consoleErrors.push(text);
  };

  const onPageError = (err) => {
    const text = err && err.message ? err.message : String(err);
    if (isOdooConsoleMessage(text)) {
      ignoredOdooConsoleErrors.push(text);
      return;
    }
    pageErrors.push(text);
  };

  const onRequestFailed = (req) => {
    const text = `${req.method()} ${req.url()}`;
    if (isOdooUrl(req.url())) {
      ignoredOdooFailedRequests.push(text);
      return;
    }
    failedRequests.push(text);
  };

  const onResponse = (res) => {
    if (res.status() < 400) return;
    const text = `${res.status()} ${res.url()}`;
    if (isOdooUrl(res.url())) {
      ignoredOdooBadResponses.push(text);
      return;
    }
    badResponses.push(text);
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);

  await page.addInitScript((globals) => {
    if (globals.SALON_SLUG) window.SALON_SLUG = globals.SALON_SLUG;
  }, entry.globals);

  const startedAt = Date.now();
  let navError = null;
  let finalUrl = '';
  let body = '';
  let divs = 0;
  let headings = 0;
  let buttons = 0;
  let title = '';

  try {
    await page.goto(`${BASE}${entry.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('body', { timeout: 5000 });
    await page.waitForTimeout(1500);

    finalUrl = page.url();
    title = await page.title();
    body = await page.locator('body').innerText();
    divs = await page.locator('div').count();
    headings = await page.locator('h1,h2,h3,[role="heading"]').count();
    buttons = await page.locator('button').count();
  } catch (error) {
    navError = error && error.message ? error.message : String(error);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('requestfailed', onRequestFailed);
    page.off('response', onResponse);
  }

  const duration = Date.now() - startedAt;
  const slow = duration > 12000;
  const bodyText = body || '';
  const hasReactCrash = /Minified React error|Something went wrong|No routes matched location/i.test(bodyText);
  const hasVisibleEmpty = /пусто|нет данных|ничего не найдено|список пуст/i.test(bodyText);

  const result = {
    name: entry.name,
    route: entry.route,
    run: entry.run,
    url: `${BASE}${entry.path}`,
    finalUrl,
    title,
    duration,
    slow,
    navError,
    bodyLength: bodyText.length,
    divs,
    headings,
    buttons,
    hasReactCrash,
    hasVisibleEmpty,
    consoleErrors: trimList(consoleErrors, 20),
    pageErrors: trimList(pageErrors, 20),
    failedRequests: trimList(failedRequests, 20),
    badResponses: trimList(badResponses, 20),
    ignoredOdooConsoleErrors: trimList(ignoredOdooConsoleErrors, 20),
    ignoredOdooFailedRequests: trimList(ignoredOdooFailedRequests, 20),
    ignoredOdooBadResponses: trimList(ignoredOdooBadResponses, 20)
  };

  const classification = classifyResult(result);
  result.status = classification.status;
  result.issues = classification.issues;

  RESULTS.push(result);

  console.log(
    `LOAD ${entry.name}: ${duration}ms | ${result.status}${result.issues.length ? ` | ${result.issues.join(',')}` : ''} | ignored_odoo_console=${result.ignoredOdooConsoleErrors.length} | ignored_odoo_req=${result.ignoredOdooFailedRequests.length}`
  );
}

function writeReports() {
  ensureDir(OUTPUT_DIR);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const txtPath = path.join(OUTPUT_DIR, `salon-intermediate-summary-${stamp}.txt`);
  const csvPath = path.join(OUTPUT_DIR, `salon-intermediate-results-${stamp}.csv`);

  const grouped = {};

  for (const row of RESULTS) {
    if (!grouped[row.route]) {
      grouped[row.route] = {
        route: row.route,
        total: 0,
        fail: 0,
        warn: 0,
        pass: 0,
        slow: 0,
        totalDuration: 0,
        maxDuration: 0,
        consoleErrors: 0,
        pageErrors: 0,
        failedRequests: 0,
        badResponses: 0,
        visibleEmpty: 0,
        ignoredOdooConsoleErrors: 0,
        ignoredOdooFailedRequests: 0,
        ignoredOdooBadResponses: 0
      };
    }

    const bucket = grouped[row.route];
    bucket.total += 1;
    bucket.fail += row.status === 'FAIL' ? 1 : 0;
    bucket.warn += row.status === 'WARN' ? 1 : 0;
    bucket.pass += row.status === 'PASS' ? 1 : 0;
    bucket.slow += row.slow ? 1 : 0;
    bucket.totalDuration += row.duration;
    bucket.maxDuration = Math.max(bucket.maxDuration, row.duration);
    bucket.consoleErrors += row.consoleErrors.length;
    bucket.pageErrors += row.pageErrors.length;
    bucket.failedRequests += row.failedRequests.length;
    bucket.badResponses += row.badResponses.length;
    bucket.visibleEmpty += row.hasVisibleEmpty ? 1 : 0;
    bucket.ignoredOdooConsoleErrors += row.ignoredOdooConsoleErrors.length;
    bucket.ignoredOdooFailedRequests += row.ignoredOdooFailedRequests.length;
    bucket.ignoredOdooBadResponses += row.ignoredOdooBadResponses.length;
  }

  const summaryRows = Object.values(grouped)
    .map((item) => ({
      ...item,
      avgDuration: Math.round(item.totalDuration / item.total)
    }))
    .sort((a, b) => {
      if (b.fail !== a.fail) return b.fail - a.fail;
      if (b.warn !== a.warn) return b.warn - a.warn;
      if (b.slow !== a.slow) return b.slow - a.slow;
      return b.avgDuration - a.avgDuration;
    });

  const failedRuns = RESULTS.filter((row) => row.status === 'FAIL');
  const warnedRuns = RESULTS.filter((row) => row.status === 'WARN');

  const txt = [];
  txt.push('TOTEM SALON INTERMEDIATE AUDIT (ODOO EXCLUDED)');
  txt.push(`Generated: ${new Date().toISOString()}`);
  txt.push(`Base: ${BASE}`);
  txt.push(`Salon slug: ${SALON_SLUG}`);
  txt.push(`Total cases: ${RESULTS.length}`);
  txt.push(`FAIL cases: ${failedRuns.length}`);
  txt.push(`WARN cases: ${warnedRuns.length}`);
  txt.push('');
  txt.push('NOTE: Odoo bridge console/request/HTTP noise is excluded from fail classification.');
  txt.push('');
  txt.push('=== ROUTE SUMMARY ===');

  for (const row of summaryRows) {
    txt.push(
      `${row.route} | fail=${row.fail}/${row.total} | warn=${row.warn}/${row.total} | pass=${row.pass}/${row.total} | slow=${row.slow}/${row.total} | avg=${row.avgDuration}ms | max=${row.maxDuration}ms | console=${row.consoleErrors} | page=${row.pageErrors} | req_fail=${row.failedRequests} | bad_http=${row.badResponses} | visible_empty=${row.visibleEmpty} | ignored_odoo_console=${row.ignoredOdooConsoleErrors} | ignored_odoo_req_fail=${row.ignoredOdooFailedRequests} | ignored_odoo_bad_http=${row.ignoredOdooBadResponses}`
    );
  }

  txt.push('');
  txt.push('=== FAIL DETAILS ===');
  if (failedRuns.length === 0) {
    txt.push('No FAIL cases.');
  } else {
    for (const row of failedRuns) {
      txt.push(`${row.name} | status=${row.status} | issues=${row.issues.join(',') || '-'} | duration=${row.duration}ms | final=${row.finalUrl || '-'}`);
      if (row.navError) txt.push(`  navError: ${row.navError}`);
      if (row.consoleErrors.length) txt.push(`  consoleErrors: ${row.consoleErrors.join(' || ')}`);
      if (row.pageErrors.length) txt.push(`  pageErrors: ${row.pageErrors.join(' || ')}`);
      if (row.failedRequests.length) txt.push(`  failedRequests: ${row.failedRequests.join(' || ')}`);
      if (row.badResponses.length) txt.push(`  badResponses: ${row.badResponses.join(' || ')}`);
      txt.push(`  bodyLength=${row.bodyLength} divs=${row.divs} headings=${row.headings} buttons=${row.buttons}`);
      if (row.ignoredOdooConsoleErrors.length) txt.push(`  ignoredOdooConsoleErrors: ${row.ignoredOdooConsoleErrors.join(' || ')}`);
      if (row.ignoredOdooFailedRequests.length) txt.push(`  ignoredOdooFailedRequests: ${row.ignoredOdooFailedRequests.join(' || ')}`);
      if (row.ignoredOdooBadResponses.length) txt.push(`  ignoredOdooBadResponses: ${row.ignoredOdooBadResponses.join(' || ')}`);
    }
  }

  txt.push('');
  txt.push('=== WARN DETAILS ===');
  if (warnedRuns.length === 0) {
    txt.push('No WARN cases.');
  } else {
    for (const row of warnedRuns) {
      txt.push(`${row.name} | status=${row.status} | issues=${row.issues.join(',') || '-'} | duration=${row.duration}ms | final=${row.finalUrl || '-'} | bodyLength=${row.bodyLength} | divs=${row.divs} | headings=${row.headings} | buttons=${row.buttons}`);
      if (row.consoleErrors.length) txt.push(`  consoleErrors: ${row.consoleErrors.join(' || ')}`);
      if (row.ignoredOdooConsoleErrors.length) txt.push(`  ignoredOdooConsoleErrors: ${row.ignoredOdooConsoleErrors.join(' || ')}`);
    }
  }

  txt.push('');
  txt.push('=== SLOWEST CASES TOP 10 ===');
  const slowest = [...RESULTS].sort((a, b) => b.duration - a.duration).slice(0, 10);
  for (const row of slowest) {
    txt.push(`${row.name} | status=${row.status} | duration=${row.duration}ms | issues=${row.issues.join(',') || '-'} | final=${row.finalUrl || '-'}`);
  }

  fs.writeFileSync(txtPath, txt.join('\n'), 'utf8');

  const csvHeader = [
    'name','route','run','status','issues','url','finalUrl','title','duration','slow','navError','bodyLength','divs','headings','buttons','hasReactCrash','hasVisibleEmpty','consoleErrors','pageErrors','failedRequests','badResponses','ignoredOdooConsoleErrors','ignoredOdooFailedRequests','ignoredOdooBadResponses'
  ];

  const csvRows = [csvHeader.join(',')];
  for (const row of RESULTS) {
    csvRows.push([
      csvEscape(row.name), csvEscape(row.route), csvEscape(row.run), csvEscape(row.status), csvEscape(row.issues.join('|')), csvEscape(row.url), csvEscape(row.finalUrl), csvEscape(row.title), csvEscape(row.duration), csvEscape(row.slow), csvEscape(row.navError), csvEscape(row.bodyLength), csvEscape(row.divs), csvEscape(row.headings), csvEscape(row.buttons), csvEscape(row.hasReactCrash), csvEscape(row.hasVisibleEmpty), csvEscape(row.consoleErrors.join(' || ')), csvEscape(row.pageErrors.join(' || ')), csvEscape(row.failedRequests.join(' || ')), csvEscape(row.badResponses.join(' || ')), csvEscape(row.ignoredOdooConsoleErrors.join(' || ')), csvEscape(row.ignoredOdooFailedRequests.join(' || ')), csvEscape(row.ignoredOdooBadResponses.join(' || '))
    ].join(','));
  }

  fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf8');

  console.log('');
  console.log('REPORT READY');
  console.log(`TXT: ${txtPath}`);
  console.log(`CSV: ${csvPath}`);
}

test.afterAll(async () => {
  writeReports();
});

test.describe('TOTEM SALON INTERMEDIATE AUDIT (ODOO EXCLUDED)', () => {
  for (const entry of CASES) {
    test(entry.name, async ({ page }) => {
      await auditPage(page, entry);
    });
  }
});
