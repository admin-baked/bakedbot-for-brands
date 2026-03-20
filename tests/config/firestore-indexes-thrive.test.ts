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

function hasInsightsComposite(indexes: FirestoreIndex[]): boolean {
    return indexes.some((index) => {
        if (index.collectionGroup !== 'insights') return false;
        const fields = index.fields;
        return (
            fields.length >= 4 &&
            fields[0]?.fieldPath === 'severity' &&
            fields[0]?.order === 'ASCENDING' &&
            fields[1]?.fieldPath === 'generatedAt' &&
            fields[1]?.order === 'DESCENDING' &&
            fields[2]?.fieldPath === 'expiresAt' &&
            fields[2]?.order === 'DESCENDING' &&
            fields[3]?.fieldPath === '__name__'
        );
    });
}

function hasPlatformBlogPublishedComposite(indexes: FirestoreIndex[]): boolean {
    return indexes.some((index) => {
        if (index.collectionGroup !== 'blog_posts') return false;
        const fields = index.fields;
        return (
            fields.length >= 2 &&
            fields[0]?.fieldPath === 'status' &&
            fields[0]?.order === 'ASCENDING' &&
            fields[1]?.fieldPath === 'publishedAt' &&
            fields[1]?.order === 'DESCENDING'
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

    it('contains the insights composite needed by the inbox proactive briefing query', () => {
        expect(hasInsightsComposite(indexesFile.indexes)).toBe(true);
    });

    it('contains the platform blog composite needed for published post sorting', () => {
        expect(hasPlatformBlogPublishedComposite(indexesFile.indexes)).toBe(true);
    });
});
