# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cabinet-pages-smoke.spec.cjs >> Cabinet pages smoke >> Salon cabinet page smoke: index
- Location: qa\tests\cabinet-pages-smoke.spec.cjs:128:5

# Error details

```
Error: MISSING_AUTH_STORAGE_STATE
Для smoke теста внутренних cabinet страниц нужен авторизованный storageState файл.
Задай env:
set TOTEM_QA_STORAGE_STATE=C:\Work\totem-sdk\qa\storage\auth-state.json
```

# Test source

```ts
  14  |   process.env.TOTEM_MASTER_SLUG ||
  15  |   "totem-demo-master";
  16  | 
  17  | const STORAGE_STATE =
  18  |   process.env.TOTEM_QA_STORAGE_STATE ||
  19  |   process.env.PLAYWRIGHT_STORAGE_STATE ||
  20  |   "";
  21  | 
  22  | const SALON_ROUTES = [
  23  |   "",
  24  |   "dashboard",
  25  |   "calendar",
  26  |   "masters",
  27  |   "clients",
  28  |   "bookings",
  29  |   "services",
  30  |   "money",
  31  |   "finance",
  32  |   "contracts",
  33  |   "salon-money",
  34  |   "transactions",
  35  |   "settlements",
  36  |   "payouts",
  37  |   "template",
  38  |   "settings"
  39  | ];
  40  | 
  41  | const MASTER_ROUTES = [
  42  |   "",
  43  |   "dashboard",
  44  |   "bookings",
  45  |   "clients",
  46  |   "schedule",
  47  |   "services",
  48  |   "finance",
  49  |   "finance/money",
  50  |   "finance/transactions",
  51  |   "finance/settlements",
  52  |   "finance/payouts",
  53  |   "money",
  54  |   "transactions",
  55  |   "settlements",
  56  |   "payouts",
  57  |   "template",
  58  |   "settings"
  59  | ];
  60  | 
  61  | function buildHash(path) {
  62  |   const normalized = String(path || "").replace(/^\/+/, "");
  63  |   return `${BASE}/#/${normalized}`;
  64  | }
  65  | 
  66  | function salonUrl(tail = "") {
  67  |   return tail
  68  |     ? buildHash(`salon/${SALON_SLUG}/${tail}`)
  69  |     : buildHash(`salon/${SALON_SLUG}`);
  70  | }
  71  | 
  72  | function masterUrl(tail = "") {
  73  |   return tail
  74  |     ? buildHash(`master/${MASTER_SLUG}/${tail}`)
  75  |     : buildHash(`master/${MASTER_SLUG}`);
  76  | }
  77  | 
  78  | function hasStorageState() {
  79  |   return Boolean(STORAGE_STATE && fs.existsSync(STORAGE_STATE));
  80  | }
  81  | 
  82  | async function waitForAppIdle(page) {
  83  |   await page.waitForLoadState("domcontentloaded");
  84  |   await page.waitForLoadState("networkidle").catch(() => {});
  85  | }
  86  | 
  87  | async function assertCabinetShell(page, ownerType, slug, expectedTail = "") {
  88  |   const currentUrl = page.url();
  89  | 
  90  |   expect(currentUrl.includes("/#/")).toBeTruthy();
  91  |   expect(currentUrl.includes(`/${ownerType}/${slug}`)).toBeTruthy();
  92  |   expect(currentUrl.includes("/#/auth/login")).toBeFalsy();
  93  | 
  94  |   if (expectedTail) {
  95  |     expect(currentUrl.includes(`/${expectedTail}`)).toBeTruthy();
  96  |   }
  97  | 
  98  |   await expect(page.locator("body")).toBeVisible();
  99  | 
  100 |   // cabinet shell must not fall back to login screen
  101 |   await expect(page.getByRole("heading", { name: "Вход" })).toHaveCount(0);
  102 | 
  103 |   // layout sanity
  104 |   await expect(page.locator("#odoo-content")).toHaveCount(1);
  105 | 
  106 |   // page should not be visually empty
  107 |   const bodyText = await page.locator("body").innerText();
  108 |   expect(String(bodyText || "").trim().length > 20).toBeTruthy();
  109 | }
  110 | 
  111 | test.describe("Cabinet pages smoke", () => {
  112 |   test.beforeAll(() => {
  113 |     if (!hasStorageState()) {
> 114 |       throw new Error(
      |             ^ Error: MISSING_AUTH_STORAGE_STATE
  115 |         [
  116 |           "MISSING_AUTH_STORAGE_STATE",
  117 |           "Для smoke теста внутренних cabinet страниц нужен авторизованный storageState файл.",
  118 |           "Задай env:",
  119 |           "set TOTEM_QA_STORAGE_STATE=C:\\Work\\totem-sdk\\qa\\storage\\auth-state.json"
  120 |         ].join("\n")
  121 |       );
  122 |     }
  123 |   });
  124 | 
  125 |   for (const route of SALON_ROUTES) {
  126 |     const label = route || "index";
  127 | 
  128 |     test(`Salon cabinet page smoke: ${label}`, async ({ browser }) => {
  129 |       const context = await browser.newContext({
  130 |         storageState: STORAGE_STATE,
  131 |         ignoreHTTPSErrors: true
  132 |       });
  133 | 
  134 |       const page = await context.newPage();
  135 | 
  136 |       try {
  137 |         await page.goto(salonUrl(route), { waitUntil: "domcontentloaded" });
  138 |         await waitForAppIdle(page);
  139 |         await assertCabinetShell(page, "salon", SALON_SLUG, route);
  140 |       } finally {
  141 |         await context.close();
  142 |       }
  143 |     });
  144 |   }
  145 | 
  146 |   for (const route of MASTER_ROUTES) {
  147 |     const label = route || "index";
  148 | 
  149 |     test(`Master cabinet page smoke: ${label}`, async ({ browser }) => {
  150 |       const context = await browser.newContext({
  151 |         storageState: STORAGE_STATE,
  152 |         ignoreHTTPSErrors: true
  153 |       });
  154 | 
  155 |       const page = await context.newPage();
  156 | 
  157 |       try {
  158 |         await page.goto(masterUrl(route), { waitUntil: "domcontentloaded" });
  159 |         await waitForAppIdle(page);
  160 |         await assertCabinetShell(page, "master", MASTER_SLUG, route);
  161 |       } finally {
  162 |         await context.close();
  163 |       }
  164 |     });
  165 |   }
  166 | });
```