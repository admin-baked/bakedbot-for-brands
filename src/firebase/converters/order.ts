
'use client';

import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import type { OrderDoc } from '@/lib/types';

export const orderConverter: FirestoreDataConverter<OrderDoc> = {
  toFirestore(order: OrderDoc): DocumentData {
    const { id, ...rest } = order;
    return rest;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): OrderDoc {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      userId: data.userId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerBirthDate: data.customerBirthDate,
      locationId: data.locationId,
      orderDate: data.orderDate as Timestamp,
      totalAmount: data.totalAmount,
      status: data.status,
      idImageUrl: data.idImageUrl,
    };
  },
};
