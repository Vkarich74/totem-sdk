const { test, expect } = require("@playwright/test");

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

function buildHash(path) {
  const normalized = String(path || "").replace(/^\/+/, "");
  return `${BASE}/#/${normalized}`;
}

function expectedSalonLoginUrl() {
  return buildHash(`auth/login?role=salon_admin&slug=${SALON_SLUG}`);
}

function expectedMasterLoginUrl() {
  return buildHash(`auth/login?role=master&slug=${MASTER_SLUG}`);
}

async function waitForAppIdle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function openSalonLogin(page) {
  await page.goto(buildHash("auth/login"), { waitUntil: "domcontentloaded" });
  await waitForAppIdle(page);
}

async function openMasterCabinet(page) {
  await page.goto(buildHash(`master/${MASTER_SLUG}`), { waitUntil: "domcontentloaded" });
  await waitForAppIdle(page);
}

async function openSalonCabinet(page) {
  await page.goto(buildHash(`salon/${SALON_SLUG}`), { waitUntil: "domcontentloaded" });
  await waitForAppIdle(page);
}

test.describe("SDK auth flow contract audit", () => {
  test("Auth routes are reachable and render expected screens", async ({ page }) => {
    await page.goto(buildHash("auth/login"), { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();

    await page.goto(buildHash("auth/verify"), { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Подтверждение кода")).toBeVisible();

    await page.goto(buildHash("auth/set-password"), { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Создание пароля")).toBeVisible();

    await page.goto(buildHash("auth/forgot-password"), { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();

    await page.goto(buildHash("auth/reset"), { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("Login screen exposes password and OTP modes", async ({ page }) => {
    await openSalonLogin(page);

    await expect(page.getByRole("button", { name: "Пароль" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Код" })).toBeVisible();

    await expect(page.getByPlaceholder("Email или телефон")).toBeVisible();
    await expect(page.getByPlaceholder("Пароль")).toBeVisible();

    await page.getByRole("button", { name: "Код" }).click();
    await expect(page.getByPlaceholder("Email или телефон")).toBeVisible();
    await expect(page.getByPlaceholder("Пароль")).toHaveCount(0);
  });

  test("Password login without role/slug context shows context error", async ({ page }) => {
    await openSalonLogin(page);

    await page.getByPlaceholder("Email или телефон").fill("+996555111222");
    await page.getByPlaceholder("Пароль").fill("testpass123");
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page.getByText("Ошибка контекста входа")).toBeVisible();
  });

  test("OTP login without role/slug context shows context error", async ({ page }) => {
    await openSalonLogin(page);

    await page.getByRole("button", { name: "Код" }).click();
    await page.getByPlaceholder("Email или телефон").fill("+996555111222");
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page.getByText("Ошибка контекста входа")).toBeVisible();
  });

  test("Verify screen accepts code input contract", async ({ page }) => {
    await page.goto(buildHash("auth/verify"), { waitUntil: "domcontentloaded" });

    const codeInput = page.getByPlaceholder("6 цифр");
    await expect(codeInput).toBeVisible();

    await codeInput.fill("12ab34");
    await expect(codeInput).toHaveValue("1234");

    await codeInput.fill("123456789");
    await expect(codeInput).toHaveValue("123456");
  });

  test("Set password screen validates short password", async ({ page }) => {
    await page.goto(buildHash("auth/set-password"), { waitUntil: "domcontentloaded" });

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill("123");
    await passwordInputs.nth(1).fill("123");

    await page.getByRole("button", { name: /Сохранить пароль/i }).click();
    await expect(page.getByText("Пароль должен быть не короче 8 символов")).toBeVisible();
  });

  test("Set password screen validates mismatch", async ({ page }) => {
    await page.goto(buildHash("auth/set-password"), { waitUntil: "domcontentloaded" });

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill("strongpass123");
    await passwordInputs.nth(1).fill("strongpass999");

    await page.getByRole("button", { name: /Сохранить пароль/i }).click();
    await expect(page.getByText("Пароли не совпадают")).toBeVisible();
  });

  test("Salon cabinet without session redirects to exact hash auth URL", async ({ page }) => {
    await page.context().clearCookies();
    await openSalonCabinet(page);

    await page.waitForURL(expectedSalonLoginUrl(), { timeout: 10000 });
    await expect(page).toHaveURL(expectedSalonLoginUrl());
    await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
  });

  test("Master cabinet without session redirects to exact hash auth URL", async ({ page }) => {
    await page.context().clearCookies();
    await openMasterCabinet(page);

    await page.waitForURL(expectedMasterLoginUrl(), { timeout: 10000 });
    await expect(page).toHaveURL(expectedMasterLoginUrl());
    await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
  });

  test("Direct master login hash URL renders login screen", async ({ page }) => {
    await page.goto(expectedMasterLoginUrl(), { waitUntil: "domcontentloaded" });
    await waitForAppIdle(page);

    await expect(page).toHaveURL(expectedMasterLoginUrl());
    await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
    await expect(page.getByPlaceholder("Email или телефон")).toBeVisible();
  });

  test("Direct salon login hash URL renders login screen", async ({ page }) => {
    await page.goto(expectedSalonLoginUrl(), { waitUntil: "domcontentloaded" });
    await waitForAppIdle(page);

    await expect(page).toHaveURL(expectedSalonLoginUrl());
    await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
    await expect(page.getByPlaceholder("Email или телефон")).toBeVisible();
  });

  test("Session bootstrap does not crash public master page", async ({ page }) => {
    await page.goto(buildHash(`master/${MASTER_SLUG}`), { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("Session bootstrap does not crash public salon page", async ({ page }) => {
    await page.goto(buildHash(`salon/${SALON_SLUG}`), { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});
