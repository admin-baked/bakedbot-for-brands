import fs from 'fs';
import path from 'path';

type IndexField = {
    fieldPath: string;
    order?: string;
};

type FirestoreIndex = {
    collectionGroup: string;
    fields: IndexField[];
};

function hasCustomersComposite(indexes: FirestoreIndex[], targetField: string): boolean {
    return indexes.some((index) => {
        if (index.collectionGroup !== 'customers') return false;
        const fieldPaths = index.fields.map((field) => field.fieldPath);
        return (
            fieldPaths.length >= 3 &&
            fieldPaths[0] === 'orgId' &&
            fieldPaths[1] === targetField &&
            fieldPaths.includes('__name__')
        );
    });
}

describe('firestore.indexes.json (Thrive/Loyalty additions)', () => {
    const indexesPath = path.join(process.cwd(), 'firestore.indexes.json');
    const indexesFile = JSON.parse(fs.readFileSync(indexesPath, 'utf-8')) as {
        indexes: FirestoreIndex[];
    };

    it('contains customers indexes for loyalty and churn sort/query fields', () => {
        expect(hasCustomersComposite(indexesFile.indexes, 'points')).toBe(true);
        expect(hasCustomersComposite(indexesFile.indexes, 'churnProbability')).toBe(true);
    });

    it('contains customers indexes for lifecycle scoring fields', () => {
        expect(hasCustomersComposite(indexesFile.indexes, 'tierUpdatedAt')).toBe(true);
        expect(hasCustomersComposite(indexesFile.indexes, 'daysSinceLastOrder')).toBe(true);
    });
});
