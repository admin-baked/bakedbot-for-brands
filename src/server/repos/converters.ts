
import { FirestoreDataConverter, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import type { Product } from '@/types/domain';

// Generic helper for Admin SDK converters
const makeAdminConverter = <T extends { id: string }>() =>
    ({
        toFirestore(modelObject: T): FirebaseFirestore.DocumentData {
            const { id, ...rest } = modelObject as any;
            return rest;
        },
        fromFirestore(snapshot: QueryDocumentSnapshot): T {
            const data = snapshot.data();
            return { id: snapshot.id, ...data } as T;
        },
    }) as FirestoreDataConverter<T>;

export const productAdminConverter = makeAdminConverter<Product>();
