const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:5173';
const SALON_SLUG = 'totem-demo-salon';
const MASTER_SLUG = 'totem-demo-master';

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

function generateCases() {
  const cases = [];

  for (let i = 0; i < 5; i++) {
    for (const route of salonRoutes) {
      cases.push({
        name: `salon ${route} run ${i}`,
        path: `/#/salon/${SALON_SLUG}/${route}`,
        globals: { SALON_SLUG }
      });
    }
  }

  for (let i = 0; i < 5; i++) {
    for (const route of masterRoutes) {
      cases.push({
        name: `master ${route} run ${i}`,
        path: `/#/master/${route}`,
        globals: { MASTER_SLUG }
      });
    }
  }

  for (let i = 0; i < 5; i++) {
    cases.push({
      name: `bootstrap salon ${i}`,
      path: `/#/salon/${SALON_SLUG}/dashboard`,
      globals: { SALON_SLUG }
    });

    cases.push({
      name: `bootstrap master ${i}`,
      path: `/#/master/dashboard`,
      globals: { MASTER_SLUG }
    });

    cases.push({
      name: `root ${i}`,
      path: '/#/',
      globals: { SALON_SLUG }
    });
  }

  return cases;
}

const CASES = generateCases();

async function auditPage(page, entry) {
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('requestfailed', req => {
    failedRequests.push(req.url());
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      badResponses.push(`${res.status()} ${res.url()}`);
    }
  });

  await page.addInitScript((globals) => {
    if (globals.SALON_SLUG) window.SALON_SLUG = globals.SALON_SLUG;
    if (globals.MASTER_SLUG) window.MASTER_SLUG = globals.MASTER_SLUG;
  }, entry.globals);

  const start = Date.now();

  await page.goto(`${BASE}${entry.path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('body', { timeout: 5000 });
  await page.waitForTimeout(1000);

  const duration = Date.now() - start;

  const body = await page.locator('body').innerText();
  const divs = await page.locator('div').count();

  console.log(`LOAD ${entry.name}: ${duration}ms`);

  if (duration > 15000) {
    console.log(`SLOW PAGE DETECTED: ${entry.name} -> ${duration}ms`);
  }

  expect.soft(body.length).toBeGreaterThan(100);
  expect.soft(divs).toBeGreaterThan(5);
  expect.soft(consoleErrors.length).toBe(0);
  expect.soft(failedRequests.length).toBe(0);
  expect.soft(badResponses.length).toBe(0);
  expect.soft(duration).toBeLessThan(15000);
}

test.describe('TOTEM MASS AUDIT', () => {
  for (const entry of CASES) {
    test(entry.name, async ({ page }) => {
      await auditPage(page, entry);
    });
  }
});