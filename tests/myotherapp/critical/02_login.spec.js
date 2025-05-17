import { test, expect } from '../../../utils/baseTest';

test.describe('Login Tests', () => {
  test('Verify login with created user and save session', async ({ page, user }) => {
    await page.goto('/welcome');

    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');

    // Confirm successful login
    await expect(page).toHaveURL(/\/home$/);

    // Save the authenticated session state
    await page.context().storageState({ path: 'auth.json' });
  });
});
