'use client';
import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from "firebase/firestore";
import type { Product, Location, OrderDoc, Review, UserInteraction } from '@/types/domain';

// Re-export the types so they can be imported from this module
export type { Product, Location, OrderDoc, Review, UserInteraction };


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
export const locationConverter: FirestoreDataConverter<Location> = {
  toFirestore(loc: Location) {
    const { id, ...rest } = loc;
    return rest;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, _opts: SnapshotOptions): Location {
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
    };
  },
};
