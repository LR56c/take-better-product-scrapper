import { createPlaywrightRouter, Dataset, PlaywrightCrawlingContext, Dictionary } from 'crawlee';
import { backendService } from '../services/backend.js';
import { ScrapedProduct, StoreConfig } from '../types.js';
import { config } from '../config.js';

// function to register handlers
import { Router } from 'crawlee'; // generic router type or just use any

export function registerFalabellaRoutes(router: any) { // Using any to avoid type hell for now


    // Helper to find the correct store config based on URL
    const getStoreConfig = (): StoreConfig | undefined => {
        return config.stores.find(s => s.name === 'Falabella');
    };

    router.addHandler('falabella-category', async (context: any) => {
        const { request, page, log, enqueueLinks } = context;

        const categoryName = request.userData.categoryName as string;
        log.info(`[FALABELLA] Processing category: ${categoryName} - ${request.url}`);

        // Enqueue product details
        await enqueueLinks({
            globs: ['https://www.falabella.com/falabella-cl/product/**'],
            label: 'falabella-product',
            userData: { categoryName }
        });

        // Pagination: URL Parameter Increment
        // We verified that appending ?page=n works. 
        // We check if "Next" arrow exists to determine if we should continue.
        const nextArrow = page.locator('#testId-pagination-top-arrow-right');
        if (await nextArrow.count() > 0) {
            const urlObj = new URL(request.url);
            const currentPage = parseInt(urlObj.searchParams.get('page') || '1');
            const nextPage = currentPage + 1;

            urlObj.searchParams.set('page', nextPage.toString());
            const nextUrl = urlObj.toString();

            log.info(`[FALABELLA] Enqueuing next page: ${nextPage} (${nextUrl})`);

            // Use addRequests to manually enqueue the specific URL
            // context.addRequests is available on the crawler context
            await (context as any).addRequests([{
                url: nextUrl,
                userData: { categoryName, label: 'falabella-category' }
            }]);
        }
    });

    router.addHandler('falabella-product', async (context: any) => {
        const { request, page, log } = context;
        log.info(`[FALABELLA] Processing product: ${request.url}`);

        // Try to extract JSON-LD
        let productData: ScrapedProduct | null = null;

        // Approach 1: JSON-LD
        try {
            const jsonLd = await page.evaluate(() => {
                const script = document.querySelector('script[type="application/ld+json"]');
                return script ? JSON.parse(script.innerHTML) : null;
            });

            if (jsonLd) {
                // Check if it's a Product or an array containing Product
                const rawProduct = Array.isArray(jsonLd) ? jsonLd.find(i => i['@type'] === 'Product') : (jsonLd['@type'] === 'Product' ? jsonLd : null);

                if (rawProduct) {
                    const store = getStoreConfig();
                    productData = {
                        store_id: store?.id || 'unknown',
                        external_id: rawProduct.sku || rawProduct.productID || 'unknown',
                        url: request.url,
                        title: rawProduct.name,
                        description: rawProduct.description,
                        price: parseFloat(rawProduct.offers?.price || rawProduct.offers?.lowPrice || '0'),
                        currency: rawProduct.offers?.priceCurrency || 'CLP',
                        brand_name: rawProduct.brand?.name,
                        category_name: request.userData.categoryName,
                        images: rawProduct.image ? (Array.isArray(rawProduct.image) ? rawProduct.image.map((img: string, idx: number) => ({ image_url: img, main: idx === 0 })) : [{ image_url: rawProduct.image, main: true }]) : [],
                        additional_data: { raw_json_ld: rawProduct }
                    };
                }
            }
        } catch (e) {
            log.warning(`[FALABELLA] Failed to parse JSON-LD: ${e}`);
        }

        // Approach 2: Next.js Data (Fallback)
        if (!productData) {
            try {
                // Checking for NEXT_DATA
                const nextData = await page.evaluate(() => {
                    const script = document.querySelector('#__NEXT_DATA__');
                    return script ? JSON.parse(script.innerHTML) : null;
                });

                if (nextData) {
                    // Traverse nextData structure... this is highly specific to the site version
                    // For now, let's stick to JSON-LD as primary and DOM selectors as tertiary
                }
            } catch (e) {
                log.warning(`[FALABELLA] Failed to parse __NEXT_DATA__: ${e}`);
            }
        }

        // Approach 3: DOM Selectors (Fallback)
        if (!productData) {
            const title = await page.title();
            const price = await page.locator('span.copy10').first().innerText().catch(() => '0'); // Example selector
            const store = getStoreConfig();

            productData = {
                store_id: store?.id || 'unknown',
                external_id: 'unknown', // Hard to get from DOM without specific attribute
                url: request.url,
                title: title,
                price: parseFloat(price.replace(/[^0-9]/g, '')),
                currency: 'CLP',
                images: [],
                category_name: request.userData.categoryName,
            };

            // Try to get images
            // ...
        }

        if (productData) {
            // Sync to backend!
            await backendService.syncProduct(productData);

            // Also push to dataset for debugging
            await Dataset.pushData(productData);
        } else {
            log.error(`[FALABELLA] Could not extract product data from ${request.url}`);
        }
    });
}

