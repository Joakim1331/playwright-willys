import { test, expect } from "@playwright/test";
import { closeDeliveryPopup } from "./helpers/delivery";
import { openCart, emptyCart, assertCartEmpty } from "./helpers/cart";

test.setTimeout(60_000);

test("add and remove item from cart and validate total = 0 kr", async ({ context, page }) => {
  // --- Auto-accept cookies (your original logic preserved) ---
  await context.addInitScript(() => {
    const match = (el) =>
      el.tagName === "BUTTON" &&
      /Acceptera alla cookies|Godkänn|Tillåt alla/i.test(el.textContent || "");
    const tryClick = () => {
      const btn = [...document.querySelectorAll("button")].find(match);
      if (btn) { btn.click(); return true; }
      for (const frame of [...document.querySelectorAll("iframe")]) {
        try {
          const doc = frame.contentDocument;
          if (!doc) continue;
          const fbtn = [...doc.querySelectorAll("button")].find(match);
          if (fbtn) { fbtn.click(); return true; }
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
  await page.goto("https://www.willys.se");
  await closeDeliveryPopup(page);

  // --- Search ---
  const searchBox = page.getByRole("combobox", { name: /Sök i e-handeln/i });
  await expect(searchBox).toBeVisible();
  await searchBox.fill("morötter");
  await searchBox.press("Enter");

  await expect(page).toHaveURL(/\/sok\?q=mor/i);
  await expect(
    page.getByRole("heading", { name: /Visar resultat för "morötter"/i })
  ).toBeVisible();

  await closeDeliveryPopup(page);

  // --- Find cheapest carrot ---
  const carrots = page
    .locator('article, div[data-item], div.sc-9f1d623-5')
    .filter({ hasText: /Morot|Morötter/i })
    .filter({ hasText: /Jmf-pris\s*[\d.,]+\s*kr\/kg/i });

  await expect(carrots.first()).toBeVisible();

  let cheapestIdx = -1;
  let lowest = Infinity;

  for (let i = 0; i < await carrots.count(); i++) {
    const txt = await carrots.nth(i).innerText();
    const match = /Jmf-pris\s*([\d.,]+)\s*kr\/kg/i.exec(txt);
    if (!match) continue;
    const price = parseFloat(match[1].replace(",", "."));
    if (price < lowest) { lowest = price; cheapestIdx = i; }
  }

  expect(cheapestIdx).toBeGreaterThanOrEqual(0);

  const cheapest = carrots.nth(cheapestIdx);
  await cheapest.getByRole("button", { name: /Öka antal/i }).click();

  await closeDeliveryPopup(page);

  // --- Open cart ---
  const cartDrawer = await openCart(page);

  // --- Empty cart ---
  await emptyCart(page);

  // --- Validate totals ---
  await assertCartEmpty(page);

  console.log("✅ Cart is empty, total = 0 kr");
});
