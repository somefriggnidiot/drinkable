import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.TEST_BASE_URL || "http://localhost:3000";
const output = process.env.VISUAL_OUTPUT || "test-results/visual";
const routes = {
  home: "/",
  browse: "/browse/",
  map: "/explore/",
  detail: "/listing/river-market-brewing/",
  faq: "/faq/",
  contact: "/contact-drinkable/",
  account: "/my-account/",
  privacy: "/privacy-policy/",
  terms: "/terms/",
};

const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  await context.addInitScript(() => {
    localStorage.setItem(
      "drinkable-consent",
      JSON.stringify({ advertising: false }),
    );
  });
  const page = await context.newPage();
  const results = [];
  await mkdir(output, { recursive: true });
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, route] of Object.entries(routes)) {
      const errors = [];
      const listener = (error) => errors.push(error.message);
      page.on("pageerror", listener);
      const response = await page.goto(new URL(route, baseURL).href);
      // Next streams its loading shell before the page's content arrives.
      // The directory heading is intentionally hidden in the mobile layout.
      await page
        .locator("main h1, main h2, main form")
        .first()
        .waitFor({ state: "attached" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: path.join(output, `${name}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        heading: document.querySelector("h1")
          ? getComputedStyle(document.querySelector("h1")).fontSize
          : null,
        font: getComputedStyle(document.body).fontFamily,
      }));
      results.push({
        name,
        width,
        status: response.status(),
        errors,
        ...metrics,
      });
      page.off("pageerror", listener);
    }
  }
  await writeFile(
    path.join(output, "report.json"),
    JSON.stringify(results, null, 2),
  );
  const failures = results.filter(
    (r) => r.status !== 200 || r.overflow || r.errors.length,
  );
  console.log(JSON.stringify({ pages: results.length, failures }));
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
}
