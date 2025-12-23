import { chromium } from 'playwright';
import { ScrapedProduct } from './types.js';

(async () => {
    console.log('Launching browser...');
    const browser = await chromium.launch({
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--start-maximized'
        ]
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Actual live product URL
    const url = 'https://www.falabella.com/falabella-cl/product/148445589/SMART-TV-HISENSE-LED-50-50A4NV-FHD/148445591';

    console.log(`Navigating to ${url}...`);
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (e) {
        console.error('Navigation timeout or error:', e);
    }

    const title = await page.title();
    console.log(`Page Title: ${title}`);
    await page.screenshot({ path: 'debug-falabella.png' });
    console.log('Screenshot saved to debug-falabella.png');

    console.log('Extracting data...');

    let productData: ScrapedProduct | null = null;

    try {
        const jsonLd = await page.evaluate(() => {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            const found = [];
            for (const s of scripts) {
                try {
                    found.push(JSON.parse(s.innerHTML));
                } catch (e) { }
            }
            return found;
        });

        console.log(`Found ${jsonLd.length} JSON-LD scripts.`);
        if (jsonLd.length > 0) {
            console.log('JSON-LD types found:', jsonLd.map((j: any) => j['@type'] || (Array.isArray(j) ? 'Array' : 'Unknown')));
        }

        if (jsonLd) {
            // Logic to find Product
            const rawProduct = jsonLd.find((i: any) =>
                i['@type'] === 'Product' ||
                (Array.isArray(i) && i.find((sub: any) => sub['@type'] === 'Product'))
            );

            // Normalize if it was an array
            const finalProduct = Array.isArray(rawProduct) ? rawProduct.find((i: any) => i['@type'] === 'Product') : rawProduct;

            if (finalProduct) {
                const storeId = 'debug-store-id';

                productData = {
                    store_id: storeId,
                    external_id: finalProduct.sku || finalProduct.productID || 'unknown',
                    url: url,
                    title: finalProduct.name,
                    description: finalProduct.description,
                    price: parseFloat(finalProduct.offers?.price || finalProduct.offers?.lowPrice || '0'),
                    currency: finalProduct.offers?.priceCurrency || 'CLP',
                    brand_name: finalProduct.brand?.name,
                    category_name: 'Debug Category',
                    images: finalProduct.image ? (Array.isArray(finalProduct.image) ? finalProduct.image.map((img: string, idx: number) => ({ image_url: img, main: idx === 0 })) : [{ image_url: finalProduct.image, main: true }]) : [],
                    additional_data: { raw_json_ld: finalProduct }
                };
            }
        }
    } catch (e) {
        console.error('Extraction error:', e);
    }

    if (productData) {
        console.log('\n--- EXTRACTED PRODUCT DATA ---');
        console.log(JSON.stringify(productData, null, 2));
        console.log('------------------------------\n');
    } else {
        console.error('Failed to extract product data.');
    }

    await browser.close();
})();
