import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { t } from "./support/i18n";
import {
  deleteCards,
  fetchCard,
  listCards,
  newAdminApi,
  seedBrands,
  seedCards,
  uniqueToken,
} from "./support/seed";

test("CSV export then import restores the same cards", async ({ page, playwright }, testInfo) => {
  const token = uniqueToken();
  const brand = `CSV Brand ${token}`;
  const set = `CSV Set ${token}`;

  const api = await newAdminApi(playwright);
  await seedBrands(api, [{ brand, sets: [{ set }] }]);
  const originals = await seedCards(api, [
    {
      player: `CSV Numbered ${token}`,
      team: "Boston Celtics",
      year: "2020-21",
      brand,
      set,
      variation: "Gold",
      serialNumber: "12/99",
      cardNumber: "7",
      grading: "PSA 10",
      rookie: true,
      autograph: true,
      openingDate: "15/03/2024",
    },
    {
      player: `CSV Notes ${token}`,
      brand,
      set,
      // Commas, quotes and a line break must survive the CSV escaping.
      notes: 'Bought at "the show", 2024\nsecond line',
      tradable: true,
      wnba: true,
    },
    { player: `CSV Plain ${token}`, brand, set, memorabilia: true },
  ]);

  await page.goto("/admin");
  await page.getByRole("tab", { name: t("admin.tabs.csv") }).click();

  // Export only this test's brand (Enter applies the filter without the debounce).
  const brandFilter = page.getByPlaceholder(t("admin.csv.filterBrand"));
  await brandFilter.fill(brand);
  await brandFilter.press("Enter");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: t("admin.csv.exportFiltered") }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^hobbyhoops-cards-filtered-.*\.csv$/);
  const csvPath = testInfo.outputPath("export.csv");
  await download.saveAs(csvPath);
  await expect(page.getByText(t("admin.csv.exportFilteredDone"))).toBeVisible();

  const csv = await readFile(csvPath, "utf8");
  expect(csv.split(/\r?\n/)[0]).toMatch(/^﻿?id,player,team,year,brand,set,variation,/);
  for (const card of originals) expect(csv).toContain(card.id);

  // Empty the collection of these cards, then bring them back from the file.
  await deleteCards(api, originals.map((card) => card.id));
  expect(await listCards(api, { brand })).toHaveLength(0);

  await page.getByLabel(t("admin.csv.importMode")).selectOption("upsert");
  await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles(csvPath);
  await expect(
    page.getByText(t("admin.csv.importSummary", { created: 3, updated: 0 }))
  ).toBeVisible();

  // Upsert keeps the exported ids, so every card comes back identical.
  for (const original of originals) {
    expect(await fetchCard(api, original.id)).toEqual(original);
  }

  // Importing the same file again updates instead of duplicating.
  await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles(csvPath);
  await expect(
    page.getByText(t("admin.csv.importSummary", { created: 0, updated: 3 }))
  ).toBeVisible();
  expect(await listCards(api, { brand })).toHaveLength(3);

  await api.dispose();
});
