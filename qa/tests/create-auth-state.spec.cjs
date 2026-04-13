const { test } = require("@playwright/test");

const BASE =
  process.env.TOTEM_QA_BASE ||
  "https://app.totemv.com";

test("Create auth storage state manually", async ({ page }) => {
  await page.goto(`${BASE}/#/auth/login`);

  console.log("🔴 ВАЖНО: сейчас вручную залогинься в браузере");

  await page.pause(); // ты руками логинишься

  await page.context().storageState({
    path: "C:/Work/totem-sdk/qa/storage/auth-state.json"
  });

  console.log("✅ storageState сохранён");
});