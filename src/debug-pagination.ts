import { chromium } from 'playwright';

(async () => {
    console.log('Launching browser for pagination test...');
    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled', '--start-maximized']
    });
    const page = await browser.newPage();

    // Start with page 1
    const url = 'https://www.falabella.com/falabella-cl/category/cat1012/TV-y-Video';
    console.log(`Navigating to Page 1: ${url}...`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Simulate the handler logic
    const nextArrow = page.locator('#testId-pagination-top-arrow-right');
    const count = await nextArrow.count();
    console.log(`Next arrow count: ${count}`);

    if (count > 0) {
        const urlObj = new URL(url);
        const currentPage = parseInt(urlObj.searchParams.get('page') || '1');
        const nextPage = currentPage + 1;
        urlObj.searchParams.set('page', nextPage.toString());
        const nextUrl = urlObj.toString();

        console.log(`SUCCESS: Detected next page logic.`);
        console.log(`Next URL would be: ${nextUrl}`);

        // Verify page 2 actually works (lightweight check)
        console.log(`Navigating to generated Page 2: ${nextUrl}...`);
        await page.goto(nextUrl, { waitUntil: 'domcontentloaded' });
        const title = await page.title();
        console.log(`Page 2 Title: ${title}`);

        if (title.includes('TV')) {
            console.log('Page 2 loaded successfully.');
        } else {
            console.error('Page 2 failed to load content.');
        }

    } else {
        console.error('FAIL: Could not find next arrow on Page 1.');
    }

    await browser.close();
})();
