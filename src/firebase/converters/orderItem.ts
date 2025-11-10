
'use client';

import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  DocumentData,
} from 'firebase/firestore';
import type { OrderItemDoc } from '@/lib/types';

export const orderItemConverter: FirestoreDataConverter<OrderItemDoc> = {
  toFirestore({ id, ...rest }: OrderItemDoc): DocumentData {
    return rest;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): OrderItemDoc {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      productId: data.productId,
      productName: data.productName,
      quantity: data.quantity,
      price: data.price,
    };
  },
};
