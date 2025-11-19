// tests/helpers/delivery.ts
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Helper: close the "Välj leveranssätt" popup if it appears
export async function closeDeliveryPopup(page: Page): Promise<void> {
  const popup = page.getByRole('dialog', { name: /Välj leveranssätt/i });

  // Try to wait for the popup briefly; if it doesn't show up, just return
  try {
    await popup.waitFor({ state: 'visible', timeout: 2000 });
  } catch {
    return;
  }

  const closeBtn = popup
    .locator(
      'button[aria-label*="stäng" i], button[aria-label*="close" i], button:has-text("×")'
    )
    .first();

  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await expect(popup).toBeHidden({ timeout: 5000 });
    console.log('🔒 Closed delivery method popup');
  }
}
