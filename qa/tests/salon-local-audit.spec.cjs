const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = process.env.TOTEM_QA_BASE || 'http://localhost:5173';
const SALON_SLUG = 'totem-demo-salon';

const OUTPUT_DIR = path.join(process.cwd(), 'artifacts', 'salon-local-audit');

const salonRoutes = [
  'dashboard',
  'masters',
  'bookings',
  'calendar',
  'finance',
  'services',
  'clients',
  'settings',
  'money',
  'settlements',
  'payouts',
  'transactions',
  'contracts'
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function generateCases() {
  const cases = [];

  for (let i = 1; i <= 3; i++) {
    for (const route of salonRoutes) {
      cases.push({
        name: `salon ${route} run ${i}`,
        side: 'salon',
        route,
        run: i,
        url: `${BASE}/#/salon/${SALON_SLUG}/${route}`
      });
    }
  }

  return cases;
}

const CASES = generateCases();
const RESULTS = [];

function isIgnoredConsoleError(text) {
  const value = String(text || '');

  if (value.includes('TOTEM SDK: Unable to resolve platform context')) return true;
  if (value.includes('ODOO BRIDGE ERROR TypeError: Failed to fetch')) return true;
  if (value.includes('Access to fetch at \'https://www.totemv.com/odoo/salon/')) return true;
  if (value.includes('Failed to load resource: net::ERR_FAILED')) return true;
  if (value.includes('Failed to load resource: the server responded with a status of 404 (Not Found)')) return true;

  return false;
}

function isIgnoredFailedRequest(text) {
  const value = String(text || '');

  if (value.includes('https://www.totemv.com/odoo/salon/')) return true;
  if (value.includes('favicon.ico')) return true;

  return false;
}

function isIgnoredBadResponse(text) {
  const value = String(text || '');

  if (value.includes('favicon.ico')) return true;

  return false;
}

async function collectAudit(page, entry) {
  const rawConsoleErrors = [];
  const rawConsoleWarnings = [];
  const rawPageErrors = [];
  const rawFailedRequests = [];
  const rawBadResponses = [];

  const onConsole = (msg) => {
    if (msg.type() === 'error') {
      rawConsoleErrors.push(msg.text());
    }
    if (msg.type() === 'warning') {
      rawConsoleWarnings.push(msg.text());
    }
  };

  const onPageError = (err) => {
    rawPageErrors.push(err && err.message ? err.message : String(err));
  };

  const onRequestFailed = (req) => {
    rawFailedRequests.push(`${req.method()} ${req.url()}`);
  };

  const onResponse = (res) => {
    if (res.status() >= 400) {
      rawBadResponses.push(`${res.status()} ${res.url()}`);
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);

  const startedAt = Date.now();

  let gotoError = null;
  let bodyReadError = null;
  let finalUrl = '';
  let title = '';
  let bodyText = '';
  let divCount = 0;

  try {
    await page.goto(entry.url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForTimeout(1500);

    finalUrl = page.url();

    try {
      await page.locator('body').waitFor({ state: 'attached', timeout: 5000 });
      bodyText = await page.locator('body').innerText();
      divCount = await page.locator('div').count();
      title = await page.title();
    } catch (innerError) {
      bodyReadError = innerError && innerError.message ? innerError.message : String(innerError);
    }
  } catch (error) {
    gotoError = error && error.message ? error.message : String(error);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('requestfailed', onRequestFailed);
    page.off('response', onResponse);
  }

  const consoleErrors = rawConsoleErrors.filter((item) => !isIgnoredConsoleError(item));
  const consoleWarnings = rawConsoleWarnings;
  const pageErrors = rawPageErrors;
  const failedRequests = rawFailedRequests.filter((item) => !isIgnoredFailedRequest(item));
  const badResponses = rawBadResponses.filter((item) => !isIgnoredBadResponse(item));

  const ignoredConsoleErrors = rawConsoleErrors.filter((item) => isIgnoredConsoleError(item));
  const ignoredFailedRequests = rawFailedRequests.filter((item) => isIgnoredFailedRequest(item));
  const ignoredBadResponses = rawBadResponses.filter((item) => isIgnoredBadResponse(item));

  const duration = Date.now() - startedAt;
  const isSlow = duration > 15000;

  const hasUrl = finalUrl.includes(`/#/salon/${SALON_SLUG}/`);
  const hasBody = bodyText.length > 200;
  const hasDivs = divCount > 10;

  const status =
    gotoError ||
    bodyReadError ||
    !hasUrl ||
    !hasBody ||
    !hasDivs ||
    consoleErrors.length > 0 ||
    pageErrors.length > 0 ||
    failedRequests.length > 0 ||
    badResponses.length > 0
      ? 'FAIL'
      : 'PASS';

  const result = {
    name: entry.name,
    side: entry.side,
    route: entry.route,
    run: entry.run,
    url: entry.url,
    finalUrl,
    title,
    duration,
    isSlow,
    status,
    gotoError,
    bodyReadError,
    bodyLength: bodyText.length,
    divCount,
    hasUrl,
    hasBody,
    hasDivs,
    consoleErrors,
    consoleWarnings,
    pageErrors,
    failedRequests,
    badResponses,
    ignoredConsoleErrors,
    ignoredFailedRequests,
    ignoredBadResponses
  };

  RESULTS.push(result);

  console.log(
    `${status} | ${entry.name} | ${duration}ms | body=${bodyText.length} | divs=${divCount} | console=${consoleErrors.length} | req=${failedRequests.length}`
  );
}

function writeReports() {
  ensureDir(OUTPUT_DIR);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const txtPath = path.join(OUTPUT_DIR, `salon-local-audit-summary-${stamp}.txt`);
  const csvPath = path.join(OUTPUT_DIR, `salon-local-audit-results-${stamp}.csv`);
  const jsonPath = path.join(OUTPUT_DIR, `salon-local-audit-results-${stamp}.json`);

  const grouped = {};

  for (const row of RESULTS) {
    const key = row.route;

    if (!grouped[key]) {
      grouped[key] = {
        route: row.route,
        total: 0,
        pass: 0,
        fail: 0,
        slow: 0,
        totalDuration: 0,
        maxDuration: 0,
        consoleErrors: 0,
        pageErrors: 0,
        failedRequests: 0,
        badResponses: 0,
        ignoredConsoleErrors: 0,
        ignoredFailedRequests: 0,
        ignoredBadResponses: 0
      };
    }

    const bucket = grouped[key];
    bucket.total += 1;
    bucket.pass += row.status === 'PASS' ? 1 : 0;
    bucket.fail += row.status === 'FAIL' ? 1 : 0;
    bucket.slow += row.isSlow ? 1 : 0;
    bucket.totalDuration += row.duration;
    bucket.maxDuration = Math.max(bucket.maxDuration, row.duration);
    bucket.consoleErrors += row.consoleErrors.length;
    bucket.pageErrors += row.pageErrors.length;
    bucket.failedRequests += row.failedRequests.length;
    bucket.badResponses += row.badResponses.length;
    bucket.ignoredConsoleErrors += row.ignoredConsoleErrors.length;
    bucket.ignoredFailedRequests += row.ignoredFailedRequests.length;
    bucket.ignoredBadResponses += row.ignoredBadResponses.length;
  }

  const summaryRows = Object.values(grouped)
    .map((item) => ({
      ...item,
      avgDuration: Math.round(item.totalDuration / item.total)
    }))
    .sort((a, b) => {
      if (b.fail !== a.fail) return b.fail - a.fail;
      if (b.slow !== a.slow) return b.slow - a.slow;
      return b.avgDuration - a.avgDuration;
    });

  const failedRuns = RESULTS.filter((row) => row.status === 'FAIL');
  const slowRuns = RESULTS.filter((row) => row.isSlow).sort((a, b) => b.duration - a.duration);

  const txt = [];
  txt.push('TOTEM SALON LOCAL AUDIT SUMMARY');
  txt.push(`Generated: ${new Date().toISOString()}`);
  txt.push(`Base: ${BASE}`);
  txt.push(`Slug: ${SALON_SLUG}`);
  txt.push(`Total cases: ${RESULTS.length}`);
  txt.push(`Pass: ${RESULTS.filter((row) => row.status === 'PASS').length}`);
  txt.push(`Fail: ${failedRuns.length}`);
  txt.push('');

  txt.push('=== ROUTE SUMMARY ===');
  for (const row of summaryRows) {
    txt.push(
      `${row.route} | pass=${row.pass}/${row.total} | fail=${row.fail}/${row.total} | slow=${row.slow}/${row.total} | avg=${row.avgDuration}ms | max=${row.maxDuration}ms | console=${row.consoleErrors} | page=${row.pageErrors} | req_fail=${row.failedRequests} | bad_http=${row.badResponses} | ignored_console=${row.ignoredConsoleErrors} | ignored_req=${row.ignoredFailedRequests}`
    );
  }

  txt.push('');
  txt.push('=== FAILED RUNS ===');
  failedRuns.forEach((row) => {
    txt.push(
      `${row.name} | url=${row.url} | final=${row.finalUrl || '-'} | goto=${row.gotoError || '-'} | bodyRead=${row.bodyReadError || '-'} | body=${row.bodyLength} | divs=${row.divCount} | console=${row.consoleErrors.length} | page=${row.pageErrors.length} | req_fail=${row.failedRequests.length} | bad_http=${row.badResponses.length}`
    );

    if (row.consoleErrors.length) {
      txt.push(`  consoleErrors: ${row.consoleErrors.join(' || ')}`);
    }
    if (row.pageErrors.length) {
      txt.push(`  pageErrors: ${row.pageErrors.join(' || ')}`);
    }
    if (row.failedRequests.length) {
      txt.push(`  failedRequests: ${row.failedRequests.join(' || ')}`);
    }
    if (row.badResponses.length) {
      txt.push(`  badResponses: ${row.badResponses.join(' || ')}`);
    }
  });

  txt.push('');
  txt.push('=== IGNORED LOCAL NOISE ===');
  RESULTS.forEach((row) => {
    if (
      row.ignoredConsoleErrors.length ||
      row.ignoredFailedRequests.length ||
      row.ignoredBadResponses.length
    ) {
      txt.push(
        `${row.name} | ignored_console=${row.ignoredConsoleErrors.length} | ignored_req=${row.ignoredFailedRequests.length} | ignored_http=${row.ignoredBadResponses.length}`
      );
    }
  });

  txt.push('');
  txt.push('=== TOP SLOW ===');
  slowRuns.slice(0, 20).forEach((row) => {
    txt.push(`${row.name} | ${row.duration}ms | ${row.url}`);
  });

  fs.writeFileSync(txtPath, txt.join('\n'), 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(RESULTS, null, 2), 'utf8');

  const csv = [];
  csv.push([
    'name',
    'side',
    'route',
    'run',
    'status',
    'url',
    'finalUrl',
    'duration',
    'isSlow',
    'gotoError',
    'bodyReadError',
    'bodyLength',
    'divCount',
    'hasUrl',
    'hasBody',
    'hasDivs',
    'consoleErrors',
    'pageErrors',
    'failedRequests',
    'badResponses',
    'ignoredConsoleErrors',
    'ignoredFailedRequests',
    'ignoredBadResponses'
  ].join(','));

  for (const row of RESULTS) {
    csv.push([
      csvEscape(row.name),
      csvEscape(row.side),
      csvEscape(row.route),
      row.run,
      csvEscape(row.status),
      csvEscape(row.url),
      csvEscape(row.finalUrl),
      row.duration,
      row.isSlow,
      csvEscape(row.gotoError || ''),
      csvEscape(row.bodyReadError || ''),
      row.bodyLength,
      row.divCount,
      row.hasUrl,
      row.hasBody,
      row.hasDivs,
      row.consoleErrors.length,
      row.pageErrors.length,
      row.failedRequests.length,
      row.badResponses.length,
      row.ignoredConsoleErrors.length,
      row.ignoredFailedRequests.length,
      row.ignoredBadResponses.length
    ].join(','));
  }

  fs.writeFileSync(csvPath, csv.join('\n'), 'utf8');

  console.log('');
  console.log('REPORT READY');
  console.log(`TXT: ${txtPath}`);
  console.log(`CSV: ${csvPath}`);
  console.log(`JSON: ${jsonPath}`);
  console.log('');
}

test.describe('TOTEM SALON LOCAL AUDIT', () => {
  for (const entry of CASES) {
    test(entry.name, async ({ page }) => {
      await collectAudit(page, entry);
    });
  }

  test.afterAll(async () => {
    writeReports();
  });
});