import { Page, expect } from "@playwright/test";
import { closeDeliveryPopup, waitForNoDeliveryOverlay } from "./delivery";

// Click the cart button reliably
export async function openCart(page: Page) {
  const cartButton = page.getByRole("button", { name: /Varukorg:/i });

  await closeDeliveryPopup(page);
  await waitForNoDeliveryOverlay(page);

  await cartButton.click();

  // Wait for drawer animation
  const drawer = page.getByRole("complementary", { name: /Varukorg/i });
  await expect(drawer).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(200);

  return drawer;
}

// Empty the cart reliably
export async function emptyCart(page: Page) {
  const drawer = page.getByRole("complementary", { name: /Varukorg/i });

  const emptyBtn = drawer.getByRole("button", { name: /Töm varukorg/i });
  await expect(emptyBtn).toBeEnabled();
  await emptyBtn.click();

  // Confirm dialog (sometimes appears)
  const confirm = page.getByText(/Är du säker.*tömma din varukorg/i);
  const visible = await confirm.isVisible().catch(() => false);

  if (visible) {
    const confirmBtn = page.getByRole("button", { name: /^Töm$/i }).first();
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();
    await expect(confirm).toBeHidden({ timeout: 5000 });
  }

  await closeDeliveryPopup(page);
  await waitForNoDeliveryOverlay(page);
}

// Validate totals reliably
export async function assertCartEmpty(page: Page) {
  const drawer = page.getByRole("complementary", { name: /Varukorg/i });
  const totals = drawer.locator("text=Totalt").locator("xpath=..");

  await expect(totals).toBeVisible({ timeout: 15_000 });
  await expect(totals).toContainText(/0 varor/i);
  await expect(totals).toContainText(/0,00 kr/i);

  // Buffer to allow React rerender
  await page.waitForTimeout(150);
}
