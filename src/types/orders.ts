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

export type OrderStatus = 'pending' | 'submitted' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

// Shipping address for e-commerce orders
export type ShippingAddress = {
    street: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
};

// Fulfillment status for shipped orders
export type FulfillmentStatus = 'pending' | 'processing' | 'shipped' | 'delivered';

// Purchase model for brand/tenant
export type PurchaseModel = 'local_pickup' | 'online_only' | 'hybrid';

export type OrderDoc = {
    id: string;
    brandId: string;
    userId: string;
    customer: {
        name: string;
        email: string;
        phone?: string;
    };
    items: Array<{
        productId: string;
        name: string;
        qty: number;
        price: number;
        category?: string;
    }>;
    totals: {
        subtotal: number;
        tax: number;
        discount?: number;
        fees?: number;
        shipping?: number;
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

    // Shipping fields for e-commerce orders
    purchaseModel?: PurchaseModel;
    shippingAddress?: ShippingAddress;
    fulfillmentStatus?: FulfillmentStatus;
    trackingNumber?: string;
    shippingCarrier?: string;
    shippedAt?: Timestamp;
    deliveredAt?: Timestamp;
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
