import { ScrapedProduct, CategoryNode } from '../types.js';
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
    async syncCategories(categories: CategoryNode[]): Promise<void> {
        console.log(`[BackendService] Syncing ${categories.length} root categories...`);
        // Simulate DB upset
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`[BackendService] Categories properly mapped and updated to Database.`);
    }

    async getMappedCategories(storeName: string): Promise<CategoryNode[]> {
        console.log(`[BackendService] Fetching mapped categories for ${storeName}...`);

        // MOCKED: In production, this would fetch from the DB where status = 'active'
        // For now, we return the discovered categories from our local file to simulate "using the map"
        try {
            const fs = await import('fs/promises');
            const data = await fs.readFile('storage/datasets/falabella-categories.json', 'utf-8');
            const nodes = JSON.parse(data) as CategoryNode[];
            console.log(`[BackendService] Retrieved ${nodes.length} categories from 'Database' (Mock File).`);
            return nodes;
        } catch (e) {
            console.error(`[BackendService] Failed to fetch mapped categories`, e);
            return [];
        }
    }
}

export const backendService = new BackendService();
