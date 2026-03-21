type WhereFilter = {
  field: string;
  op: '==';
  value: unknown;
};

type StoredCollections = Map<string, Map<string, Record<string, unknown>>>;

function copyValue<T>(value: T): T {
  return structuredClone(value);
}

function getCollectionStore(
  store: StoredCollections,
  collectionName: string
): Map<string, Record<string, unknown>> {
  let collection = store.get(collectionName);
  if (!collection) {
    collection = new Map<string, Record<string, unknown>>();
    store.set(collectionName, collection);
  }
  return collection;
}

function matchesFilters(
  data: Record<string, unknown>,
  filters: WhereFilter[]
): boolean {
  return filters.every((filter) => data[filter.field] === filter.value);
}

export function createFirestoreTestHarness() {
  const store: StoredCollections = new Map();
  let autoId = 0;

  function makeDocSnapshot(collectionName: string, id: string) {
    const collectionStore = getCollectionStore(store, collectionName);
    const data = collectionStore.get(id);

    return {
      id,
      exists: data !== undefined,
      data: () => (data ? copyValue(data) : undefined),
    };
  }

  function makeDocRef(collectionName: string, id: string) {
    return {
      id,
      collection(childCollectionName: string) {
        return makeQuery(`${collectionName}/${id}/${childCollectionName}`);
      },
      async set(data: Record<string, unknown>) {
        getCollectionStore(store, collectionName).set(id, copyValue(data));
      },
      async get() {
        return makeDocSnapshot(collectionName, id);
      },
      async update(patch: Record<string, unknown>) {
        const collectionStore = getCollectionStore(store, collectionName);
        const existing = collectionStore.get(id);
        if (!existing) {
          throw new Error(`Document does not exist: ${collectionName}/${id}`);
        }
        collectionStore.set(id, {
          ...existing,
          ...copyValue(patch),
        });
      },
    };
  }

  function makeQuery(collectionName: string, filters: WhereFilter[] = [], maxResults?: number) {
    return {
      doc(id?: string) {
        const resolvedId = id ?? `${collectionName}-${++autoId}`;
        return makeDocRef(collectionName, resolvedId);
      },
      where(field: string, op: '==', value: unknown) {
        return makeQuery(collectionName, [...filters, { field, op, value }], maxResults);
      },
      limit(limitValue: number) {
        return makeQuery(collectionName, filters, limitValue);
      },
      async get() {
        const docs = Array.from(getCollectionStore(store, collectionName).entries())
          .filter(([, data]) => matchesFilters(data, filters))
          .slice(0, maxResults ?? Number.MAX_SAFE_INTEGER)
          .map(([id]) => makeDocSnapshot(collectionName, id));

        return {
          empty: docs.length === 0,
          size: docs.length,
          docs,
        };
      },
      async add(data: Record<string, unknown>) {
        const ref = makeDocRef(collectionName, `${collectionName}-${++autoId}`);
        await ref.set(data);
        return { id: ref.id };
      },
    };
  }

  return {
    firestore: {
      collection(collectionName: string) {
        return makeQuery(collectionName);
      },
      batch() {
        const operations: Array<() => Promise<void>> = [];
        return {
          set(
            docRef: { set: (data: Record<string, unknown>) => Promise<void> },
            data: Record<string, unknown>
          ) {
            operations.push(() => docRef.set(data));
          },
          async commit() {
            for (const operation of operations) {
              await operation();
            }
          },
        };
      },
      doc(path: string) {
        const segments = path.split('/');
        if (segments.length < 2) {
          throw new Error(`Unsupported doc path: ${path}`);
        }
        const collectionName = segments.slice(0, -1).join('/');
        const id = segments[segments.length - 1];
        return makeDocRef(collectionName, id);
      },
    },
    getDocs(collectionName: string) {
      return Array.from(getCollectionStore(store, collectionName).entries()).map(([id, data]) => ({
        id,
        data: copyValue(data),
      }));
    },
  };
}
