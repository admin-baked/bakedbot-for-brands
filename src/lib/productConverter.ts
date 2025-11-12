import {
    FirestoreDataConverter,
    QueryDocumentSnapshot,
    SnapshotOptions,
    DocumentData,
    Timestamp,
  } from 'firebase/firestore';
  
  export type Product = {
    id: string;
    name: string;
    category: string;
    price: number;
    brandId: string;
    description?: string;
    imageUrl?: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
  
  const toDate = (v: any): Date | undefined =>
    v instanceof Timestamp ? v.toDate() : (v as Date | undefined);
  
  export const productConverter: FirestoreDataConverter<Product> = {
    toFirestore(product): DocumentData {
      const { id, ...rest } = product; // Firestore stores its own id
      return rest;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions
    ): Product {
      const data = snapshot.data(options) as any;
      return {
        id: snapshot.id,
        name: data.name ?? '',
        category: data.category ?? '',
        price: Number(data.price ?? 0),
        brandId: data.brandId ?? '',
        description: data.description,
        imageUrl: data.imageUrl,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      };
    },
  };
  