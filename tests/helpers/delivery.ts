import { Page, expect } from "@playwright/test";

// Detect + close ALL delivery pop-up variants
export async function closeDeliveryPopup(page: Page) {
  console.log("🔍 [delivery] Checking for delivery popup");

  // Variant 1: ARIA dialog
  const dialog = page.getByRole("dialog", { name: /Välj leveranssätt/i });
  if (await dialog.isVisible().catch(() => false)) {
    console.log("⚠️ [delivery] ARIA dialog detected");
    await dialog.getByRole("button", { name: /stäng/i }).first().click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(150);
    return;
  }

  // Variant 2: Non-semantic overlay (most common)
  const overlay = page.locator('div:has(h3:has-text("Välj leveranssätt"))');
  if (await overlay.isVisible().catch(() => false)) {
    console.log("⚠️ [delivery] Overlay popup detected");
    await overlay.getByRole("button", { name: /stäng/i }).first().click();
    await expect(overlay).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(150);
    return;
  }

  console.log("ℹ️ [delivery] No popup found");
}

// Wait until NO delivery popup exists
export async function waitForNoDeliveryOverlay(page: Page) {
  await page
    .locator('div:has(h3:has-text("Välj leveranssätt"))')
    .waitFor({ state: "detached", timeout: 5000 })
    .catch(() => {});

  await page
    .getByRole("dialog", { name: /Välj leveranssätt/i })
    .waitFor({ state: "hidden", timeout: 5000 })
    .catch(() => {});
}
