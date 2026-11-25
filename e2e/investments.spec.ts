import { expect, test } from "@playwright/test";
import { t } from "./support/i18n";
import { deleteCards, fetchCard, newAdminApi, seedCards, uniqueToken } from "./support/seed";

const token = uniqueToken();
const heldPlayer = `Invest Held ${token}`;
const soldPlayer = `Invest Sold ${token}`;
const cardIds: string[] = [];

test.beforeAll(async ({ playwright }) => {
  const api = await newAdminApi(playwright);
  const cards = await seedCards(api, [
    {
      player: heldPlayer,
      openingDate: "01/09/2026",
      purchasePriceCents: 10000,
      purchaseCurrency: "EUR",
      purchaseFeesCents: 1000,
      investment: true,
    },
    {
      player: soldPlayer,
      openingDate: "01/09/2026",
      purchasePriceCents: 2000,
      purchaseCurrency: "EUR",
      investment: true,
      soldAt: "2026-10-01",
      salePriceCents: 3000,
      saleFeesCents: 300,
    },
  ]);
  cardIds.push(...cards.map((card) => card.id));
  await api.dispose();
});

test.afterAll(async ({ playwright }) => {
  const api = await newAdminApi(playwright);
  await deleteCards(api, cardIds);
  await api.dispose();
});

test("values a held card, then sells it", async ({ page, playwright }) => {
  await page.goto("/investments");
  await expect(page.getByRole("heading", { name: t("investments.title"), level: 1 })).toBeVisible();

  const held = page.getByTestId("investments-held");
  const sold = page.getByTestId("investments-sold");
  const heldRow = held.getByTestId("investment-row").filter({ hasText: heldPlayer });
  await expect(heldRow).toContainText(t("investments.noValuation"));
  await expect(sold.getByTestId("investment-row").filter({ hasText: soldPlayer })).toContainText(
    "+€7.00"
  );

  await heldRow.getByRole("button", { name: t("investments.updateValue") }).click();
  const valuationDialog = page.getByRole("dialog");
  await valuationDialog
    .getByLabel(t("investments.valuationDialog.value", { currency: "EUR" }))
    .fill("150");
  await valuationDialog.getByRole("button", { name: t("common.save") }).click();
  await expect(valuationDialog).toBeHidden();
  // Cost basis = 100 + 10 fees.
  await expect(heldRow).toContainText("€150.00");
  await expect(heldRow).toContainText("+€40.00");

  await heldRow.getByRole("button", { name: t("investments.recordSale") }).click();
  const saleDialog = page.getByRole("dialog");
  await saleDialog.getByLabel(t("investments.saleDialog.price", { currency: "EUR" })).fill("200");
  await saleDialog.getByLabel(t("investments.saleDialog.fees")).fill("15");
  await saleDialog.getByRole("button", { name: t("common.save") }).click();
  await expect(saleDialog).toBeHidden();

  const soldRow = sold.getByTestId("investment-row").filter({ hasText: heldPlayer });
  await expect(soldRow).toContainText("+€75.00");
  await expect(held.getByTestId("investment-row").filter({ hasText: heldPlayer })).toHaveCount(0);

  const api = await newAdminApi(playwright);
  const saved = await fetchCard(api, cardIds[0]!);
  await api.dispose();
  expect(saved).toMatchObject({ salePriceCents: 20000, saleFeesCents: 1500, investment: true });
});

test("the dashboard links to the investments page", async ({ page }) => {
  await page.goto("/");
  const tile = page.getByTestId("investment-summary");
  await expect(tile).toBeVisible();
  await tile.getByRole("link", { name: t("dashboard.investments.viewAll") }).click();
  await expect(page).toHaveURL(/\/investments$/);
});
