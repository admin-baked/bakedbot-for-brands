import { Timestamp } from 'firebase/firestore';
import { Product } from './products';
import { OrderAeropayData } from './aeropay';

export type Order = {
    id: string;
    customer: string;
    date: string;
    status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
    total: number;
};

export type CartItem = Product & { quantity: number };

export type OrderStatus = 'pending' | 'submitted' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

// Payment method types
export type PaymentMethod = 'dispensary_direct' | 'cannpay' | 'credit_card' | 'aeropay' | 'usdc';
export type PaymentStatus = 'pending_pickup' | 'pending' | 'paid' | 'failed' | 'voided' | 'refunded';

// Billing address for card payments
export type BillingAddress = {
    street: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
};

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
        brandId?: string;
        brandOrgId?: string;         // BakedBot org ID for brand (if on platform)
        wholesale?: number;           // COGS / wholesale price
        settlementEligible?: boolean; // brand has USDC wallet + opted in
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

    // Payment fields
    paymentMethod?: PaymentMethod;
    paymentStatus?: PaymentStatus;
    paymentProvider?: 'authorize_net' | 'cannpay' | 'aeropay' | 'x402';
    paymentIntentId?: string;
    transactionId?: string;
    lastPaymentEvent?: any;

    // CannPay payment data
    canpay?: {
        intentId: string;
        transactionNumber?: string;
        status: string;
        amount: number;
        tipAmount?: number;
        deliveryFee?: number;
        passthrough?: string;
        merchantOrderId?: string;
        authorizedAt?: string;
        completedAt?: string;
    };

    // Aeropay payment data
    aeropay?: OrderAeropayData;

    // USDC payment data (x402 / Base network)
    usdc?: {
        paymentAddress: string;   // dispensary wallet that received USDC
        amountUsdc: number;       // USDC amount (= USD amount, 1:1)
        intentId?: string;        // Firestore x402_deposits doc ID
        txHash?: string;
        confirmedAt?: string;
    };

    // Shipping fields for e-commerce orders
    billingAddress?: BillingAddress;
    purchaseModel?: PurchaseModel;
    shippingAddress?: ShippingAddress;
    fulfillmentStatus?: FulfillmentStatus;
    trackingNumber?: string;
    shippingCarrier?: string;
    shippedAt?: Timestamp;
    deliveredAt?: Timestamp;

    // Delivery fields for cannabis delivery
    fulfillmentType?: 'pickup' | 'delivery';
    deliveryId?: string; // links to deliveries collection
    deliveryFee?: number; // separate line item in totals
    deliveryWindow?: { start: Timestamp; end: Timestamp };
    deliveryInstructions?: string; // customer notes for driver
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
