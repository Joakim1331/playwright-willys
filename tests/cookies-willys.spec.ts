/**TEST: Gå på in willys.se, sök på morötter, välj ut dom billigaste och lägg dom i din kundkorg 
(dynamiskt, om det kommer nya morötter imorgon som är billigare, då väljer du dom) */

// tests/cookies-willys.spec.ts
import { test, expect } from '@playwright/test';

test('accept cookies on willys.se without hard waits', async ({ context, page }) => {
  await context.addInitScript(() => {
    const match = (el: Element) =>
      el.tagName === 'BUTTON' &&
      /Acceptera alla cookies|Godkänn|Tillåt alla/i.test(el.textContent || '');

    const tryClick = (): boolean => {
      // In main document
      const btn = Array.from(document.querySelectorAll('button')).find(match) as HTMLButtonElement | undefined;
      if (btn) { btn.click(); return true; }

      // In iframes (many CMPs use iframes)
      for (const frame of Array.from(document.querySelectorAll('iframe'))) {
        try {
          const doc = frame.contentDocument;
          if (!doc) continue;
          const fbtn = Array.from(doc.querySelectorAll('button')).find(match) as HTMLButtonElement | undefined;
          if (fbtn) { fbtn.click(); return true; }
        } catch { /* cross-origin, ignore */ }
      }
      return false;
    };

    // Click immediately if present, otherwise observe DOM
    if (!tryClick()) {
      new MutationObserver((_, obs) => { if (tryClick()) obs.disconnect(); })
        .observe(document, { subtree: true, childList: true });
    }
  });

  await page.goto('https://www.willys.se/', { waitUntil: 'domcontentloaded' });
  // Search for "morötter"
const searchBox = page.getByRole('combobox', { name: /Sök i e-handeln/i });
await expect(searchBox).toBeVisible();      // ensures page is ready to interact
await searchBox.click();
await searchBox.fill('morötter');

// submit with Enter (more robust than clicking a specific button)
await Promise.all([
  page.waitForURL(/\/sok\?q=mor/i),
  searchBox.press('Enter'),
]);

// verify results heading
await expect(page.getByRole('heading', { level: 1, name: /morötter/i })).toBeVisible();

// wait for the product grid to be present
//await expect(page.locator('a[href^="/produkt/"]').first()).toBeVisible();

// --- Wait until at least one carrot product with Jmf-pris is rendered
const carrotCards = page
  .locator('main div:has(a[href^="/produkt/"])')
  .filter({ hasText: /Morot|Morötter/i })
  .filter({ hasText: /Jmf-pris/i });

await expect(
  carrotCards.first(),
  'Could not find any product card containing "Morot/Morötter"'
).toBeVisible();


// --- Collect Jmf-pris per card and pick the cheapest
const count = await carrotCards.count();
let cheapestIdx = -1;
let cheapestPrice = Number.POSITIVE_INFINITY;
let cheapestLabel = '';

for (let i = 0; i < count; i++) {
  const card = carrotCards.nth(i);

  const cardText = await card.innerText();

  // Safe product name (first non-empty line)
  const rawFirstLine = cardText.split('\n').find(l => l.trim().length > 0) ?? 'okänd';
  const name: string = rawFirstLine.trim();

  // Safe Jmf-pris capture
  const match = /Jmf[-\s]?pris[^\d]*([\d.,]+)\s*kr/i.exec(cardText);
  console.log('--- PRODUCT CARD ---');
console.log(cardText);
  const valueStr = match?.[1];
  if (!valueStr) continue;

  const value = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(value)) continue;

  if (value < cheapestPrice) {
    cheapestPrice = value;
    cheapestIdx = i;
    cheapestLabel = name;
  }
}

expect(cheapestIdx, 'No Jmf-pris found for any carrot product').toBeGreaterThanOrEqual(0);

const cheapestCard = carrotCards.nth(cheapestIdx);
const incrementBtn = cheapestCard.getByRole('button', { name: /Öka antal/i });
await expect(incrementBtn).toBeEnabled();
await incrementBtn.click();

// after you click the "Öka antal..." button
const deliveryDialog = page.getByRole('dialog', { name: /Välj leveranssätt/i });

if (await deliveryDialog.isVisible()) {
  const closeBtn = deliveryDialog
    .locator(
      // prefer accessible name
      'button[aria-label*="stäng" i], button[aria-label*="close" i], button:has-text("×")'
    )
    .first();

  await closeBtn.click();
  await expect(deliveryDialog).toBeHidden(); // ensure it’s gone before continuing
}


const cart = page.getByRole('button', { name: /Varukorg:/i });
await expect(cart).toContainText(/[1-9]/);
console.log(`✅ Added cheapest: ${cheapestLabel} (${cheapestPrice} kr/kg)`);


  // Continue with your steps – no explicit cookie wait needed.
  await expect(page.getByRole('combobox', { name: /Sök i e-handeln/i })).toBeVisible();
});
