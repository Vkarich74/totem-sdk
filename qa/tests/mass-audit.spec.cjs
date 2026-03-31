const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = process.env.TOTEM_QA_BASE || 'http://localhost:5173';
const SALON_SLUG = 'totem-demo-salon';
const MASTER_SLUG = 'totem-demo-master';

const OUTPUT_DIR = path.join(process.cwd(), 'artifacts', 'mass-audit');

const salonRoutes = [
  'dashboard',
  'masters',
  'bookings',
  'calendar',
  'finance',
  'services',
  'clients',
  'settings'
];

const masterRoutes = [
  'dashboard',
  'bookings',
  'clients',
  'schedule',
  'finance',
  'services',
  'settings'
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

  for (let i = 1; i <= 5; i++) {
    for (const route of salonRoutes) {
      cases.push({
        name: `salon ${route} run ${i}`,
        side: 'salon',
        route,
        run: i,
        path: `/#/salon/${SALON_SLUG}/${route}`,
        globals: { SALON_SLUG }
      });
    }
  }

  for (let i = 1; i <= 5; i++) {
    for (const route of masterRoutes) {
      cases.push({
        name: `master ${route} run ${i}`,
        side: 'master',
        route,
        run: i,
        path: `/#/master/${route}`,
        globals: { MASTER_SLUG }
      });
    }
  }

  for (let i = 1; i <= 5; i++) {
    cases.push({
      name: `bootstrap salon ${i}`,
      side: 'bootstrap',
      route: 'salon-dashboard',
      run: i,
      path: `/#/salon/${SALON_SLUG}/dashboard`,
      globals: { SALON_SLUG }
    });

    cases.push({
      name: `bootstrap master ${i}`,
      side: 'bootstrap',
      route: 'master-dashboard',
      run: i,
      path: `/#/master/dashboard`,
      globals: { MASTER_SLUG }
    });

    cases.push({
      name: `root ${i}`,
      side: 'root',
      route: 'root',
      run: i,
      path: '/#/',
      globals: { SALON_SLUG }
    });
  }

  return cases;
}

const CASES = generateCases();
const RESULTS = [];

