import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import { backendService } from './services/backend.js';
import { CategoryNode } from './types.js';

(async () => {
    // 1. Load Mapped Categories
    let categories = await backendService.getMappedCategories('Falabella');

    // Filter
    const args = process.argv.slice(2);
    const filterArg = args.find(a => a.startsWith('--filter='))?.split('=')[1];

    if (filterArg) {
        console.log(`[SimpleScraper] Filtering by "${filterArg}"...`);
        const filterTree = (nodes: CategoryNode[]): CategoryNode[] => {
            return nodes.reduce((acc, node) => {
                const matches = node.name.toLowerCase().includes(filterArg.toLowerCase());
                const filteredChildren = filterTree(node.children);
                if (matches || filteredChildren.length > 0) {
                    acc.push({ ...node, children: filteredChildren });
                }
                return acc;
            }, [] as CategoryNode[]);
        };
        categories = filterTree(categories);
    }

    // Flatten
    const startUrls: string[] = [];
    const traverse = (node: CategoryNode) => {
        if (node.url && node.url.startsWith('http')) startUrls.push(node.url);
        node.children.forEach(traverse);
    };
    categories.forEach(traverse);

    if (startUrls.length === 0) {
        console.log("No URLs to scrape.");
        return;
    }

    console.log(`[SimpleScraper] Starting scrape for ${startUrls.length} URLs.`);

    const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
    const page = await browser.newPage();

    // Limit to first 2 URLs for demo
    const demoUrls = startUrls.slice(0, 2);

    for (const startUrl of demoUrls) {
        console.log(`[SimpleScraper] Navigating to ${startUrl}`);
        let currentUrl = startUrl;
        let pageNum = 1;

        while (pageNum <= 2) { // Scrape 2 pages per category
            try {
                await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

                try {
                    // Update selectors based on browser subagent findings: a.pod-link or id starting with testId-pod-
                    await page.waitForSelector('a[class*="pod-link"], a[id^="testId-pod-"]', { timeout: 10000 });
                } catch {
                    console.log("No products found on this page. Taking screenshot...");
                    await page.screenshot({ path: `debug-no-products-${pageNum}.png` });
                    break;
                }

                // Extract Products
                const productElements = await page.locator('a[class*="pod-link"], a[id^="testId-pod-"]').all();
                console.log(`[SimpleScraper] Found ${productElements.length} products on page ${pageNum}.`);

                for (const product of productElements) {
                    const text = await product.innerText();
                    const lines = text.split('\n');
                    const title = lines[0] || 'Unknown';
                    // Simple log to prove we got data
                    console.log(`   -> Product: ${title.substring(0, 30)}...`);

                    // Real extraction would go here
                }

                // Pagination Logic (URL based)
                const urlObj = new URL(page.url());
                urlObj.searchParams.set('page', (pageNum + 1).toString());
                const nextUrl = urlObj.toString();

                // Check if next button exists to be sure, or just try navigating?
                // Falabella usually disables the button if no more pages. 
                // We'll simplisticly check for the button.
                const nextArrow = page.locator('#testId-pagination-top-arrow-right');
                if (await nextArrow.count() > 0 && await nextArrow.isEnabled()) {
                    console.log(`[SimpleScraper] Next page available: ${nextUrl}`);
                    currentUrl = nextUrl;
                    pageNum++;
                } else {
                    console.log("[SimpleScraper] No next page.");
                    break;
                }

            } catch (e) {
                console.error(`Error on ${currentUrl}:`, e);
                break;
            }
        }
    }

    await browser.close();
})();
