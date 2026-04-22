import {
    archiveProject,
    duplicateProject,
    getProject,
    getProjects,
} from '@/server/actions/projects';
import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));

jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

type ProjectRecord = Record<string, unknown>;
type Filter = { field: string; op: string; value: unknown };

const store = new Map<string, ProjectRecord>();
let nextDocId = 1;

function makeDoc(id: string, data?: ProjectRecord) {
    return {
        id,
        exists: Boolean(data),
        data: () => data,
        ref: { id },
    };
}

function matchesFilter(data: ProjectRecord, filter: Filter): boolean {
    const value = data[filter.field];
    if (filter.op === '==') return value === filter.value;
    if (filter.op === 'array-contains') {
        return Array.isArray(value) && value.includes(filter.value);
    }
    return false;
}

function makeSnapshot(records: Array<[string, ProjectRecord]>) {
    return {
        empty: records.length === 0,
        size: records.length,
        docs: records.map(([id, data]) => makeDoc(id, data)),
    };
}

function makeDocRef(id: string) {
    return {
        id,
        async get() {
            return makeDoc(id, store.get(id));
        },
        async set(data: ProjectRecord) {
            store.set(id, data);
        },
        async update(data: ProjectRecord) {
            store.set(id, { ...(store.get(id) ?? {}), ...data });
        },
    };
}

function makeQuery(filters: Filter[] = []) {
    return {
        where(field: string, op: string, value: unknown) {
            return makeQuery([...filters, { field, op, value }]);
        },
        orderBy() {
            return makeQuery(filters);
        },
        async get() {
            const records = Array.from(store.entries()).filter(([, data]) =>
                filters.every((filter) => matchesFilter(data, filter))
            );
            return makeSnapshot(records);
        },
        doc(id?: string) {
            return makeDocRef(id ?? `new-project-${nextDocId++}`);
        },
    };
}

function buildFirestore() {
    return {
        collection: jest.fn((name: string) => {
            if (name !== 'projects') throw new Error(`Unexpected collection ${name}`);
            return makeQuery();
        }),
    };
}

function projectData(overrides: ProjectRecord = {}): ProjectRecord {
    return {
        ownerId: 'user-1',
        name: 'Project',
        description: '',
        systemInstructions: '',
        color: '#10b981',
        icon: 'Briefcase',
        defaultModel: 'lite',
        documentCount: 0,
        totalBytes: 0,
        chatCount: 0,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        isShared: false,
        sharedWith: [],
        isArchived: false,
        ...overrides,
    };
}

describe('projects server actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        store.clear();
        nextDocId = 1;
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'user-1' });
        (getAdminFirestore as jest.Mock).mockReturnValue(buildFirestore());
    });

    it('returns owned, shared, and directly shared active projects sorted by update time', async () => {
        store.set('owned', projectData({ name: 'Owned', updatedAt: new Date('2026-01-02T00:00:00Z') }));
        store.set('shared', projectData({
            ownerId: 'system',
            name: 'Shared',
            isShared: true,
            updatedAt: new Date('2026-01-03T00:00:00Z'),
        }));
        store.set('direct', projectData({
            ownerId: 'other-user',
            name: 'Direct',
            sharedWith: ['user-1'],
            updatedAt: new Date('2026-01-04T00:00:00Z'),
        }));
        store.set('archived', projectData({
            name: 'Archived',
            isArchived: true,
            updatedAt: new Date('2026-01-05T00:00:00Z'),
        }));

        const projects = await getProjects();

        expect(projects.map((project) => project.id)).toEqual(['direct', 'shared', 'owned']);
    });

    it('allows reading shared projects but hides inaccessible projects', async () => {
        store.set('shared', projectData({ ownerId: 'system', isShared: true }));
        store.set('private', projectData({ ownerId: 'other-user' }));

        await expect(getProject('shared')).resolves.toMatchObject({ id: 'shared' });
        await expect(getProject('private')).resolves.toBeNull();
    });

    it('duplicates a shared project into the current user workspace without copying usage counts', async () => {
        store.set('source', projectData({
            ownerId: 'system',
            name: 'System Launch Plan',
            isShared: true,
            documentCount: 8,
            chatCount: 3,
            totalBytes: 4096,
        }));

        const copy = await duplicateProject('source');

        expect(copy).toMatchObject({
            ownerId: 'user-1',
            name: 'System Launch Plan Copy',
            documentCount: 0,
            chatCount: 0,
            totalBytes: 0,
            isShared: false,
        });
        expect(store.get(copy!.id)).toMatchObject({
            ownerId: 'user-1',
            sourceProjectId: 'source',
        });
    });

    it('soft archives only owned projects', async () => {
        store.set('owned', projectData({ ownerId: 'user-1' }));
        store.set('shared', projectData({ ownerId: 'system', isShared: true }));

        await expect(archiveProject('shared')).resolves.toBe(false);
        await expect(archiveProject('owned')).resolves.toBe(true);
        expect(store.get('owned')).toMatchObject({
            isArchived: true,
            status: 'archived',
        });
    });
});
