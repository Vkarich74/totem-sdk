const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const SLUG = 'totem-demo-salon';
const API = 'https://api.totemv.com';

const ROUTES = [
  { name: 'dashboard', api: `/internal/salons/${SLUG}/metrics` },
  { name: 'bookings', api: `/internal/salons/${SLUG}/bookings` },
  { name: 'clients', api: `/internal/salons/${SLUG}/clients` },
  { name: 'masters', api: `/internal/salons/${SLUG}/masters` },
  { name: 'services', api: `/internal/salons/${SLUG}/services` },
  { name: 'money', api: `/internal/salons/${SLUG}/wallet-balance` },
  { name: 'transactions', api: `/internal/salons/${SLUG}/ledger` },
  { name: 'settlements', api: `/internal/salons/${SLUG}/settlements` },
  { name: 'payouts', api: `/internal/salons/${SLUG}/payouts` },
  { name: 'contracts', api: `/internal/salons/${SLUG}/contracts` }
];

const results = [];

test.describe('SALON FULL CHAIN AUDIT', () => {

  for (const r of ROUTES) {

    test(`chain ${r.name}`, async ({ page }) => {

      const start = Date.now();

      let apiCalled = false;
      let apiOk = false;

      page.on('response', async (res) => {
        if (res.url().includes(r.api)) {
          apiCalled = true;

          if (res.status() === 200) {
            const data = await res.json().catch(() => null);
            if (data && (data.ok === true || Object.keys(data).length > 0)) {
              apiOk = true;
            }
          }
        }
      });

      await page.goto(`/#/salon/${SLUG}/${r.name}`);

      await page.waitForTimeout(2000);

      const body = await page.locator('body').innerText();

      const uiOk = body.length > 50;

      const duration = Date.now() - start;

      const ok = apiCalled && apiOk && uiOk;

      results.push({
        route: r.name,
        apiCalled,
        apiOk,
        uiOk,
        duration
      });

      expect(apiCalled).toBeTruthy();
      expect(apiOk).toBeTruthy();
      expect(uiOk).toBeTruthy();

    });

  }

  test.afterAll(() => {

    const ts = new Date().toISOString().replace(/[:.]/g, '-');

    const outDir = path.join(__dirname, '../artifacts/salon-behavior-audit');
    fs.mkdirSync(outDir, { recursive: true });

    const file = path.join(outDir, `salon-chain-summary-${ts}.txt`);

    let text = '';
    text += `TOTEM SALON FULL CHAIN SUMMARY\n`;
    text += `Generated: ${new Date().toISOString()}\n\n`;

    for (const r of results) {
      text += `${r.route} | api_called=${r.apiCalled} | api_ok=${r.apiOk} | ui_ok=${r.uiOk} | time=${r.duration}ms\n`;
    }

    fs.writeFileSync(file, text);

    console.log('\n=== FULL CHAIN SUMMARY ===\n');
    console.log(text);
    console.log(`Saved to: ${file}\n`);

  });

});