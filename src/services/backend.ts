import { ScrapedProduct } from '../types.js';
import { config } from '../config.js';

export class BackendService {
    async syncProduct(product: ScrapedProduct): Promise<void> {
        try {
            console.log(`[BackendService] Syncing product: ${product.title} (${product.external_id})`);

            // Simulation for now as requested in the plan
            // In real integration, uncomment the fetch call
            /*
            const response = await fetch(config.backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(product),
            });

            if (!response.ok) {
                throw new Error(`Failed to sync product: ${response.statusText}`);
            }
            */

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(`[BackendService] Successfully synced product: ${product.external_id}`);

        } catch (error) {
            console.error(`[BackendService] Error syncing product ${product.external_id}:`, error);
            // We might want to re-throw or handle it depending on if we want to stop the crawler
        }
    }
}

export const backendService = new BackendService();
