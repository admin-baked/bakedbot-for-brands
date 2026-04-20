// Mock for @/lib/firebase/admin — chainable Firestore + Auth stubs
function createQuerySnapshot(docs = []) {
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (cb) => docs.forEach(cb),
  };
}

function createDocSnapshot(data = null, id = 'mock-id') {
  return {
    exists: data !== null,
    id,
    ref: { id, path: `mock/${id}` },
    data: () => data,
    get: (field) => data?.[field],
  };
}

function createDocRef(id = 'mock-id') {
  const ref = {
    id,
    path: `mock/${id}`,
    get: jest.fn().mockResolvedValue(createDocSnapshot(null, id)),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    collection: jest.fn(() => createCollectionRef()),
    withConverter: jest.fn(() => ref),
  };
  return ref;
}

function createCollectionRef() {
  const snap = createQuerySnapshot();
  const ref = {
    doc: jest.fn((id) => createDocRef(id || 'mock-id')),
    add: jest.fn().mockResolvedValue(createDocRef()),
    get: jest.fn().mockResolvedValue(snap),
    where: jest.fn(() => ref),
    orderBy: jest.fn(() => ref),
    limit: jest.fn(() => ref),
    offset: jest.fn(() => ref),
    startAfter: jest.fn(() => ref),
    endBefore: jest.fn(() => ref),
    select: jest.fn(() => ref),
    withConverter: jest.fn(() => ref),
    count: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) }) })),
    listDocuments: jest.fn().mockResolvedValue([]),
  };
  return ref;
}

function createFirestoreInstance() {
  return {
    collection: jest.fn(() => createCollectionRef()),
    doc: jest.fn((path) => createDocRef(path || 'mock-id')),
    collectionGroup: jest.fn(() => createCollectionRef()),
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    })),
    runTransaction: jest.fn((fn) => fn({
      get: jest.fn().mockResolvedValue(createDocSnapshot(null)),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
    settings: jest.fn(),
  };
}

const firestoreInstance = createFirestoreInstance();

module.exports = {
  getAdminFirestore: jest.fn(() => firestoreInstance),
  getAdminAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'mock-uid', email: 'test@example.com' }),
    getUser: jest.fn().mockResolvedValue({ uid: 'mock-uid', email: 'test@example.com', customClaims: {} }),
    setCustomUserClaims: jest.fn().mockResolvedValue(undefined),
    createSessionCookie: jest.fn().mockResolvedValue('mock-session-cookie'),
    verifySessionCookie: jest.fn().mockResolvedValue({ uid: 'mock-uid', email: 'test@example.com' }),
    createUser: jest.fn().mockResolvedValue({ uid: 'mock-uid' }),
    updateUser: jest.fn().mockResolvedValue({ uid: 'mock-uid' }),
    deleteUser: jest.fn().mockResolvedValue(undefined),
    listUsers: jest.fn().mockResolvedValue({ users: [] }),
  })),
  __firestoreInstance: firestoreInstance,
  __createCollectionRef: createCollectionRef,
  __createDocRef: createDocRef,
  __createDocSnapshot: createDocSnapshot,
  __createQuerySnapshot: createQuerySnapshot,
};
