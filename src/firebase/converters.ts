'use client';
import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp,
} from "firebase/firestore";

// ---- Domain types (adjust fields to your actual schema) ----
export type OrderDoc = {
  id: string;
  brandId?: string;
  userId: string;
  customer: {
    name: string;
    email?: string;
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
    total: number;
  };
  locationId: string;
  status: "submitted" | "pending" | "confirmed" | "ready" | "completed" | "cancelled";
  createdAt: Timestamp;
  mode: 'demo' | 'live';
};

export type Review = {
  id: string;
  brandId?: string;
  productId: string;
  userId: string;
  rating: number; // 1..5
  text: string;
  createdAt: Timestamp;
};

export type UserInteraction = {
  id: string;
  brandId?: string;
  userId: string;
  interactionDate: Timestamp;
  query: string;
  recommendedProductIds?: string[];
};

// ---- Generic helpers ----
function withId<T extends object>(snap: QueryDocumentSnapshot, data: any): T {
  return { id: snap.id, ...(data as object) } as T;
}

// ---- Converters ----
export const orderConverter: FirestoreDataConverter<OrderDoc> = {
  toFirestore: (order: OrderDoc) => {
    const { id, ...rest } = order;
    return rest;
  },
  fromFirestore: (snap: QueryDocumentSnapshot, _opts: SnapshotOptions): OrderDoc => {
    const data = snap.data(_opts);
    // Ensure nested objects and arrays have default values if they are missing
    return {
      id: snap.id,
      userId: data.userId || '',
      customer: data.customer || { name: 'Unknown', email: '' },
      items: data.items || [],
      totals: data.totals || { subtotal: 0, tax: 0, total: 0 },
      locationId: data.locationId || '',
      status: data.status || 'submitted',
      createdAt: data.createdAt || Timestamp.now(),
      mode: data.mode || 'live',
      brandId: data.brandId,
    };
  },
};

export const reviewConverter: FirestoreDataConverter<Review> = {
  toFirestore: (doc: Review) => {
    const { id, ...rest } = doc;
    return rest;
  },
  fromFirestore: (snap: QueryDocumentSnapshot): Review => {
    const data = snap.data();
    return {
        id: snap.id,
        productId: data.productId || '',
        userId: data.userId || '',
        rating: data.rating || 0,
        text: data.text || '',
        createdAt: data.createdAt || Timestamp.now(),
        brandId: data.brandId,
    }
  },
};

export const interactionConverter: FirestoreDataConverter<UserInteraction> = {
  toFirestore: (doc: UserInteraction) => {
    const { id, ...rest } = doc;
    return rest;
  },
  fromFirestore: (snap: QueryDocumentSnapshot): UserInteraction => {
     const data = snap.data();
     return {
        id: snap.id,
        userId: data.userId || '',
        interactionDate: data.interactionDate || Timestamp.now(),
        query: data.query || '',
        recommendedProductIds: data.recommendedProductIds || [],
        brandId: data.brandId,
     }
  },
};
