import { test, expect } from '@playwright/test';
import { closeDeliveryPopup } from './helpers/delivery.js';

test.setTimeout(30_000); // give this UI-heavy test more time

test('add and remove item from cart and validate total = 0 kr', async ({ context, page }) => {
  // --- Accept cookies automatically ---
  await context.addInitScript(() => {
    const match = (el: Element) =>
      el.tagName === 'BUTTON' &&
      /Acceptera alla cookies|Godkänn|Tillåt alla/i.test(el.textContent || '');
    const tryClick = (): boolean => {
      const btn = Array.from(document.querySelectorAll('button')).find(match);
      if (btn) { (btn as HTMLButtonElement).click(); return true; }
      for (const frame of Array.from(document.querySelectorAll('iframe'))) {
        try {
          const doc = frame.contentDocument;
          if (!doc) continue;
          const fbtn = Array.from(doc.querySelectorAll('button')).find(match);
          if (fbtn) { (fbtn as HTMLButtonElement).click(); return true; }
        } catch {}
      }
      return false;
    };
    if (!tryClick()) {
      new MutationObserver((_, obs) => { if (tryClick()) obs.disconnect(); })
        .observe(document, { subtree: true, childList: true });
    }
  });

  // --- Navigate ---
  await page.goto('https://www.willys.se');
  await closeDeliveryPopup(page); // early popup

  // --- Search for morötter ---
  const searchBox = page.getByRole('combobox', { name: /Sök i e-handeln/i });
  await expect(searchBox).toBeVisible();
  await searchBox.fill('morötter');
  await searchBox.press('Enter');

  // Wait for URL AND results instead of a "load" event
  await expect(page).toHaveURL(/\/sok\?q=mor/i);
  await expect(
    page.getByRole('heading', { name: /Visar resultat för "morötter"/i })
  ).toBeVisible();

  await closeDeliveryPopup(page); // after search/navigation

  // --- Locate all carrot products ---
  const carrotCards = page.locator('article, div[data-item], div.sc-9f1d623-5')
    .filter({ hasText: /Morot|Morötter/i })
    .filter({ hasText: /Jmf-pris\s*[\d.,]+\s*kr\/kg/i });

  await expect(carrotCards.first()).toBeVisible();

  // --- Find the cheapest ---
  const count = await carrotCards.count();
  let cheapestIdx = -1;
  let cheapestPrice = Infinity;

  for (let i = 0; i < count; i++) {
    const text = await carrotCards.nth(i).innerText();
    const match = /Jmf-pris\s*([\d.,]+)\s*kr\/kg/i.exec(text);

    if (!match || !match[1]) continue;

    const price = parseFloat(match[1].replace(',', '.'));
    if (price < cheapestPrice) {
      cheapestPrice = price;
      cheapestIdx = i;
    }
  }

  expect(cheapestIdx, 'No Jmf-pris found for any carrot product')
    .toBeGreaterThanOrEqual(0);

  const cheapestCard = carrotCards.nth(cheapestIdx);
  const incrementBtn = cheapestCard.getByRole('button', { name: /Öka antal/i });
  await expect(incrementBtn).toBeEnabled();
  await incrementBtn.click();

  // Popup often appears right after adding to cart
  await closeDeliveryPopup(page);

  // --- Open cart ---
  const cartButton = page.getByRole('button', { name: /Varukorg:/i });
  await cartButton.click();

  // And sometimes again when opening the cart
  await closeDeliveryPopup(page);

  const cartDrawer = page.getByRole('complementary', { name: /Varukorg/i });
  await expect(cartDrawer).toBeVisible({ timeout: 15_000 });

  // --- Empty the cart ---
  const emptyBtn = cartDrawer.getByRole('button', { name: /Töm varukorg/i });
  await expect(emptyBtn).toBeEnabled();
  await emptyBtn.click();

  // --- Handle confirm popup: "Är du säker på att du vill tömma din varukorg?" ---
  const confirmQuestion = page.getByText(/Är du säker på att du vill tömma din varukorg\?/i);
  const confirmVisible = await confirmQuestion.isVisible().catch(() => false);

  if (confirmVisible) {
    console.log('🧺 Confirm dialog for emptying cart appeared');

    const confirmBtn = page.getByRole('button', { name: /^Töm$/i }).first();
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    await expect(confirmQuestion).toBeHidden({ timeout: 5000 });

    console.log('✅ Confirmed empty cart by clicking "Töm"');
  } else {
    console.log('ℹ️ No confirm dialog when emptying cart');
  }

 // --- Validate total = 0 kr and 0 items ---
await expect(
  cartDrawer.getByText(/Totalt\s*\(0 varor\)/i)
).toBeVisible({ timeout: 15_000 });

// There are two "0,00 kr" amounts: total and "Du sparar"
const amounts = cartDrawer.getByText(/\b0,00\s*kr\b/);
await expect(amounts.nth(0)).toBeVisible({ timeout: 15_000 }); // total
await expect(amounts.nth(1)).toBeVisible({ timeout: 15_000 }); // "Du sparar"

  console.log('✅ Cart is empty, total = 0 kr');
});
