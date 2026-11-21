import { expect, test } from "@playwright/test";
import { ADMIN, LOCALE_COOKIE } from "./support/env";
import { t } from "./support/i18n";

// Fresh, signed-out browser (only the locale cookie): logging out here revokes
// this test's own session, not the shared admin one.
test.use({ storageState: { cookies: [LOCALE_COOKIE], origins: [] } });

test("log in, reach a protected page, then log out", async ({ page }) => {
  await page.goto("/collection");
  // Protected pages send signed-out visitors to the login form, remembering the target.
  await expect(page).toHaveURL(/\/\?from=%2Fcollection$/);
  await expect(page.getByText(t("auth.loginSubtitle"))).toBeVisible();

  await page.getByLabel(t("auth.username")).fill(ADMIN.username);
  await page.getByLabel(t("auth.password")).fill("not-the-right-password-at-all");
  await page.getByRole("button", { name: t("auth.login") }).click();
  await expect(page.locator("form").getByRole("alert")).toBeVisible();

  await page.getByLabel(t("auth.password")).fill(ADMIN.password);
  await page.getByRole("button", { name: t("auth.login") }).click();

  await expect(page).toHaveURL(/\/collection$/);
  await expect(page.getByRole("heading", { name: t("collection.title") })).toBeVisible();

  await page.getByRole("button", { name: t("nav.logout") }).click();
  await expect(page.getByText(t("auth.loginSubtitle"))).toBeVisible();

  // The session is gone server-side too.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/\?from=%2Fadmin$/);
  expect((await page.request.get("/api/auth/me")).status()).toBe(401);
});
