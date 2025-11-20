
'use client';
import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from "firebase/firestore";
import type { Product, Retailer, OrderDoc, Review, UserInteraction, Location, Coupon } from '@/types/domain';

// Re-export the types so they can be imported from this module
export type { Product, Retailer, OrderDoc, Review, UserInteraction, Location, Coupon };


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
export const couponConverter = makeConverter<Coupon>();
export const retailerConverter: FirestoreDataConverter<Retailer> = {
  toFirestore(retailer: Retailer) {
    const { id, ...rest } = retailer;
    return rest;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, _opts: SnapshotOptions): Retailer {
    const d = snapshot.data();
    return {
      id: snapshot.id,
      name: d.name ?? '',
      address: d.address ?? '',
      city: d.city ?? '',
      state: d.state ?? '',
      zip: d.zip ?? '',
      phone: d.phone,
      email: d.email,
      lat: d.lat,
      lon: d.lon,
      distance: d.distance,
      tabletDeviceToken: d.tabletDeviceToken,
      acceptsOrders: d.acceptsOrders,
      status: d.status,
    };
  },
};

    