async function auditPage(page, entry) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const badResponses = [];

  const onConsole = (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  };

  const onPageError = (err) => {
    pageErrors.push(err && err.message ? err.message : String(err));
  };

  const onRequestFailed = (req) => {
    failedRequests.push(`${req.method()} ${req.url()}`);
  };

  const onResponse = (res) => {
    if (res.status() >= 400) {
      badResponses.push(`${res.status()} ${res.url()}`);
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);

  await page.addInitScript((globals) => {
    if (globals.SALON_SLUG) window.SALON_SLUG = globals.SALON_SLUG;
    if (globals.MASTER_SLUG) window.MASTER_SLUG = globals.MASTER_SLUG;
  }, entry.globals);

  const startedAt = Date.now();
  let navError = null;
  let finalUrl = '';
  let body = '';
  let divs = 0;

  try {
    await page.goto(`${BASE}${entry.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('body', { timeout: 5000 });
    await page.waitForTimeout(1000);

    finalUrl = page.url();
    body = await page.locator('body').innerText();
    divs = await page.locator('div').count();
  } catch (error) {
    navError = error && error.message ? error.message : String(error);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('requestfailed', onRequestFailed);
    page.off('response', onResponse);
  }

  const duration = Date.now() - startedAt;
  const slow = duration > 15000;

  const result = {
    name: entry.name,
    side: entry.side,
    route: entry.route,
    run: entry.run,
    url: `${BASE}${entry.path}`,
    finalUrl,
    duration,
    slow,
    navError,
    bodyLength: body.length,
    divs,
    consoleErrors,
    pageErrors,
    failedRequests,
    badResponses
  };

  RESULTS.push(result);

  console.log(`LOAD ${entry.name}: ${duration}ms`);

  if (slow) {
    console.log(`SLOW PAGE DETECTED: ${entry.name} -> ${duration}ms`);
  }

  expect.soft(navError).toBeNull();
  expect.soft(body.length).toBeGreaterThan(100);
  expect.soft(divs).toBeGreaterThan(5);
  expect.soft(consoleErrors.length).toBe(0);
  expect.soft(pageErrors.length).toBe(0);
  expect.soft(failedRequests.length).toBe(0);
  expect.soft(badResponses.length).toBe(0);
  expect.soft(duration).toBeLessThan(15000);
}

function writeReports() {
  ensureDir(OUTPUT_DIR);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const txtPath = path.join(OUTPUT_DIR, `mass-audit-summary-${stamp}.txt`);
  const csvPath = path.join(OUTPUT_DIR, `mass-audit-results-${stamp}.csv`);

  const grouped = {};

  for (const row of RESULTS) {
    const key = `${row.side}:${row.route}`;
    if (!grouped[key]) {
      grouped[key] = {
        side: row.side,
        route: row.route,
        total: 0,
        failed: 0,
        slow: 0,
        totalDuration: 0,
        maxDuration: 0,
        consoleErrors: 0,
        pageErrors: 0,
        failedRequests: 0,
        badResponses: 0
      };
    }

    const bucket = grouped[key];
    bucket.total += 1;
    bucket.totalDuration += row.duration;
    bucket.maxDuration = Math.max(bucket.maxDuration, row.duration);
    bucket.failed += row.navError || row.consoleErrors.length || row.pageErrors.length || row.failedRequests.length || row.badResponses.length || row.bodyLength <= 100 || row.divs <= 5 || row.duration >= 15000 ? 1 : 0;
    bucket.slow += row.slow ? 1 : 0;
    bucket.consoleErrors += row.consoleErrors.length;
    bucket.pageErrors += row.pageErrors.length;
    bucket.failedRequests += row.failedRequests.length;
    bucket.badResponses += row.badResponses.length;
  }

  const summaryRows = Object.values(grouped)
    .map((item) => ({
      ...item,
      avgDuration: Math.round(item.totalDuration / item.total)
    }))
    .sort((a, b) => {
      if (b.failed !== a.failed) return b.failed - a.failed;
      if (b.slow !== a.slow) return b.slow - a.slow;
      return b.avgDuration - a.avgDuration;
    });

  const failedRuns = RESULTS.filter((row) =>
    row.navError ||
    row.consoleErrors.length ||
    row.pageErrors.length ||
    row.failedRequests.length ||
    row.badResponses.length ||
    row.bodyLength <= 100 ||
    row.divs <= 5 ||
    row.duration >= 15000
  );

  const slowRuns = [...RESULTS]
    .filter((row) => row.slow)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 30);

  const txt = [];
  txt.push('TOTEM MASS AUDIT SUMMARY');
  txt.push(`Generated: ${new Date().toISOString()}`);
  txt.push(`Base: ${BASE}`);
  txt.push(`Total cases: ${RESULTS.length}`);
  txt.push(`Failed cases: ${failedRuns.length}`);
  txt.push('');

  txt.push('=== ROUTE SUMMARY ===');
  for (const row of summaryRows) {
    txt.push(
      `${row.side} ${row.route} | failed=${row.failed}/${row.total} | slow=${row.slow}/${row.total} | avg=${row.avgDuration}ms | max=${row.maxDuration}ms | console=${row.consoleErrors} | page=${row.pageErrors} | req_fail=${row.failedRequests} | bad_http=${row.badResponses}`
    );
  }

  txt.push('');
  txt.push('=== TOP FAILS (max 30) ===');
  failedRuns.slice(0, 30).forEach((row) => {
    txt.push(
      `${row.name} | ${row.duration}ms | nav=${row.navError || '-'} | console=${row.consoleErrors.length} | page=${row.pageErrors.length} | req_fail=${row.failedRequests.length} | bad_http=${row.badResponses.length} | body=${row.bodyLength} | divs=${row.divs}`
    );
  });

  txt.push('');
  txt.push('=== TOP SLOW (max 30) ===');
  slowRuns.forEach((row) => {
    txt.push(
      `${row.name} | ${row.duration}ms | url=${row.url}`
    );
  });

  fs.writeFileSync(txtPath, txt.join('\n'), 'utf8');

  const csv = [];
  csv.push([
    'name',
    'side',
    'route',
    'run',
    'url',
    'finalUrl',
    'duration',
    'slow',
    'navError',
    'bodyLength',
    'divs',
    'consoleErrors',
    'pageErrors',
    'failedRequests',
    'badResponses'
  ].join(','));

  for (const row of RESULTS) {
    csv.push([
      csvEscape(row.name),
      csvEscape(row.side),
      csvEscape(row.route),
      row.run,
      csvEscape(row.url),
      csvEscape(row.finalUrl),
      row.duration,
      row.slow,
      csvEscape(row.navError || ''),
      row.bodyLength,
      row.divs,
      row.consoleErrors.length,
      row.pageErrors.length,
      row.failedRequests.length,
      row.badResponses.length
    ].join(','));
  }

  fs.writeFileSync(csvPath, csv.join('\n'), 'utf8');

  console.log('');
  console.log('REPORT READY');
  console.log(`TXT: ${txtPath}`);
  console.log(`CSV: ${csvPath}`);
  console.log('');
}

test.describe('TOTEM MASS AUDIT', () => {
  for (const entry of CASES) {
    test(entry.name, async ({ page }) => {
      await auditPage(page, entry);
    });
  }

  test.afterAll(async () => {
    writeReports();
  });
});