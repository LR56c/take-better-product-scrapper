import { chromium, Page, Browser } from 'playwright';
import { CategoryNode, DiscoveryHandler } from '../types.js';

export class FalabellaDiscoveryHandler implements DiscoveryHandler {
    storeName = 'Falabella';

    async discover(): Promise<CategoryNode[]> {
        console.log(`[${this.storeName}] Starting category discovery...`);

        const browser = await chromium.launch({
            headless: false,
            args: ['--disable-blink-features=AutomationControlled', '--start-maximized']
        });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 }
        });
        const page = await context.newPage();

        try {
            await page.goto('https://www.falabella.com/falabella-cl', { waitUntil: 'domcontentloaded', timeout: 60000 });
            await this.handlePopups(page);

            // Open Hamburger Menu
            await page.click('#testId-HamburgerBtn-toggle');
            await page.waitForTimeout(1000);

            // Get all Level 1 items
            const menuItems = await page.locator('div[class*="categoryTitle"]').allInnerTexts();
            console.log(`[${this.storeName}] Found ${menuItems.length} Level 1 categories:`, menuItems);

            const categories: CategoryNode[] = [];

            // We need to exclude non-category items if any (like "Hola!", "Inicia sesión" etc if they were caught, but our selector seems specific enough)
            // The selector `div[class*="categoryTitle"]` seemed to catch the main list.

            for (const name of menuItems) {
                // heuristic to skip non-product categories
                if (['Vende con nosotros', 'Centro de ayuda', 'Horario de tiendas', 'Seguros', 'Garantía extendida', 'Guías de compra'].includes(name)) continue;

                console.log(`[${this.storeName}] Processing: ${name}`);

                try {
                    const node = await this.extractCategoryBranch(page, name);
                    if (node) categories.push(node);
                } catch (e) {
                    console.warn(`[${this.storeName}] Failed to process ${name}: ${e}`);
                }
            }

            return categories;

        } catch (error) {
            console.error(`[${this.storeName}] Discovery failed:`, error);
            return [];
        } finally {
            await browser.close();
        }
    }

    private async handlePopups(page: Page) {
        await page.mouse.click(326, 220).catch(() => { });
    }

    private async extractCategoryBranch(page: Page, name: string): Promise<CategoryNode | null> {
        // Find and click Level 1
        // We re-query because dom might change or become stale? No, sidebar usually static.
        const level1 = page.locator(`div[class*="categoryTitle"]:has-text("${name}")`).first();
        if (await level1.count() === 0) return null;

        await level1.click();
        await page.waitForTimeout(800); // Wait for panel slide

        // Extract Level 2 (Immediate children in the panel)
        // Just the links inside the scroll container.
        // We verified `div[class*="scrollContainer"] a[href*="/category/"]` works.
        // Based on browser inspection, main subcategories (e.g. "TV", "Audio") have a specific class:
        // SecondLevelCategories-module_link__...
        // We use a partial match to be safe.
        const visibleLinks = await page.locator('div[class*="scrollContainer"] a[class*="SecondLevelCategories-module_link"]').all();

        const subcategories: CategoryNode[] = [];
        const seenUrls = new Set<string>();

        for (const link of visibleLinks) {
            if (await link.isVisible()) {
                const url = await link.getAttribute('href');
                let text = await link.innerText();
                text = text.replace(/\n/g, ' ').trim();

                // Exclude "Ver todo" explicitly if it shares the class (unlikely but safe)
                if (url && text && !seenUrls.has(url) && !text.toLowerCase().includes('ver todo')) {
                    const key = `https://www.falabella.com${url}`;
                    seenUrls.add(url);

                    subcategories.push({
                        name: text,
                        url: url.startsWith('http') ? url : `https://www.falabella.com${url}`,
                        children: [],
                        depth: 2
                    });
                }
            }
        }

        return {
            name: name,
            url: '',
            children: subcategories,
            depth: 1
        };
    }
}
