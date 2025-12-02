// tests/helpers/delivery.ts
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export async function closeDeliveryPopup(page: Page): Promise<void> {
  console.log('🔍 [delivery helper] Checking for delivery popup');

  // Variant 1: dialog with accessible name "Välj leveranssätt"
  const dialog = page.getByRole('dialog', { name: /Välj leveranssätt/i });

  // Variant 2: widget overlay
  const widget = page.locator('[data-testid="delivery-picker-widget"]');

  // --- Try the dialog variant first ---
  try {
    await dialog.waitFor({ state: 'visible', timeout: 2000 });
    console.log('🚨 [delivery helper] Found dialog "Välj leveranssätt"');

    const closeDialogBtn = dialog
      .locator(
        'button[aria-label*="stäng" i], button[aria-label*="close" i], button:has-text("×"), button:has-text("Stäng")'
      )
      .first();

    if (await closeDialogBtn.isVisible()) {
      await closeDialogBtn.click();
      await expect(dialog).toBeHidden({ timeout: 5000 });
      console.log('✅ [delivery helper] Closed dialog variant');
      return;
    } else {
      console.log('❓ [delivery helper] Dialog found but close button not visible');
    }
  } catch {
    // No dialog within timeout – that’s fine, we’ll try widget next
  }

  // --- Try the widget variant ---
  if (await widget.isVisible().catch(() => false)) {
    console.log('🚨 [delivery helper] Found delivery widget overlay');

    const closeWidgetBtn = page.getByRole('button', { name: /Stäng/i }).first();
    if (await closeWidgetBtn.isVisible().catch(() => false)) {
      await closeWidgetBtn.click();
      await expect(widget).toBeHidden({ timeout: 5000 });
      console.log('✅ [delivery helper] Closed widget variant');
      return;
    } else {
      console.log('❓ [delivery helper] Widget visible but could not find close button');
    }
  }

  console.log('ℹ️ [delivery helper] No delivery popup detected');
}
