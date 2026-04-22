'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { Product } from '@/types/products';

export type InventoryStockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export interface InventoryItem extends Product {
    stock: number;
    stockStatus: InventoryStockStatus;
    value: number; // stock * cost (or price if cost missing)
}

export interface InventoryStats {
    totalItems: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
}

export async function getInventoryData(brandId: string) {
    const user = await requireUser(['brand', 'super_user']);
    if (user.brandId !== brandId && user.role !== 'super_user') {
        throw new Error('Forbidden');
    }

    const { firestore } = await createServerClient();

    const snapshot = await firestore.collection('products')
        .where('brand_id', '==', brandId)
        .get();

    const inventory: InventoryItem[] = [];
    let stats: InventoryStats = {
        totalItems: 0,
        totalValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0
    };

    let productDocs: Product[] = [];

    // Use Synthetic Data if no real data found (Proof of Concept for Taxonomy)
    if (snapshot.empty) {
        const { generateSyntheticDataset } = await import('@/lib/data/synthetic-products');
        productDocs = generateSyntheticDataset(20, brandId);
        // Note: In real app we would save these to DB, here just returning for UI demo
    } else {
        snapshot.forEach(doc => {
            productDocs.push({ ...doc.data(), id: doc.id } as Product);
        });
    }

    productDocs.forEach(data => {
        // Mock stock if missing for demo purposes, randomly 0-100
        const stock = typeof data.stock === 'number' ? data.stock : Math.floor(Math.random() * 100);

        let stockStatus: InventoryStockStatus = 'In Stock';
        if (stock === 0) {
            stockStatus = 'Out of Stock';
            stats.outOfStockCount++;
        } else if (stock < 20) {
            stockStatus = 'Low Stock';
            stats.lowStockCount++;
        }

        const value = stock * (data.cost || data.price || 0);

        stats.totalItems += stock;
        stats.totalValue += value;

        inventory.push({
            ...data,
            stock,
            stockStatus,
            value
        });
    });

    return { inventory, stats };
}
