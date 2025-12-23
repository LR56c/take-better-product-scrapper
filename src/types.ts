export interface ScrapedImage {
    image_url: string;
    main: boolean;
}

export interface ScrapedProduct {
    store_id: string; // UUID of the store in the DB
    external_id: string; // Product ID in the store system (SKU)
    url: string;
    title: string;
    description?: string;
    price: number;
    currency: string;
    brand_name?: string; // We might need backend logic to map this to brand_id
    category_name?: string; // We might need backend logic to map this to category_id
    images: ScrapedImage[];
    additional_data?: Record<string, any>;
}

export interface StoreConfig {
    id: string; // UUID
    name: string;
    baseUrl: string;
    categories: {
        id?: string; // Category UUID if known
        name: string;
        url: string;
    }[];
}

export interface CategoryNode {
    name: string;
    url: string;
    children: CategoryNode[];
    depth: number;
}

export interface DiscoveryHandler {
    storeName: string;
    discover(): Promise<CategoryNode[]>;
}

