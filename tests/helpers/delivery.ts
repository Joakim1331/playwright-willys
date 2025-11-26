// tests/helpers/delivery.ts
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export async function closeDeliveryPopup(page: Page): Promise<void> {
  console.log('🔍 [delivery helper] Checking for "Välj leveranssätt" popup');

  const popup = page.getByRole('dialog', { name: /Välj leveranssätt/i });

  // Check if the locator actually matches anything
  const count = await popup.count();
  console.log(`🔍 [delivery helper] Dialog locator count: ${count}`);

  if (count === 0) {
    console.log('ℹ️ [delivery helper] No dialog with role="dialog" and that name found');
    return;
  }

  try {
    await expect(popup).toBeVisible({ timeout: 5000 });
  } catch (e) {
    console.log('⚠️ [delivery helper] Dialog not visible within 5s', e);
    return;
  }

  // Optional: pause once we *know* the popup exists, to inspect it
  // Comment this out once you're happy.
  // @ts-expect-error Playwright adds this at runtime
  await page.pause();

  const closeBtn = popup
    .locator(
      'button[aria-label*="stäng" i], button[aria-label*="close" i], button:has-text("×")'
    )
    .first();

  const closeVisible = await closeBtn.isVisible().catch(() => false);
  console.log(`🔍 [delivery helper] Close button visible: ${closeVisible}`);

  if (!closeVisible) {
    console.log('❓ [delivery helper] Popup found but close button not visible / matched');
    return;
  }

  await closeBtn.click();
  await expect(popup).toBeHidden({ timeout: 5000 });

  console.log('✅ [delivery helper] Closed "Välj leveranssätt" popup');
}
