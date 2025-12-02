import { Timestamp } from 'firebase/firestore';
import { Product } from './products';

export type Order = {
    id: string;
    customer: string;
    date: string;
    status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
    total: number;
};

export type CartItem = Product & { quantity: number };

export type OrderStatus = 'submitted' | 'confirmed' | 'ready' | 'completed' | 'cancelled';

export type OrderDoc = {
    id: string;
    brandId: string;
    userId: string;
    customer: {
        name: string;
        email: string;
    };
    items: Array<{
        productId: string;
        name: string;
        qty: number;
        price: number;
    }>;
    totals: {
        subtotal: number;
        tax: number;
        discount?: number;
        fees?: number;
        total: number;
    };
    coupon?: {
        code: string;
        discount: number;
        totals?: any; // Keeping loose for now as it wasn't strictly defined in original
    };
    retailerId: string;
    createdAt: Timestamp;
    status: OrderStatus;
    mode: 'demo' | 'live';
    updatedAt?: Timestamp;
};

export type ServerOrderPayload = {
    items: Array<{
        productId: string;
        name: string;
        qty: number;
        price: number;
    }>;
    customer: { name: string; email: string; };
    retailerId: string;
    totals: { subtotal: number; tax: number; total: number; discount?: number; fees?: number };
};

export type OrderItemDoc = {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
};
