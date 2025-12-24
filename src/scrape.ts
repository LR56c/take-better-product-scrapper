import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import { backendService } from './services/backend.js';
import { CategoryNode, ScrapedProduct } from './types.js';

(async () => {
    // 1. Load Mapped Categories
    let categories = await backendService.getMappedCategories('Falabella');

    // Filter logic
    const args = process.argv.slice(2);
    const filterArg = args.find(a => a.startsWith('--filter='))?.split('=')[1];

    if (filterArg) {
        console.log(`[Scraper] Filtering by "${filterArg}"...`);
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

    // Flatten to valid URLs
    const startUrls: string[] = [];
    const traverse = (node: CategoryNode) => {
        if (node.url && node.url.startsWith('http')) startUrls.push(node.url);
        node.children.forEach(traverse);
    };
    categories.forEach(traverse);

    if (startUrls.length === 0) {
        console.log("[Scraper] No URLs to scrape.");
        return;
    }

    console.log(`[Scraper] Starting processing for ${startUrls.length} categories.`);

    // Launch Browser (Direct Playwright to avoid environment issues)
    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
    });
    const page = await browser.newPage();

    const outputFile = 'storage/datasets/products.jsonl';
    // Clear previous run if needed? No, append is safer for long runs, but user wants to see results.
    // We'll append.

    for (const startUrl of startUrls) {
        console.log(`[Scraper] Category: ${startUrl}`);
        let currentUrl = startUrl;
        let pageNum = 1;

        while (pageNum <= 5) { // Max 5 pages per category for safety
            try {
                console.log(`  -> Visiting Page ${pageNum}: ${currentUrl}`);
                await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

                // Wait for potential products
                try {
                    await page.waitForSelector('a[class*="pod-link"], a[id^="testId-pod-"]', { timeout: 15000 });
                } catch {
                    console.log("     [!] No products found (timeout). Moving to next category.");
                    break;
                }

                // Extract Products
                const productElements = await page.locator('a[class*="pod-link"], a[id^="testId-pod-"]').all();
                console.log(`     Found ${productElements.length} products.`);

                if (productElements.length === 0) break;

                const newProducts: any[] = [];
                for (const product of productElements) {
                    try {
                        const rawText = await product.innerText();
                        const lines = rawText.split('\n');
                        const title = lines[0] || 'Unknown Product';
                        const url = await product.getAttribute('href') || '';
                        const fullUrl = url.startsWith('http') ? url : `https://www.falabella.com${url}`;

                        // Basic price extraction (last line often has price)
                        const priceText = lines.find(l => l.includes('$')) || '0';
                        const price = parseInt(priceText.replace(/\D/g, '')) || 0;

                        const item = {
                            title,
                            url: fullUrl,
                            price,
                            crawled_at: new Date().toISOString()
                        };
                        newProducts.push(item);

                        // Sync to Backend
                        // await backendService.syncProduct(item); // Needs casting
                    } catch (e) { } // Ignore individual failures
                }

                // Save to file
                const jsonLines = newProducts.map(p => JSON.stringify(p)).join('\n');
                if (jsonLines) {
                    await fs.appendFile(outputFile, jsonLines + '\n');
                }

                // Pagination: Look for next page
                const urlObj = new URL(page.url());
                urlObj.searchParams.set('page', (pageNum + 1).toString());
                const nextUrl = urlObj.toString();

                const nextArrow = page.locator('#testId-pagination-top-arrow-right');
                if (await nextArrow.count() > 0 && await nextArrow.isEnabled()) {
                    currentUrl = nextUrl;
                    pageNum++;
                } else {
                    console.log("     No next page button. Finished category.");
                    break;
                }

            } catch (e) {
                console.error(`     Error processing page: ${e}`);
                break;
            }
        }
    }

    await browser.close();
    console.log(`[Scraper] Done. Results saved to ${outputFile}`);
})();
