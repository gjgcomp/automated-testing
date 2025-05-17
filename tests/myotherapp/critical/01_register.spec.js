import { test, expect } from '../../../utils/baseTest';
import { selectRandomOption } from '../../../utils/helpers';
import Chance from 'chance';
import { promises as fs } from 'fs';

test.beforeAll(async () => {
    await fs.writeFile('./auth.json', '{}');
    await fs.writeFile('./test-user.json', '{}');
    await fs.writeFile('./promotion.json', '{}');
});

test.beforeEach(async ({ page, skipAllTests }) => {
    if (skipAllTests.skipAllTests) {
        test.skip(true, "Skipping all tests due to global flag");
    }

    await page.goto('/');
    const promotionResponse = await page.waitForResponse('**/api/v[0-9]/promotions/current*');
    const { data } = await promotionResponse.json();
    await fs.writeFile('promotion.json', JSON.stringify(data));
});

test.use({ skipConsentCheck: true });

test('@wal Can user register', async ({ page, promotion, skipAllTests }) => {
    if (!promotion.promotion_settings.is_open) {
        console.log("Skipping Registration test: Registration is closed.");
        skipAllTests.skipAllTests = true; // Update global state
        test.skip(true, "Registration is not open");
    }

    const chance = new Chance();
    const user = {
        firstName: chance.first(),
        lastName: chance.last(),
        email: chance.email({ domain: 'hesonline.com' }),
        password: 'test1234!!'
    };

    await page.goto('/welcome');
    await page.getByRole('button', { name: 'register' }).click();
    await expect(page).toHaveURL(/.*register$/);

    await page.getByLabel('First Name').fill(user.firstName);
    await page.getByLabel('Last Name').fill(user.lastName);
    await page.getByLabel(/email address/i).first().fill(user.email);
    await page.getByLabel(/email address/i).last().fill(user.email);
    await page.getByLabel(/password/i).first().fill(user.password);
    await page.getByLabel(/password/i).last().fill(user.password);

    // Gender
    if (promotion.promotion_settings.is_gender_displayed) {
        await selectRandomOption({ page, name: 'Gender', byID: false });
    }

    // Locations
    if (promotion.promotion_settings.is_location_displayed) {
        let hasSubLocations = promotion.locations.some(loc => loc.locations.length > 0);

        await selectRandomOption({ page, name: 'location', byID: true });
        if (hasSubLocations) {
            await selectRandomOption({ page, name: 'location2', byID: true });
        }
    }

    // Address
    if (promotion.promotion_settings.is_address_enabled) {
        await page.getByTestId('address1').fill(chance.address());
        await page.getByTestId('city').fill(chance.city());
        await selectRandomOption({ page, name: 'state', byID: true });
        await page.getByTestId('zip').fill(chance.zip());
    }

    // Evaluations
    for (const q of promotion.initial_evaluation.questions) {
        const cleanPrompt = q.prompt.replace(/<\/?[^>]+(>|$)/g, "");
        if (q.input_type === "TEXTBOX" || q.input_type === "TEXTAREA") {
            await page.getByRole('textbox', { name: cleanPrompt }).fill(chance.sentence());
        } else if (q.input_type === "DROPDOWN") {
            await selectRandomOption({ page, name: q.prompt, byID: false });
        } else if (q.input_type === "CHECKBOX") {
            await page.getByRole('checkbox', { name: cleanPrompt }).check();
        }
    }

    // Individual Leaderboard
    if (promotion.promotion_settings.show_individual_leaderboard) {
        await page.getByTestId('opted_in_individual_leaderboard').check();
    }

    await page.getByTestId('elig_agreement').check();

    // Intercept API request before submitting form
    const responsePromise = page.waitForResponse('**/api/v[0-9]/auth');
    await page.getByRole('button', { name: 'join now' }).click();
    const response = await responsePromise;

    expect([200, 201]).toContain(response.status());
    expect(response.request().method()).toBe("POST");

    // Wait for page transition
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    await expect(page).toHaveURL(/\/home$/);

    // Save credentials for future tests
    await fs.writeFile('test-user.json', JSON.stringify({ email: user.email, password: user.password }));
});