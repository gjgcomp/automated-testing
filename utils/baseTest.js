import { test as base, expect as baseExpect } from '@playwright/test';
import { dismissConsentBanner } from './helpers';
import fs from 'fs';

const globalState = { shouldSkipTests: false };

export const test = base.extend({
    skipConsentCheck: [false, { option: true }],
    page: async ({ page, skipConsentCheck }, use) => {
        // Wrap the original page.goto() function

        if (process.env.SKIP_ALL_TESTS === 'true') {
            console.log("Skipping test due to registration not being open.");
            test.skip(true, "Skipping test due to registration not being open.");
        }

        const originalGoto = page.goto.bind(page);

        page.goto = async (...args) => {
            // Check if the current URL is the same as the target
            /* const currentURL = page.url();
            const targetURL = args[0];

            if (currentURL === targetURL) {
                // If the URL hasn't changed, skip the logging and consent check
                return;
            } */

            // Navigate to the page
            
            await originalGoto(...args);

            const cookies = await page.context().cookies();
            const consentCookie = cookies.find(cookie => cookie.name === 'hes_ga_consent');

            if (skipConsentCheck) {
                console.log("Skipping consent banner check for this test.");
                return;
            }

            // Wait for the page to load, then dismiss the consent banner
            if (!consentCookie && !args[0] !== ' /') {
                console.log("Consent banner detected, dismissing...");
                const consentBanner = page.locator("div[class^='ConsentManager__ConsentManagerBar']");
                await consentBanner.waitFor({ state: 'visible', timeout: 5000 });
                await dismissConsentBanner(page);
            } else {
                console.log("Consent already granted, skipping banner.");
            }
        };

        // Continue the test with the modified page
        await use(page);
    },
    // eslint-disable-next-line no-empty-pattern
    promotion: async ({}, use) => {
        const data = JSON.parse(fs.readFileSync('promotion.json', 'utf-8'));
        await use(data);
    },
    // eslint-disable-next-line no-empty-pattern
    user: async ({}, use) => {
        const data = JSON.parse(fs.readFileSync('test-user.json', 'utf-8'));
        await use(data);
    }
});

export { baseExpect as expect };