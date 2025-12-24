import * as fs from 'fs/promises';
import { backendService } from './services/backend.js';
import { CategoryNode } from './types.js';

(async () => {
    try {
        console.log('Reading discovered categories...');
        const data = await fs.readFile('storage/datasets/falabella-categories.json', 'utf-8');
        const categories: CategoryNode[] = JSON.parse(data);

        await backendService.syncCategories(categories);

    } catch (e) {
        console.error('Sync failed:', e);
        process.exit(1);
    }
})();
