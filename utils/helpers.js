export async function dismissConsentBanner(page) {
    const acceptButton = page.getByRole('button', { name: /accept|agree|okay/i });
  
    try {
      await acceptButton.waitFor({ state: 'visible', timeout: 5000 });
      await acceptButton.click();
      console.log("Consent banner dismissed.");
    } catch (error) {
      console.warn("Consent banner not found or already dismissed.");
    }
  }

export async function selectRandomOption({ page, name = '', byID = false }) {
    let selectElement;

    try {
        // Try finding the element using getByRole (for accessible dropdowns)
        selectElement = byID
            ? await page.getByTestId(name)
            : await page.getByRole('combobox', { name: name });

        // Check if it's actually visible and interactable
        await selectElement.waitFor({ state: 'visible', timeout: 2000 });
    } catch (error) {
        console.warn(`Dropdown '${name}' not found via getByRole. Trying fallback.`);

        // Fallback for native <select> elements
        selectElement = await page.locator(`select[name="${name}"]`);

        // Ensure the fallback also exists
        await selectElement.waitFor({ state: 'visible', timeout: 2000 });
    }

    // Get the options inside the select element
    const options = await selectElement.locator('option');
    const optionsCount = await options.count();

    if (optionsCount > 1) {
        const randomOptionIndex = Math.floor(Math.random() * (optionsCount - 1)) + 1;
        await selectElement.selectOption({ index: randomOptionIndex });
    } else {
        console.warn(`Dropdown with label '${name}' has no selectable options.`);
    }
}
