import { StoreConfig } from './types.js';

export const config = {
    backendUrl: process.env.BACKEND_URL || 'http://localhost:8000/api/sync-product',
    // Example UUIDs - In a real scenario, these should match your DB SEEDS
    stores: [
        {
            id: '123e4567-e89b-12d3-a456-426614174000', // REPLACE_WITH_ACTUAL_FALABELLA_UUID
            name: 'Falabella',
            baseUrl: 'https://www.falabella.com.cl',
            categories: [
                {
                    name: 'TV y Video',
                    url: 'https://www.falabella.com/falabella-cl/category/cat1012/TV-y-Video',
                },
                {
                    name: 'Audio',
                    url: 'https://www.falabella.com/falabella-cl/category/cat2005/Audio',
                },
                {
                    name: 'Mundo Gamer',
                    url: 'https://www.falabella.com/falabella-cl/category/CATG19006/Computacion-gamer',
                },
                {
                    name: 'Cámaras y Drones',
                    url: 'https://www.falabella.com/falabella-cl/category/cat2038/Fotografia',
                },
                {
                    name: 'Smart TV',
                    url: 'https://www.falabella.com/falabella-cl/category/cat7190148/Televisores-LED',
                },
            ],
        },
    ] as StoreConfig[],
};
