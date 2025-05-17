import {test, expect} from '../../../utils/baseTest';
import {selectRandomOption} from '../../../utils/helpers';

async function waitForUserUpdate(page) {
    return page.waitForResponse(response =>
        response.url().match(/\/api\/v\d+\/logging\/exercise/) && response.request().method() === "POST"
    );
}

test.describe('Logging Activity Tests', () => {
    let context;
    let page;

    test.beforeAll(async ({browser}) => {
        if (process.env.SKIP_ALL_TESTS === 'true') {
            console.log("Skipping test due to SKIP_ALL_TESTS being set.");
            test.skip(true, "Skipping test due to registration not being open.");
        }

        context = await browser.newContext(); // Share browser context
        page = await context.newPage(); // Share page
    });


    test.afterAll(async () => {
        await page.close();
        await context.close();
    });

    test.beforeEach(async ({
        promotion
    }) => {
        console.log("BE:", process.env.SKIP_ALL_TESTS);
        console.log("Page:", page.url());

        if (!promotion.has_started) {
            console.log("Skipping test: Logging hasn't started for this promotion");
            test.skip(true, "Logging hasn't started for this promotion");
        }

        if (promotion.has_logging_ended) {
            console.log("Skipping test: Logging has ended for this promotion");
            test.skip(true, "Logging has ended for this promotion");
        }
    });

    test('@wal Can user log with activity dropdown', async () => {
        console.log("first line in regular logging test")
        await page.goto('/home');
        await page.getByText("Log").click();
        await expect(page).toHaveURL(/.*home\/logging$/);

        await page.locator("div[class^='LogBoxHeader__DateWrapper']").isVisible();

        // Log once by selecting a random option
        await page.getByText("Add Activity").click();
        await selectRandomOption({
            page,
            name: 'exercise_activity',
            byID: false
        });

        const minInput = page.locator('input[type="number"]');
        await minInput.fill(chance.natural({
            min: 1,
            max: 3
        }).toString());
        await page.locator('button', {
            hasText: 'save'
        }).click();
        const minResponse = await waitForUserUpdate(page);
        expect([200, 201]).toContain(minResponse.status());
    });

    test('@wal Can user log manually and meet thresholds', async ({
        promotion
    }) => {
        /* Log steps manually to assert against promotion level thresholds */

        /*----------------------Test Low Threshold----------------------*/

        await page.getByText("Add Steps Manually").click();
        const stepsInput = page.locator('input[type="number"]');
        await stepsInput.fill(promotion.levels_breakdown.low.input.toString());
        await page.locator('button', {
            hasText: 'save'
        }).click();
        const lowLevelResponse = await waitForUserUpdate(page);
        const {
            data: lowLevelData
        } = await lowLevelResponse.json();

        //Ensure successeful response, then ensure threshold was met correctly.
        expect([200, 201]).toContain(lowLevelResponse.status());
        expect(lowLevelData.total_steps).toBeGreaterThanOrEqual(promotion.levels_breakdown.low.input);
        expect(lowLevelData.level_earned).toBe('low');


        /*----------------------Test Medium Threshold----------------------*/

        await page.getByText("Steps", {
            exact: true
        }).nth(1).click();
        await stepsInput.fill(promotion.levels_breakdown.medium.input.toString());
        await page.locator('button', {
            hasText: 'save'
        }).click();
        const medLevelResponse = await waitForUserUpdate(page);
        const {
            data: medLevelData
        } = await medLevelResponse.json();

        //Ensure successeful response, then ensure threshold was met correctly.
        expect([200, 201]).toContain(medLevelResponse.status());
        expect(medLevelData.total_steps).toBeGreaterThanOrEqual(promotion.levels_breakdown.medium.input);
        expect(medLevelData.level_earned).toBe('medium');


        /*----------------------Test High Threshold----------------------*/

        await page.getByText("Steps", {
            exact: true
        }).nth(1).click();
        await stepsInput.fill(promotion.levels_breakdown.high.input.toString());
        await page.locator('button', {
            hasText: 'save'
        }).click();
        const highLevelResponse = await waitForUserUpdate(page);
        const {
            data: highLevelData
        } = await highLevelResponse.json();

        //Ensure successeful response, then ensure threshold was met correctly.
        expect([200, 201]).toContain(highLevelResponse.status());
        expect(highLevelData.total_steps).toBeGreaterThanOrEqual(promotion.levels_breakdown.high.input);
        expect(highLevelData.level_earned).toBe('high');
    });
});