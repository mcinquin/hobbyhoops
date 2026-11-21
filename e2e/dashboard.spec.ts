import { expect, test, type Page } from "@playwright/test";
import { t } from "./support/i18n";
import { newAdminApi, seedBrands, seedCards, uniqueToken } from "./support/seed";

const token = uniqueToken();
const brand = `Dash Brand ${token}`;
const otherBrand = `Dash Other ${token}`;
// The same set name under two brands: only brand + set identifies the bar (#287).
const sharedSet = `Shared ${token}`;
const soloSet = `Solo ${token}`;
// A season no other test uses.
const year = "1986-87";

test.beforeAll(async ({ playwright }) => {
  const api = await newAdminApi(playwright);
  await seedBrands(api, [
    { brand, sets: [{ set: sharedSet }, { set: soloSet }] },
    { brand: otherBrand, sets: [{ set: sharedSet }] },
  ]);
  await seedCards(api, [
    { player: `Dash One ${token}`, brand, set: sharedSet, year },
    { player: `Dash Two ${token}`, brand, set: sharedSet, year },
    { player: `Dash Three ${token}`, brand, set: sharedSet },
    { player: `Dash Four ${token}`, brand, set: soloSet },
    { player: `Dash Five ${token}`, brand: otherBrand, set: sharedSet },
  ]);
  await api.dispose();
});

/** A chart bar is a `role="link"` cell named "<label> - <count> cards". */
function chartBar(page: Page, label: string, count: number) {
  return page.getByRole("link", {
    name: `${label} - ${count} ${t("common.cardsLabel")}`,
    exact: true,
  });
}

async function expectCollection(
  page: Page,
  expected: Record<string, string>,
  count: number
): Promise<void> {
  await expect(page).toHaveURL(/\/collection\?/);
  const params = new URL(page.url()).searchParams;
  for (const [key, value] of Object.entries(expected)) {
    expect(params.get(key), `collection filter "${key}"`).toBe(value);
  }
  await expect(page.getByText(t("cards.count", { count }))).toBeVisible();
  await expect(page.locator("table tbody tr")).toHaveCount(count);
}

test("cards by set drills down with both brand and set filters (#287)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(t("dashboard.bySet"))).toBeVisible();

  await chartBar(page, `${brand} · ${sharedSet}`, 3).click();

  await expectCollection(page, { brand, set: sharedSet }, 3);
  // The other brand's card in the same-named set stays out.
  await expect(page.locator("table tbody")).not.toContainText(`Dash Five ${token}`);
});

test("cards by brand drills down to the brand", async ({ page }) => {
  await page.goto("/");
  await chartBar(page, brand, 4).click();
  await expectCollection(page, { brand }, 4);
  expect(new URL(page.url()).searchParams.has("set")).toBe(false);
});

test("cards by year drills down to the season", async ({ page }) => {
  await page.goto("/");
  // A retry re-seeds the same season, so read the count from the bar itself.
  const bar = page.getByRole("link", {
    name: new RegExp(`^${year} - \\d+ ${t("common.cardsLabel")}$`),
  });
  const label = (await bar.getAttribute("aria-label")) ?? "";
  const count = Number(label.match(/ - (\d+) /)?.[1]);
  expect(count).toBeGreaterThanOrEqual(2);

  await bar.click();
  await expectCollection(page, { year }, count);
});
