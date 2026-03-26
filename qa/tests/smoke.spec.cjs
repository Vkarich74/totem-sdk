const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:5173';

const SALON_SLUG = 'totem-demo-salon';
const MASTER_SLUG = 'totem-demo-master';

const CASES = [
  { name: 'salon dashboard', path: `/#/salon/${SALON_SLUG}/dashboard`, globals: { SALON_SLUG } },
  { name: 'salon masters', path: `/#/salon/${SALON_SLUG}/masters`, globals: { SALON_SLUG } },
  { name: 'salon bookings', path: `/#/salon/${SALON_SLUG}/bookings`, globals: { SALON_SLUG } },
  { name: 'salon calendar', path: `/#/salon/${SALON_SLUG}/calendar`, globals: { SALON_SLUG } },
  { name: 'salon finance', path: `/#/salon/${SALON_SLUG}/finance`, globals: { SALON_SLUG } },

  { name: 'master dashboard', path: '/#/master/dashboard', globals: { MASTER_SLUG } },
  { name: 'master bookings', path: '/#/master/bookings', globals: { MASTER_SLUG } },
  { name: 'master clients', path: '/#/master/clients', globals: { MASTER_SLUG } },
  { name: 'master schedule', path: '/#/master/schedule', globals: { MASTER_SLUG } },
  { name: 'master finance', path: '/#/master/finance', globals: { MASTER_SLUG } }
];

test.describe('TOTEM LOCAL SDK VALIDATION', () => {
  for (const entry of CASES) {
    test(`Validate: ${entry.name}`, async ({ page }) => {
      const failedRequests = [];
      const consoleErrors = [];

      page.on('requestfailed', req => {
        failedRequests.push(req.url());
      });

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.addInitScript((globals) => {
        if (globals.SALON_SLUG) window.SALON_SLUG = globals.SALON_SLUG;
        if (globals.MASTER_SLUG) window.MASTER_SLUG = globals.MASTER_SLUG;
      }, entry.globals);

      await page.goto(`${BASE}${entry.path}`, { waitUntil: 'networkidle' });

      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(100);

      const divCount = await page.locator('div').count();
      expect(divCount).toBeGreaterThan(5);

      const hasErrorBoundaryText = await page.locator('text=Something went wrong').count();
      expect(hasErrorBoundaryText).toBe(0);

      expect(consoleErrors, `Console errors on ${entry.name}`).toEqual([]);
      expect(failedRequests, `Failed requests on ${entry.name}`).toEqual([]);
    });
  }
});