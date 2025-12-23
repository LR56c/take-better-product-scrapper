import { createPlaywrightRouter } from 'crawlee';
import { registerFalabellaRoutes } from './handlers/falabella.js';

export const router = createPlaywrightRouter();

// Register handlers
registerFalabellaRoutes(router);


// Default handler for unhandled requests
router.addDefaultHandler(async ({ log, request }) => {
    log.info(`[DEFAULT] Unhandled URL: ${request.url}`);
});

