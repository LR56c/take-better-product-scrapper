import { PlaywrightCrawler } from 'crawlee';
import { router } from './routes.js';
import { config } from './config.js';

// Aggregate start URLs from all stores in config
const startUrls = config.stores.flatMap(store =>
    store.categories.map(cat => ({
        url: cat.url,
        userData: { label: 'falabella-category', categoryName: cat.name }
        // Note: label needs to match the router handler key. 
        // For now we assume all config stores are Falabella or we need a way to dispatch.
        // A better way is to check the URL domain in the default route.
        // But for this MVP, I'll force the label if it's Falabella.
    }))
).map(req => {
    if (req.url.includes('falabella')) {
        req.userData.label = 'falabella-category';
    }
    return req;
});

const crawler = new PlaywrightCrawler({
    requestHandler: router,
    maxRequestsPerCrawl: 50, // Increased for testing
    // headless: false, // Uncomment to see browser
});

await crawler.run(startUrls);

