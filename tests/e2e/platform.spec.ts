import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
async function dismissCookies(page: Page) {
  const button = page.getByRole("button", {
    name: "Reject optional",
    exact: true,
  });
  if (await button.isVisible()) await button.click();
}
const sessions = new Map<
  string,
  Awaited<ReturnType<BrowserContext["cookies"]>>
>();
async function login(page: Page, email: string) {
  const cookies = sessions.get(email);
  if (cookies) {
    await page.context().addCookies(cookies);
    await page.goto("/my-account/dashboard/");
    await expect(
      page.getByRole("heading", { name: "My account", exact: true }),
    ).toBeVisible();
    return;
  }
  await page.goto("/my-account/");
  await dismissCookies(page);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.DEMO_PASSWORD || "Drinkable-Local-Test-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My account", exact: true }),
  ).toBeVisible();
  sessions.set(email, await page.context().cookies());
}
for (const width of [390, 768, 1024, 1440])
  test(`public directory works at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await dismissCookies(page);
    await expect(
      page.getByRole("heading", { name: "Your One-Stop Brewery Directory" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(
      page.getByRole("main").getByRole("article").first(),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width <= 800) {
      await page.getByRole("button", { name: "Filters", exact: false }).click();
      const dialog = page.getByRole("dialog", { name: "Filters", exact: true });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel("Family Friendly", { exact: true }).check();
      await dialog.getByRole("button", { name: "Search", exact: true }).click();
    } else {
      await page.getByLabel("Family Friendly", { exact: true }).check();
      await page.getByRole("button", { name: "Search", exact: true }).click();
    }
    await expect(page).toHaveURL(/amenities=family-friendly/);
    await expect(page.getByRole("article").first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole("article").first()).toBeVisible();
  });
test("quick view, map fallback, menus, and cookie preferences work", async ({
  page,
}) => {
  await page.goto("/browse/");
  await dismissCookies(page);
  await page
    .getByRole("button", { name: /Quick view/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: "Map view", exact: true }).click();
  await expect(
    page.getByText("The interactive map is not configured yet.", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cookie settings", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Cookie preferences" }),
  ).toBeVisible();
  expect(await page.locator('script[src*="adsbygoogle"]').count()).toBe(0);
});
test("account, bookmark, review editing, and abuse-report workflow", async ({
  page,
  browser,
}) => {
  await login(page, "member@example.test");
  await page.goto("/listing/river-market-brewing/");
  await expect(
    page.getByRole("button", { name: /^(Remove bookmark|Bookmark brewery)$/ }),
  ).toBeVisible();
  const existingBookmark = page.getByRole("button", {
    name: "Remove bookmark",
    exact: true,
  });
  if (await existingBookmark.isVisible()) await existingBookmark.click();
  await page
    .getByRole("button", { name: "Bookmark brewery", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove bookmark", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Write a Review", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Your message", exact: true })
    .fill("A useful account-based review from a browser test.");
  await page
    .getByRole("button", { name: /Publish review|Update review/, exact: true })
    .click();
  await expect(
    page.getByText("Your review has been published.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Your message", exact: true })
    .fill("An updated review, still one review per brewery and account.");
  await page
    .getByRole("button", { name: "Update review", exact: true })
    .click();
  await expect(
    page
      .getByRole("article")
      .getByText(
        "An updated review, still one review per brewery and account.",
        { exact: true },
      ),
  ).toBeVisible();
  await page.goto("/browse/?q=River+Market");
  await expect(
    page.getByRole("button", { name: "Remove bookmark", exact: true }),
  ).toBeVisible();
  await page.goto("/my-account/dashboard/");
  await expect(
    page.getByRole("heading", { name: "Saved breweries", exact: true }),
  ).toBeVisible();
  const reportingContext = await browser.newContext();
  const reportingPage = await reportingContext.newPage();
  await login(reportingPage, "owner@example.test");
  await reportingPage.goto("/listing/river-market-brewing/?tab=reviews");
  await reportingPage
    .getByRole("tab", { name: "Reviews", exact: false })
    .click();
  const review = reportingPage.getByRole("article").filter({
    hasText: "An updated review, still one review per brewery and account.",
  });
  await review
    .getByRole("button", { name: "Report abuse", exact: true })
    .click();
  await reportingPage
    .getByLabel("Why are you reporting this review?", { exact: true })
    .fill("Browser test report: please investigate this fictional review.");
  await reportingPage
    .getByRole("button", { name: "Send report", exact: true })
    .click();
  await expect(
    reportingPage.getByText("Thank you. Staff will review your report.", {
      exact: true,
    }),
  ).toBeVisible();
  await reportingContext.close();
  const staffContext = await browser.newContext();
  const staffPage = await staffContext.newPage();
  await login(staffPage, "admin@example.test");
  const reports = await (
    await staffPage.request.get("/api/admin/reports")
  ).json();
  const report = reports.find((r: { reason: string }) =>
    r.reason.startsWith("Browser test report:"),
  );
  expect(report).toBeTruthy();
  for (const hidden of [true, false]) {
    const result = await staffPage.request.patch(
      `/api/admin/reviews/${report.review_id}`,
      {
        headers: {
          origin: process.env.TEST_BASE_URL || "http://localhost:3000",
        },
        data: { hidden },
      },
    );
    expect(result.ok()).toBe(true);
  }
  await staffContext.close();
});
test("owner can edit their listing and staff tools remain protected", async ({
  page,
}) => {
  await login(page, "owner@example.test");
  await expect(
    page.getByRole("link", { name: "Staff administration", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "River Market Brewing", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Edit brewery", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Description", exact: true })
    .fill(
      "Updated by the verified owner through the browser test. This is a fictional listing.",
    );
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Listing saved.", { exact: true })).toBeVisible();
  const response = await page.request.get("/api/admin/users");
  expect(response.status()).toBe(403);
});
test("staff can inspect workflows and edit a content page", async ({
  page,
}) => {
  await login(page, "admin@example.test");
  await page
    .getByRole("link", { name: "Staff administration", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Brewery listings" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "pages", exact: true }).click();
  await page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Frequently Asked Questions",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Edit record" })
    .click();
  await expect(page.getByRole("dialog", { name: "Edit page" })).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Changes saved.", { exact: true })).toBeVisible();
});
test("contact form submits and public pages pass accessibility checks", async ({
  page,
}) => {
  await page.goto("/contact-drinkable/");
  await dismissCookies(page);
  await page.getByLabel("Name", { exact: true }).fill("Browser Test");
  await page.getByLabel("Email", { exact: true }).fill("browser@example.test");
  await page.getByLabel("Subject", { exact: true }).fill("Directory question");
  await page
    .getByLabel("Message", { exact: true })
    .fill("This is a local browser verification of the contact workflow.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByText(
      "Thank you. Your message has been sent to Drinkable staff.",
      { exact: true },
    ),
  ).toBeVisible();
  for (const path of [
    "/",
    "/browse/",
    "/listing/river-market-brewing/",
    "/faq/",
    "/my-account/",
  ]) {
    await page.goto(path);
    await dismissCookies(page);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});
test("rejects anonymous writes and foreign-origin mutations", async ({
  request,
}) => {
  const csrf = await request.post("/api/contact", {
    headers: { origin: "https://another.example" },
    data: {},
  });
  expect(csrf.status()).toBe(403);
  const unauthorized = await request.put(
    "/api/bookmarks/00000000-0000-0000-0000-000000000001",
    {
      headers: { origin: process.env.TEST_BASE_URL || "http://localhost:3000" },
    },
  );
  expect(unauthorized.status()).toBe(401);
});

test("image uploads are processed by the worker and originals remain private", async ({
  page,
}) => {
  await login(page, "member@example.test");
  const response = await page.request.post("/api/media", {
    headers: { origin: process.env.TEST_BASE_URL || "http://localhost:3000" },
    multipart: {
      file: {
        name: "visit.png",
        mimeType: "image/png",
        buffer: await sharp({
          create: { width: 16, height: 16, channels: 3, background: "#eeeeee" },
        })
          .png()
          .toBuffer(),
      },
    },
  });
  expect(response.status()).toBe(202);
  const upload = await response.json();
  await expect
    .poll(
      async () => {
        const state = await page.request.get(`/api/media/${upload.id}`);
        return (await state.json()).status;
      },
      { timeout: 30000 },
    )
    .toBe("ready");
  const image = await page.request.get(`/media/${upload.id}/image.webp`);
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toBe("image/webp");
  expect((await page.request.get(`/media/${upload.id}/source`)).status()).toBe(
    404,
  );
});

test("member submissions stay private until staff approval and a verified claim grants editing", async ({
  page,
  browser,
}) => {
  await login(page, "member@example.test");
  const base = await (
    await page.request.get("/api/breweries/river-market-brewing")
  ).json();
  const suffix = Date.now().toString();
  const data = {
    name: `Browser Test Brewery ${suffix}`,
    slug: `browser-test-${suffix}`,
    profile: { ...base.profile, gallery: [], logo: "", cover: "" },
  };
  const submitted = await page.request.post("/api/breweries", {
    headers: { origin: process.env.TEST_BASE_URL || "http://localhost:3000" },
    data,
  });
  expect(submitted.status()).toBe(201);
  const listing = await submitted.json();
  expect(
    (await page.request.get(`/api/breweries/${listing.id}`)).status(),
  ).toBe(404);
  const staffContext = await browser.newContext();
  const staffPage = await staffContext.newPage();
  await login(staffPage, "admin@example.test");
  const approved = await staffPage.request.patch(
    `/api/breweries/${listing.id}`,
    {
      headers: { origin: process.env.TEST_BASE_URL || "http://localhost:3000" },
      data: { ...data, version: 1, status: "published" },
    },
  );
  expect(approved.ok()).toBe(true);
  const claimed = await page.request.post(`/api/claims/${listing.id}`, {
    headers: { origin: process.env.TEST_BASE_URL || "http://localhost:3000" },
    data: {
      evidence:
        "I manage this fictional brewery. Staff can verify my ownership through its official business contact.",
    },
  });
  expect(claimed.status()).toBe(201);
  const claims = await (
    await staffPage.request.get("/api/admin/claims")
  ).json();
  const claim = claims.find(
    (c: { brewery_id: string }) => c.brewery_id === listing.id,
  );
  expect(claim).toBeTruthy();
  expect(
    (
      await staffPage.request.patch(`/api/admin/claims/${claim.id}`, {
        headers: {
          origin: process.env.TEST_BASE_URL || "http://localhost:3000",
        },
        data: { approve: true },
      })
    ).ok(),
  ).toBe(true);
  await page.goto(`/my-account/listings/${listing.id}/`);
  await expect(
    page.getByRole("heading", { name: "Edit brewery", exact: true }),
  ).toBeVisible();
  await staffContext.close();
});

test("verification and password recovery links are delivered through SMTP", async ({
  page,
}) => {
  test.skip(
    !process.env.TEST_INBOX_DIR,
    "Set TEST_INBOX_DIR when running with a captured local SMTP inbox.",
  );
  const { findLocalMailLink } = await import("../support/mail");
  const email = `verify-${Date.now()}@example.test`;
  await page.goto("/my-account/?register=1");
  await dismissCookies(page);
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Verification Test");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Verification-Test-Password-2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(
    page.getByText(
      "Check your email to verify your account before signing in.",
      { exact: true },
    ),
  ).toBeVisible();
  let verification = "";
  await expect
    .poll(
      async () => {
        verification = (await findLocalMailLink(email, "verify")) || "";
        return Boolean(verification);
      },
      { timeout: 30000 },
    )
    .toBe(true);
  await page.goto(verification);
  await expect(
    page.getByRole("heading", { name: "My account", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.goto("/my-account/lost-password/");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Send reset link", exact: true })
    .click();
  let reset = "";
  await expect
    .poll(
      async () => {
        reset = (await findLocalMailLink(email, "reset")) || "";
        return Boolean(reset);
      },
      { timeout: 30000 },
    )
    .toBe(true);
  await page.goto(reset);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Updated-Verification-Password-2026");
  await page
    .getByRole("button", { name: "Reset password", exact: true })
    .click();
  await expect(
    page.getByText("Your password has been reset.", { exact: false }),
  ).toBeVisible();
});
