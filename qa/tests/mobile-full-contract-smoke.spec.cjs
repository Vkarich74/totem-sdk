const { test, expect } = require('@playwright/test');

const BASE = process.env.TOTEM_QA_BASE || 'https://app.totemv.com';

const ROUTES = [
  {
    name: 'public mobile home',
    path: '/#/mobile',
    checks: [
      { type: 'contains', value: 'Мобильная витрина' }
    ]
  },
  {
    name: 'public city page',
    path: '/#/mobile/city/KG/bishkek',
    checks: [
      { type: 'contains', value: 'Бишкек' }
    ]
  },
  {
    name: 'mobile lite admin master',
    path: '/#/mobile/admin/master/totem-demo-master',
    checks: [
      { type: 'contains', value: 'Мобильная админка' },
      { type: 'contains', value: 'Мастер' },
      { type: 'containsAny', values: ['Букинг'] },
      { type: 'containsAny', values: ['Календарь'] },
      { type: 'containsAny', values: ['Деньги', 'Вывод денег'] },
      { type: 'containsAny', values: ['Статистика'] },
      { type: 'notContains', value: '#/' }
    ]
  },
  {
    name: 'mobile lite admin salon',
    path: '/#/mobile/admin/salon/totem-demo-salon',
    checks: [
      { type: 'contains', value: 'Мобильная админка' },
      { type: 'contains', value: 'Салон' },
      { type: 'containsAny', values: ['Букинг'] },
      { type: 'containsAny', values: ['Календарь'] },
      { type: 'containsAny', values: ['Деньги', 'Вывод денег'] },
      { type: 'containsAny', values: ['Статистика'] },
      { type: 'notContains', value: '#/' }
    ]
  },
  {
    name: 'mobile lite admin invalid',
    path: '/#/mobile/admin/unknown/test-slug',
    checks: [
      { type: 'contains', value: 'Мобильная админка' },
      { type: 'contains', value: 'Раздел временно недоступен' },
      { type: 'contains', value: 'Проверьте ссылку или вернитесь назад.' }
    ]
  },
  {
    name: 'booking route',
    path: '/#/booking?salon=totem-demo-salon',
    checks: [
      { type: 'containsAny', values: ['Запись', 'Имя', 'Телефон'] }
    ]
  }
];

async function inspectRoute(page, path) {
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

  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });

  const bodyText = await page.locator('body').innerText();

  return {
    bodyText,
    consoleErrors,
    failedRequests
  };
}

function assertChecks(bodyText, checks, routeName) {
  for (const check of checks) {
    if (check.type === 'contains') {
      expect(bodyText, `Expected "${check.value}" on ${routeName}`).toContain(check.value);
      continue;
    }

    if (check.type === 'containsAny') {
      const matched = check.values.some(value => bodyText.includes(value));
      expect(matched, `Expected one of [${check.values.join(', ')}] on ${routeName}`).toBe(true);
      continue;
    }

    if (check.type === 'notContains') {
      expect(bodyText, `Did not expect "${check.value}" on ${routeName}`).not.toContain(check.value);
    }
  }
}

test.describe('TOTEM MOBILE FULL CONTRACT SMOKE', () => {
  for (const route of ROUTES) {
    test(`Validate: ${route.name}`, async ({ page }) => {
      const result = await inspectRoute(page, route.path);

      expect(result.bodyText.includes('Interface error'), `Interface error text on ${route.name}`).toBe(false);
      expect(result.consoleErrors, `Console errors on ${route.name}`).toEqual([]);
      expect(result.failedRequests, `Failed requests on ${route.name}`).toEqual([]);

      assertChecks(result.bodyText, route.checks, route.name);
    });
  }
});
