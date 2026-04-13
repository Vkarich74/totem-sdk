const { test, expect } = require("@playwright/test");
const fs = require("fs");

const BASE =
  process.env.TOTEM_QA_BASE ||
  process.env.TOTEM_BASE_URL ||
  "http://localhost:5173";

const SALON_SLUG =
  process.env.TOTEM_SALON_SLUG ||
  "totem-demo-salon";

const MASTER_SLUG =
  process.env.TOTEM_MASTER_SLUG ||
  "totem-demo-master";

const STORAGE_STATE =
  process.env.TOTEM_QA_STORAGE_STATE ||
  process.env.PLAYWRIGHT_STORAGE_STATE ||
  "";

const SALON_ROUTES = [
  "",
  "dashboard",
  "calendar",
  "masters",
  "clients",
  "bookings",
  "services",
  "money",
  "finance",
  "contracts",
  "salon-money",
  "transactions",
  "settlements",
  "payouts",
  "template",
  "settings"
];

const MASTER_ROUTES = [
  "",
  "dashboard",
  "bookings",
  "clients",
  "schedule",
  "services",
  "finance",
  "finance/money",
  "finance/transactions",
  "finance/settlements",
  "finance/payouts",
  "money",
  "transactions",
  "settlements",
  "payouts",
  "template",
  "settings"
];

function buildHash(path) {
  const normalized = String(path || "").replace(/^\/+/, "");
  return `${BASE}/#/${normalized}`;
}

function salonUrl(tail = "") {
  return tail
    ? buildHash(`salon/${SALON_SLUG}/${tail}`)
    : buildHash(`salon/${SALON_SLUG}`);
}

function masterUrl(tail = "") {
  return tail
    ? buildHash(`master/${MASTER_SLUG}/${tail}`)
    : buildHash(`master/${MASTER_SLUG}`);
}

function hasStorageState() {
  return Boolean(STORAGE_STATE && fs.existsSync(STORAGE_STATE));
}

async function waitForAppIdle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function assertCabinetShell(page, ownerType, slug, expectedTail = "") {
  const currentUrl = page.url();

  expect(currentUrl.includes("/#/")).toBeTruthy();
  expect(currentUrl.includes(`/${ownerType}/${slug}`)).toBeTruthy();
  expect(currentUrl.includes("/#/auth/login")).toBeFalsy();

  if (expectedTail) {
    expect(currentUrl.includes(`/${expectedTail}`)).toBeTruthy();
  }

  await expect(page.locator("body")).toBeVisible();

  // cabinet shell must not fall back to login screen
  await expect(page.getByRole("heading", { name: "Вход" })).toHaveCount(0);

  // layout sanity
  await expect(page.locator("#odoo-content")).toHaveCount(1);

  // page should not be visually empty
  const bodyText = await page.locator("body").innerText();
  expect(String(bodyText || "").trim().length > 20).toBeTruthy();
}

test.describe("Cabinet pages smoke", () => {
  test.beforeAll(() => {
    if (!hasStorageState()) {
      throw new Error(
        [
          "MISSING_AUTH_STORAGE_STATE",
          "Для smoke теста внутренних cabinet страниц нужен авторизованный storageState файл.",
          "Задай env:",
          "set TOTEM_QA_STORAGE_STATE=C:\\Work\\totem-sdk\\qa\\storage\\auth-state.json"
        ].join("\n")
      );
    }
  });

  for (const route of SALON_ROUTES) {
    const label = route || "index";

    test(`Salon cabinet page smoke: ${label}`, async ({ browser }) => {
      const context = await browser.newContext({
        storageState: STORAGE_STATE,
        ignoreHTTPSErrors: true
      });

      const page = await context.newPage();

      try {
        await page.goto(salonUrl(route), { waitUntil: "domcontentloaded" });
        await waitForAppIdle(page);
        await assertCabinetShell(page, "salon", SALON_SLUG, route);
      } finally {
        await context.close();
      }
    });
  }

  for (const route of MASTER_ROUTES) {
    const label = route || "index";

    test(`Master cabinet page smoke: ${label}`, async ({ browser }) => {
      const context = await browser.newContext({
        storageState: STORAGE_STATE,
        ignoreHTTPSErrors: true
      });

      const page = await context.newPage();

      try {
        await page.goto(masterUrl(route), { waitUntil: "domcontentloaded" });
        await waitForAppIdle(page);
        await assertCabinetShell(page, "master", MASTER_SLUG, route);
      } finally {
        await context.close();
      }
    });
  }
});