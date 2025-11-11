'use client';
import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp,
} from "firebase/firestore";
import type { Product } from '@/lib/types';


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
const makeConverter = <T extends { id: string }>() =>
  ({
    toFirestore: (modelObject: T) => {
      const { id, ...rest } = modelObject as any;
      return rest; // don't store id in doc body
    },
    fromFirestore: (snap: QueryDocumentSnapshot, options: SnapshotOptions) => {
      const data = snap.data(options) as Omit<T, "id">;
      return { id: snap.id, ...(data as any) } as T;
    },
  }) as FirestoreDataConverter<T>;

export const productConverter = makeConverter<Product>();
export const orderConverter = makeConverter<OrderDoc>();
export const reviewConverter = makeConverter<Review>();
export const interactionConverter = makeConverter<UserInteraction>();
