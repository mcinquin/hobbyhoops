import { expect, test, type Locator } from "@playwright/test";
import { t } from "./support/i18n";
import { listCards, newAdminApi, seedBrands, uniqueToken } from "./support/seed";

/** Text of the suggestions currently listed under a form combobox, sorted. */
async function optionTexts(dialog: Locator): Promise<string[]> {
  const texts = await dialog.getByRole("listbox").getByRole("option").allTextContents();
  return texts.map((text) => text.trim()).sort();
}

test("add a card: brand → set → variation cascade and serial parsing", async ({
  page,
  playwright,
}) => {
  const token = uniqueToken();
  const brand = `Form Brand ${token}`;
  const otherBrand = `Form Other ${token}`;
  const setA = `Alpha ${token}`;
  const setB = `Beta ${token}`;
  const player = `Form Player ${token}`;

  const api = await newAdminApi(playwright);
  await seedBrands(api, [
    {
      brand,
      sets: [
        { set: setA, variations: [`Gold ${token}`, `Silver ${token}`] },
        { set: setB, variations: [`Base ${token}`] },
      ],
    },
    { brand: otherBrand, sets: [{ set: `Gamma ${token}` }] },
  ]);

  await page.goto("/admin");
  await page.getByRole("button", { name: t("admin.cards.addCard") }).click();
  const dialog = page.getByRole("dialog", { name: t("cards.addTitle") });
  await expect(dialog).toBeVisible();

  const brandInput = dialog.getByLabel(t("cards.brand"), { exact: true });
  const setInput = dialog.getByLabel(t("cards.set"), { exact: true });
  const variationInput = dialog.getByLabel(t("cards.variation"), { exact: true });

  await dialog.getByLabel(t("cards.player"), { exact: true }).fill(player);

  // Brand narrows the set suggestions to that brand's sets.
  await brandInput.fill(brand);
  await expect(
    dialog.getByText(t("cards.setsForBrandListed", { brand, count: 2 }))
  ).toBeVisible();
  await setInput.click();
  await expect.poll(() => optionTexts(dialog)).toEqual([setA, setB]);
  await dialog.getByRole("option", { name: setA }).click();
  await expect(setInput).toHaveValue(setA);

  // Set narrows the variation suggestions to that brand + set pair.
  await expect(
    dialog.getByText(t("cards.variationsForSetListed", { set: setA, count: 2 }))
  ).toBeVisible();
  await variationInput.click();
  await expect.poll(() => optionTexts(dialog)).toEqual([`Gold ${token}`, `Silver ${token}`]);
  await dialog.getByRole("option", { name: `Silver ${token}` }).click();
  await expect(variationInput).toHaveValue(`Silver ${token}`);

  // Another brand that does not have this set clears set and variation.
  await brandInput.fill(otherBrand);
  await expect(setInput).toHaveValue("");
  await expect(variationInput).toHaveValue("");

  await brandInput.fill(brand);
  await setInput.click();
  await dialog.getByRole("option", { name: setA }).click();
  await variationInput.click();
  await dialog.getByRole("option", { name: `Silver ${token}` }).click();
  await dialog.getByLabel(t("cards.cardNum")).fill("23");

  // A serial mangled by a spreadsheet (12/99 read as a date) is refused, not dropped.
  const cardWrites: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/cards") {
      cardWrites.push(request.url());
    }
  });
  const serialInput = dialog.getByLabel(t("cards.serialNum"));
  await serialInput.fill("45658");
  await dialog.getByRole("button", { name: t("cards.addCard") }).click();
  await expect(dialog.getByRole("alert")).toHaveText(t("errors.invalidSerialFormat"));
  expect(cardWrites).toHaveLength(0);

  // `12/99` is split into the copy number and the print run.
  await serialInput.fill("12/99");
  await dialog.getByRole("button", { name: t("cards.addCard") }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(t("admin.cards.created"))).toBeVisible();

  const [saved, ...others] = await listCards(api, { brand });
  expect(others).toHaveLength(0);
  expect(saved).toMatchObject({
    player,
    brand,
    set: setA,
    variation: `Silver ${token}`,
    cardNumber: "23",
    serialNumber: "12/99",
    serialCurrent: 12,
    serialTotal: 99,
  });

  await page.goto(`/collection?${new URLSearchParams({ brand })}`);
  const row = page.locator("table tbody tr").filter({ hasText: player });
  await expect(row).toContainText("12/99");
  await expect(row).toContainText(setA);

  await api.dispose();
});

test("add a brand and a set inline from the card form", async ({ page, playwright }) => {
  const token = uniqueToken();
  const brand = `Inline Brand ${token}`;
  const set = `Inline Set ${token}`;
  const player = `Inline Player ${token}`;

  await page.goto("/admin");
  await page.getByRole("button", { name: t("admin.cards.addCard") }).click();
  const dialog = page.getByRole("dialog", { name: t("cards.addTitle") });
  await dialog.getByLabel(t("cards.player"), { exact: true }).fill(player);

  // A set needs a brand first.
  const newSet = dialog.getByLabel(t("cards.newSet"));
  const addSet = dialog.getByRole("button", { name: t("cards.addSet") });
  await expect(newSet).toBeDisabled();
  await expect(addSet).toBeDisabled();

  await dialog.getByLabel(t("cards.newBrand")).fill(brand);
  await dialog.getByRole("button", { name: t("cards.addBrand") }).click();
  await expect(dialog.getByText(t("cards.brandAdded"))).toBeVisible();
  await expect(dialog.getByLabel(t("cards.brand"), { exact: true })).toHaveValue(brand);
  await expect(dialog.getByLabel(t("cards.newBrand"))).toHaveValue("");
  await expect(
    dialog.getByText(t("cards.setsForBrandNone", { brand }))
  ).toBeVisible();

  await newSet.fill(set);
  await addSet.click();
  await expect(dialog.getByText(t("cards.setAdded"))).toBeVisible();
  const setInput = dialog.getByLabel(t("cards.set"), { exact: true });
  await expect(setInput).toHaveValue(set);
  // The refreshed references now list the new set under the new brand.
  await expect(
    dialog.getByText(t("cards.setsForBrandListed", { brand, count: 1 }))
  ).toBeVisible();

  await dialog.getByRole("button", { name: t("cards.addCard") }).click();
  await expect(dialog).toBeHidden();

  const api = await newAdminApi(playwright);
  const references = (await (await api.get("/api/references")).json()) as {
    brands: string[];
    brandSets: Record<string, string[]>;
  };
  expect(references.brands).toContain(brand);
  expect(references.brandSets[brand]).toEqual([set]);
  const cards = await listCards(api, { brand, set });
  expect(cards.map((card) => card.player)).toEqual([player]);
  await api.dispose();
});
