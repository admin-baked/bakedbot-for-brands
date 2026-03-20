
import { getAdminFirestore } from '@/firebase/admin';
import { ITreasuryMemoryAdapter, TreasuryDomainMemory } from './adapter';

const COLLECTION_NAME = 'treasury_memory';
const DOC_ID = 'global';

export class FirestoreMemoryAdapter implements ITreasuryMemoryAdapter {
    async read(): Promise<TreasuryDomainMemory> {
        const db = getAdminFirestore();
        const docRef = db.collection(COLLECTION_NAME).doc(DOC_ID);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new Error('Treasury memory document not found in Firestore');
        }

        // In Firestore we might store fields separately, but for now we expect a 'data' Blob or fields matching the JSON
        // For simplicity and compatibility with the FileAdapter, let's assume the root doc *is* the memory object.
        return doc.data() as TreasuryDomainMemory;
    }

    async write(memory: TreasuryDomainMemory): Promise<void> {
        const db = getAdminFirestore();
        const docRef = db.collection(COLLECTION_NAME).doc(DOC_ID);

        // Overwrite the document with the new memory state
        await docRef.set(memory);
    }
}
