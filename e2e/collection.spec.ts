import { expect, test, type Page } from "@playwright/test";
import { t } from "./support/i18n";
import {
  newAdminApi,
  seedBrands,
  seedCards,
  uniqueToken,
  type CardSeed,
} from "./support/seed";

const token = uniqueToken();
const brand = `Collection Brand ${token}`;
const setA = `Alpha ${token}`;
const setB = `Beta ${token}`;
// A distinctive word so the full-text search matches a single card.
const searchWord = `zephyr${token}`;

test.beforeAll(async ({ playwright }) => {
  const api = await newAdminApi(playwright);
  await seedBrands(api, [{ brand, sets: [{ set: setA }, { set: setB }] }]);

  const cards: CardSeed[] = [];
  for (let i = 1; i <= 7; i += 1) {
    cards.push({
      player: `Player A${i} ${token}`,
      brand,
      set: setA,
      year: "2019-20",
      rookie: i <= 3,
    });
  }
  for (let i = 1; i <= 4; i += 1) {
    cards.push({ player: `Player B${i} ${token}`, brand, set: setB, year: "2021-22" });
  }
  cards.push({ player: `Player ${searchWord}`, brand, set: setB, year: "2021-22" });
  await seedCards(api, cards);
  await api.dispose();
});

function collectionUrl(params: Record<string, string>): string {
  return `/collection?${new URLSearchParams(params)}`;
}

/** Desktop table rows, header excluded. */
function bodyRows(page: Page) {
  return page.locator("table tbody tr");
}

function searchParams(page: Page): URLSearchParams {
  return new URL(page.url()).searchParams;
}

test("filter state lives in the URL and survives a reload", async ({ page }) => {
  await page.goto(collectionUrl({ brand, set: setB }));

  await expect(page.getByText(t("cards.count", { count: 5 }))).toBeVisible();
  await expect(bodyRows(page)).toHaveCount(5);
  await expect(
    page.getByRole("button", {
      name: t("cards.removeFilter", { filter: t("cards.activeSet", { value: setB }) }),
    })
  ).toBeVisible();

  // Removing the set chip keeps the brand filter.
  await page
    .getByRole("button", {
      name: t("cards.removeFilter", { filter: t("cards.activeSet", { value: setB }) }),
    })
    .click();
  await expect(page).toHaveURL((url) => !url.searchParams.has("set"));
  expect(searchParams(page).get("brand")).toBe(brand);
  await expect(page.getByText(t("cards.count", { count: 12 }))).toBeVisible();

  await page.reload();
  await expect(page.getByText(t("cards.count", { count: 12 }))).toBeVisible();
});

test("tag filter chips toggle and combine with other filters", async ({ page }) => {
  await page.goto(collectionUrl({ brand }));
  await expect(page.getByText(t("cards.count", { count: 12 }))).toBeVisible();

  const rookieChip = page.getByRole("button", { name: t("badges.rookie"), exact: true });
  await rookieChip.click();
  await expect(rookieChip).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL((url) => url.searchParams.getAll("tag").includes("rookie"));
  await expect(page.getByText(t("cards.count", { count: 3 }))).toBeVisible();
  await expect(bodyRows(page)).toHaveCount(3);

  await page
    .getByRole("button", { name: t("cards.removeFilter", { filter: t("badges.rookie") }) })
    .click();
  await expect(page).toHaveURL((url) => !url.searchParams.has("tag"));
  await expect(rookieChip).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText(t("cards.count", { count: 12 }))).toBeVisible();
});

test("full-text search narrows the list and reset clears every filter", async ({ page }) => {
  await page.goto(collectionUrl({ brand }));

  await page.getByLabel(t("cards.searchAll")).fill(searchWord);
  await expect(page).toHaveURL((url) => url.searchParams.get("q") === searchWord);
  await expect(page.getByText(t("cards.count", { count: 1 }))).toBeVisible();
  await expect(bodyRows(page)).toHaveCount(1);
  await expect(bodyRows(page).first()).toContainText(`Player ${searchWord}`);
  await expect(
    page.getByRole("button", {
      name: t("cards.removeFilter", { filter: t("cards.activeSearch", { value: searchWord }) }),
    })
  ).toBeVisible();

  await page.getByRole("link", { name: t("cards.resetFilters") }).click();
  await expect(page).toHaveURL(/\/collection$/);
  await expect(page.getByLabel(t("cards.searchAll"))).toHaveValue("");
});

test("pagination moves through pages and keeps the filters", async ({ page }) => {
  await page.goto(collectionUrl({ brand, pageSize: "5" }));
  await expect(page.getByText(t("common.pageOf", { page: 1, total: 3 }))).toBeVisible();
  await expect(bodyRows(page)).toHaveCount(5);

  await page.getByRole("button", { name: t("common.nextPage") }).click();
  await expect(page).toHaveURL((url) => url.searchParams.get("page") === "2");
  await expect(page.getByText(t("common.pageOf", { page: 2, total: 3 }))).toBeVisible();
  expect(searchParams(page).get("brand")).toBe(brand);

  await page.getByRole("button", { name: t("common.lastPage") }).click();
  await expect(page.getByText(t("common.pageOf", { page: 3, total: 3 }))).toBeVisible();
  await expect(bodyRows(page)).toHaveCount(2);
  await expect(page.getByRole("button", { name: t("common.nextPage") })).toBeDisabled();

  // Changing a filter goes back to the first page.
  await page.getByRole("button", { name: t("badges.rookie"), exact: true }).click();
  await expect(page).toHaveURL((url) => !url.searchParams.has("page"));
  await expect(page.getByText(t("common.pageOf", { page: 1, total: 1 }))).toBeVisible();
});
