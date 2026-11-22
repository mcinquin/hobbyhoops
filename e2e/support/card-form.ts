/**
 * Helpers for the multi-step add / edit card dialog.
 */
import { expect, type Locator } from "@playwright/test";
import { t } from "./i18n";

export type CardFormStepKey = "photos" | "identity" | "catalog" | "condition";

/** The stepper navigation of the dialog. */
export function stepper(dialog: Locator): Locator {
  return dialog.getByRole("navigation", { name: t("cards.steps.label") });
}

/** Checks which step is active, in the stepper (`aria-current`) and in the visible heading. */
export async function expectStep(dialog: Locator, step: CardFormStepKey): Promise<void> {
  const name = t(`cards.steps.${step}`);
  await expect(stepper(dialog).locator('[aria-current="step"]')).toHaveText(new RegExp(name));
  await expect(dialog.getByRole("heading", { name: new RegExp(`^${name}`) })).toBeVisible();
}

/** Clicks "Next" and checks the step reached. */
export async function nextStep(dialog: Locator, expected: CardFormStepKey): Promise<void> {
  await dialog.getByRole("button", { name: t("cards.steps.next") }).click();
  await expectStep(dialog, expected);
}

/** The panel of the active step (inactive steps are hidden). */
export function activePanel(dialog: Locator): Locator {
  return dialog.locator("section:not([hidden])");
}
