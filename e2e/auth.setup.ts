import { expect, test as setup } from "@playwright/test";
import {
  ADMIN,
  adminStorageStatePath,
  E2E_BOOTSTRAP_TOKEN,
  LOCALE_COOKIE,
} from "./support/env";
import { t } from "./support/i18n";

/**
 * Runs first, on the empty database: creates the admin account through the
 * bootstrap form and saves the session for the other tests.
 */
setup("bootstrap the admin account on an empty database", async ({ page, context }) => {
  await context.addCookies([LOCALE_COOKIE]);
  // Production requires BOOTSTRAP_TOKEN on POST /api/auth/bootstrap; a reverse
  // proxy would inject it, here the browser sends it with every request.
  await context.setExtraHTTPHeaders({ "x-bootstrap-token": E2E_BOOTSTRAP_TOKEN });

  await page.goto("/");
  await expect(page.getByText(t("auth.bootstrapSubtitle"))).toBeVisible();

  await page.getByLabel(t("auth.username")).fill(ADMIN.username);
  await page.getByLabel(t("auth.password"), { exact: true }).fill(ADMIN.password);
  await page.getByLabel(t("auth.confirmPassword")).fill(`${ADMIN.password}-typo`);
  await page.getByRole("button", { name: t("auth.createAccount") }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText(t("auth.passwordMismatch"));

  await page.getByLabel(t("auth.confirmPassword")).fill(ADMIN.password);
  await page.getByRole("button", { name: t("auth.createAccount") }).click();

  await expect(page.getByRole("heading", { name: t("dashboard.title") })).toBeVisible();

  // Once an account exists, the bootstrap form is gone for good.
  const again = await page.request.post("/api/auth/bootstrap", {
    data: { username: "intruder", password: ADMIN.password },
  });
  expect(again.status()).toBe(403);

  await context.storageState({ path: adminStorageStatePath() });
});
