import { z } from 'zod';
import { getAdminFirestore } from '@/firebase/admin';
import { requireSuperUser } from '@/server/auth/auth';

export const queryDatabaseSchemaToolDef = {
    name: 'query_database_schema',
    description: 'Query the Firestore database to discover root collections, or sample a specific collection to infer its document schema/structure. WARNING: Requires super_user role.',
    schema: z.object({
        action: z.enum(['list_collections', 'sample_collection']).describe('Whether to list all collections or sample a specific collection.'),
        collectionName: z.string().optional().describe('The name of the collection to sample. Required if action is sample_collection.'),
        sampleSize: z.number().optional().describe('Number of documents to sample (default 1, max 5).')
    }),
    async execute(inputs: any, context?: any) {
        // Require super_user for database queries
        await requireSuperUser();
        
        const db = getAdminFirestore();
        try {
            if (inputs.action === 'list_collections') {
                const collections = await db.listCollections();
                return {
                    success: true,
                    collections: collections.map(c => c.id)
                };
            } 
            
            if (inputs.action === 'sample_collection') {
                if (!inputs.collectionName) return { success: false, error: 'collectionName is required for sample_collection' };
                const limit = Math.min(inputs.sampleSize || 1, 5);
                const snapshot = await db.collection(inputs.collectionName).limit(limit).get();
                
                if (snapshot.empty) {
                    return { success: true, message: `Collection ${inputs.collectionName} exists but has no documents.` };
                }
                
                const docs = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
                
                // Helper to infer schema from an object deeply
                const schemaInfer = (obj: any): any => {
                    const result: any = {};
                    for (const [key, val] of Object.entries(obj)) {
                        if (val === null) result[key] = 'null';
                        else if (Array.isArray(val)) {
                            result[key] = val.length > 0 ? `Array<${typeof val[0]}>` : 'Array';
                        }
                        else if (typeof val === 'object') {
                            if ('toDate' in val && typeof val.toDate === 'function') {
                                result[key] = 'Firestore.Timestamp';
                            } else {
                                result[key] = schemaInfer(val);
                            }
                        }
                        else result[key] = typeof val;
                    }
                    return result;
                };

                return {
                    success: true,
                    inferredSchema: schemaInfer(docs[0].data),
                    samples: docs
                };
            }
            return { success: false, error: 'Unknown action' };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
};
