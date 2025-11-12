import { test, expect } from '@playwright/test';

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
  await page.goto('https://www.willys.se', { waitUntil: 'domcontentloaded' });

  // --- Search for morötter ---
  const searchBox = page.getByRole('combobox', { name: /Sök i e-handeln/i });
  await expect(searchBox).toBeVisible();
  await searchBox.fill('morötter');
  await Promise.all([
    page.waitForURL(/\/sok\?q=mor/i),
    searchBox.press('Enter'),
  ]);

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

  // ✅ Guard clause — prevents the TS2532 warning
  if (!match || !match[1]) continue;

  const price = parseFloat(match[1].replace(',', '.'));
  if (price < cheapestPrice) {
    cheapestPrice = price;
    cheapestIdx = i;
  }
}

  const cheapestCard = carrotCards.nth(cheapestIdx);
  const incrementBtn = cheapestCard.getByRole('button', { name: /Öka antal/i });
  await expect(incrementBtn).toBeEnabled();
  await incrementBtn.click();

  // --- Open cart ---
  const cartButton = page.getByRole('button', { name: /Varukorg:/i });
  await cartButton.click();

// --- Open cart ---  (you already clicked it above)
const cartDrawer = page.getByRole('complementary', { name: /Varukorg/i });
await expect(cartDrawer).toBeVisible();

// --- Empty the cart ---
const emptyBtn = cartDrawer.getByRole('button', { name: /Töm varukorg/i });
await expect(emptyBtn).toBeEnabled();
await emptyBtn.click();

// Optional confirm step (if site asks again)
const confirmEmpty = page.getByRole('button', { name: /Töm varukorg/i });
if (await confirmEmpty.isVisible()) {
  await confirmEmpty.click();
}

// --- Validate total = 0 kr and 0 items ---
await expect(cartDrawer.getByText(/Totalt\s*\(0 varor\)/i)).toBeVisible();
await expect(cartDrawer.getByText(/\b0,00\s*kr\b/)).toBeVisible();


  console.log('✅ Cart is empty, total = 0 kr');
});
