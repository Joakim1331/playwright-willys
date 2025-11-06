// tests/home.spec.ts
import { test, expect } from '@playwright/test';

test('homepage loads and the docs search works', async ({ page }) => {
  // Go to the site (baseURL can be set in config)
  await page.goto('https://playwright.dev/');

  // Assert the page title
  await expect(page).toHaveTitle(/Playwright/);

  // Use accessible locators (best practice)
  await page.getByRole('link', { name: /docs/i }).click();

  // URL assertion
  await expect(page).toHaveURL(/.*docs/);

  // Interact with a search field and assert results appear
  const search = page.getByRole('textbox', { name: /search/i });
  await search.fill('locator');
  await expect(page.getByRole('link', { name: /locator/i }).first()).toBeVisible();
});
