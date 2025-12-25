'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser, isSuperUser } from '@/server/auth/auth';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seeds the sandbox tenant with synthetic data for testing agents.
 * Target Tenant: 'sandbox-demo-brand'
 */
export async function seedSandboxData(tenantId: string = 'sandbox-demo-brand') {
    const user = await requireUser();
    if (!await isSuperUser()) throw new Error('Unauthorized');

    const { firestore } = await createServerClient();
    const batch = firestore.batch();

    // 1. Generate Products
    const products = Array.from({ length: 10 }).map(() => ({
        id: uuidv4(),
        brandId: tenantId,
        name: getRandomCannabisProduct(),
        price: getRandomPrice(20, 80),
        category: 'Edibles',
        inventory: 100,
        active: true,
        createdAt: new Date(),
    }));

    products.forEach(p => {
        const ref = firestore.collection('products').doc(p.id);
        batch.set(ref, p);
    });

    // 2. Generate Orders (Last 30 Days)
    const orders = Array.from({ length: 50 }).map(() => {
        const orderId = uuidv4();
        const daysAgo = Math.floor(Math.random() * 30);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);

        const numItems = Math.floor(Math.random() * 3) + 1;
        const orderItems = Array.from({ length: numItems }).map(() => {
            const product = products[Math.floor(Math.random() * products.length)];
            return {
                productId: product.id,
                name: product.name,
                price: product.price,
                qty: Math.floor(Math.random() * 2) + 1
            };
        });

        const total = orderItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

        return {
            id: orderId,
            orderId: `ORD-${orderId.substring(0, 8).toUpperCase()}`,
            brandId: tenantId,
            status: getRandomStatus(),
            customer: {
                name: `Customer ${Math.floor(Math.random() * 100)}`,
                email: `customer${Math.floor(Math.random() * 20)}@example.com`
            },
            items: orderItems,
            total,
            createdAt: date,
            updatedAt: date
        };
    });

    orders.forEach(o => {
        const ref = firestore.collection('orders').doc(o.id);
        batch.set(ref, o);
    });

    await batch.commit();
    return { success: true, message: `Seeded ${products.length} products and ${orders.length} orders.` };
}

// Helpers
function getRandomCannabisProduct() {
    const products = [
        'Cosmic Gummies 10mg', 'Sunset Sherbet Pre-roll', 'Blue Dream Vape Cart',
        'Midnight Mint Chocolate', 'Chill Drops Tincture', 'Baked Brownie Bites',
        'Lemon Haze Flower 3.5g', 'Relax Balm 1:1', 'Focus Capsules', 'Social Tonic'
    ];
    return products[Math.floor(Math.random() * products.length)];
}

function getRandomPrice(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomStatus() {
    const statuses = ['submitted', 'confirmed', 'ready', 'completed', 'cancelled'];
    // Weight towards 'completed' for better analytics
    const r = Math.random();
    if (r > 0.8) return 'completed';
    if (r > 0.6) return 'ready';
    return statuses[Math.floor(Math.random() * statuses.length)];
}
