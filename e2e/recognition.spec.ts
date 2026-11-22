import { expect, test } from "@playwright/test";
import { t } from "./support/i18n";
import { activePanel, expectStep, nextStep, stepper } from "./support/card-form";
import { uniqueToken } from "./support/seed";

/** 1×1 PNG: enough for the client-side downscale before upload. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
  "base64"
);

test("CardSight recognition only fills the empty fields", async ({ page }) => {
  const token = uniqueToken();
  const typedPlayer = `Typed Player ${token}`;
  const suggestion = {
    player: `Recognized Player ${token}`,
    year: "2003-04",
    brand: `Recognized Brand ${token}`,
    set: `Recognized Set ${token}`,
    variation: `Recognized Variation ${token}`,
    cardNumber: "221",
    serialTotal: 99,
    rookie: true,
    autograph: false,
    memorabilia: false,
    confidence: "high",
    variationUncertain: false,
    warnings: [],
    matched: { player: false, year: false, brand: false, set: false, variation: false },
  };

  // The browser-facing recognition endpoint is mocked: no CardSight key, no network.
  const recognizeRequests: string[] = [];
  await page.route("**/api/cards/recognize", async (route) => {
    recognizeRequests.push(route.request().headers()["content-type"] ?? "");
    await route.fulfill({ json: { suggestion, warnings: [] } });
  });

  await page.goto("/admin");
  await page.getByRole("button", { name: t("admin.cards.addCard") }).click();
  const dialog = page.getByRole("dialog", { name: t("cards.addTitle") });

  const field = (label: string) => dialog.getByLabel(label, { exact: true });
  const prefilledMarkers = () => activePanel(dialog).getByTitle(t("cards.steps.prefilled"));

  // Photo step first; the player typed on the next step must survive recognition.
  await expectStep(dialog, "photos");
  const analyze = dialog.getByRole("button", { name: t("cards.recognize") });
  await expect(analyze).toBeHidden();
  await field(t("cards.photoFront")).setInputFiles({
    name: "front.png",
    mimeType: "image/png",
    buffer: PNG_1X1,
  });
  await expect(dialog.getByRole("button", { name: t("cards.steps.skipPhotos") })).toBeHidden();
  await nextStep(dialog, "identity");
  await field(t("cards.player")).fill(typedPlayer);
  await stepper(dialog).getByRole("button", { name: t("cards.steps.photos") }).click();
  await expectStep(dialog, "photos");
  await analyze.click();

  const filled = [
    t("cards.year"),
    t("cards.brand"),
    t("cards.set"),
    t("cards.variation"),
    t("cards.cardNum"),
    t("cards.serialNum"),
    t("badges.rookie"),
  ];
  await expect(
    dialog.getByText(t("cards.recognizeApplied", { fields: filled.join(", ") }))
  ).toBeVisible();

  // What the user typed is kept; only blank fields take the suggestion, marked with ✨.
  await nextStep(dialog, "identity");
  await expect(field(t("cards.player"))).toHaveValue(typedPlayer);
  await expect(field(t("cards.year"))).toHaveValue(suggestion.year);
  await expect(prefilledMarkers()).toHaveCount(2); // year, Rookie
  await nextStep(dialog, "catalog");
  await expect(field(t("cards.brand"))).toHaveValue(suggestion.brand);
  await expect(field(t("cards.set"))).toHaveValue(suggestion.set);
  await expect(field(t("cards.variation"))).toHaveValue(suggestion.variation);
  await expect(field(t("cards.cardNum"))).toHaveValue(suggestion.cardNumber);
  await expect(field(t("cards.serialNum"))).toHaveValue("/99");
  await expect(prefilledMarkers()).toHaveCount(5);

  // Pre-filled fields stay editable; editing one drops its marker.
  await field(t("cards.cardNum")).fill("222");
  await expect(prefilledMarkers()).toHaveCount(4);

  // A second pass finds nothing left to fill.
  await stepper(dialog).getByRole("button", { name: t("cards.steps.photos") }).click();
  await analyze.click();
  await expect(dialog.getByText(t("cards.recognizeNoEmptyFields"))).toBeVisible();
  await expect(field(t("cards.player"))).toHaveValue(typedPlayer);

  expect(recognizeRequests).toHaveLength(2);
  expect(recognizeRequests[0]).toContain("multipart/form-data");

  await dialog.getByRole("button", { name: t("common.cancel"), exact: true }).click();
  await expect(dialog).toBeHidden();
});
