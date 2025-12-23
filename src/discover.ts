import { FalabellaDiscoveryHandler } from './handlers/falabella-discovery.js';
import * as fs from 'fs/promises';
import * as path from 'path';

(async () => {
    // Basic argument parsing
    const args = process.argv.slice(2);
    const storeArg = args.find(a => a.startsWith('--store='))?.split('=')[1];

    if (!storeArg) {
        console.error('Please provide a store: --store=falabella');
        process.exit(1);
    }

    let handler;
    switch (storeArg) {
        case 'falabella':
            handler = new FalabellaDiscoveryHandler();
            break;
        default:
            console.error(`Unknown store: ${storeArg}`);
            process.exit(1);
    }

    if (handler) {
        const categories = await handler.discover();

        // Output
        const outputDir = 'storage/datasets';
        await fs.mkdir(outputDir, { recursive: true });
        const filePath = path.join(outputDir, `${storeArg}-categories.json`);

        await fs.writeFile(filePath, JSON.stringify(categories, null, 2));
        console.log(`Discovery complete. Results saved to ${filePath}`);
    }
})();
