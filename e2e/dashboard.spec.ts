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
    { player: `Dash Unique ${token}`, serialNumber: "1/1" },
    { player: `Dash First ${token}`, serialNumber: "1/50" },
    { player: `Dash RPA ${token}`, rookie: true, autograph: true, memorabilia: true },
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

test("rarity: print-run tier, 1/1 and #1 tiles and rarest card open the right cards (#304)", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText(t("dashboard.rarity.byPrintRun"))).toBeVisible();

  // Other tests share the database: read the 1/1 count from the bar itself.
  const bar = page.getByRole("link", {
    name: new RegExp(`^1/1 - \\d+ ${t("common.cardsLabel")}$`),
  });
  const label = (await bar.getAttribute("aria-label")) ?? "";
  const count = Number(label.match(/ - (\d+) /)?.[1]);
  expect(count).toBeGreaterThanOrEqual(1);
  await bar.click();
  await expectCollection(page, { serialMin: "1", serialMax: "1" }, count);
  await expect(page.locator("table tbody")).toContainText(`Dash Unique ${token}`);
  await expect(page.getByText(t("cards.activePrintRun", { value: "1/1" }))).toBeVisible();

  // The dedicated 1/1 tile opens the same cards as the 1/1 bar.
  await page.goto("/");
  await page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: t("dashboard.rarity.title") }) })
    .getByRole("link", { name: new RegExp(t("dashboard.rarity.oneOfOneHint")) })
    .click();
  await expectCollection(page, { serialMin: "1", serialMax: "1" }, count);

  await page.goto("/");
  await page.getByRole("link", { name: new RegExp(t("dashboard.rarity.firstOfRun")) }).click();
  await expect(page).toHaveURL(/serialPosition=first/);
  await expect(page.locator("table tbody")).toContainText(`Dash First ${token}`);
  await expect(page.locator("table tbody")).not.toContainText(`Dash Unique ${token}`);

  await page.goto("/");
  await page
    .getByRole("button", {
      name: t("dashboard.rarity.openCard", { player: `Dash Unique ${token}`, serial: "1/1" }),
    })
    .click();
  await expect(page.getByRole("dialog")).toContainText(`Dash Unique ${token}`);
});

test("hits: the RPA tile opens the rookie + auto + memorabilia cards (#307)", async ({
  page,
}) => {
  await page.goto("/");
  const tile = page.getByRole("link", {
    name: new RegExp(`^${t("dashboard.hits.rpa.label")} \\d+`),
  });
  // Other tests share the database: read the count from the tile itself.
  const count = Number((await tile.textContent())?.match(/\d+/)?.[0]);
  expect(count).toBeGreaterThanOrEqual(1);

  await tile.click();
  await expect(page).toHaveURL(/\/collection\?/);
  const params = new URL(page.url()).searchParams;
  expect(params.getAll("tag")).toEqual(["rookie", "autograph", "memorabilia"]);
  await expect(page.getByText(t("cards.count", { count }))).toBeVisible();
  await expect(page.locator("table tbody")).toContainText(`Dash RPA ${token}`);
});
