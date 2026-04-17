type QueryClause = [string, string, unknown];

type QueryDoc = {
  id: string;
  data: () => Record<string, unknown>;
};

let queryClauses: QueryClause[][] = [];
let queryDocsByField = new Map<string, QueryDoc[]>();

function makeDoc(id: string, data: Record<string, unknown>): QueryDoc {
  return {
    id,
    data: () => data,
  };
}

function resolveDocsForClauses(clauses: QueryClause[]): QueryDoc[] {
  queryClauses.push(clauses);
  const fieldClause = clauses.find(([field, operator]) => operator === '==' && field !== 'createdAt');
  if (!fieldClause) {
    return [];
  }

  const [field, , candidateId] = fieldClause;
  return queryDocsByField.get(`${field}:${String(candidateId)}`) ?? [];
}

function createQuery(clauses: QueryClause[] = []) {
  return {
    where: (field: string, operator: string, value: unknown) =>
      createQuery([...clauses, [field, operator, value]]),
    limit: () => createQuery(clauses),
    get: jest.fn().mockImplementation(async () => ({
      docs: resolveDocsForClauses(clauses),
    })),
  };
}

const mockCollection = jest.fn().mockImplementation((name: string) => {
  if (name === 'orders') {
    return createQuery();
  }

  throw new Error(`Unexpected collection ${name}`);
});

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('order-history-query', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    queryClauses = [];
    queryDocsByField = new Map<string, QueryDoc[]>();
  });

  it('deduplicates alias-matched orders and filters results to the requested window', async () => {
    queryDocsByField.set('orgId:org_thrive_syracuse', [
      makeDoc('order-1', {
        createdAt: new Date('2026-04-17T15:00:00.000Z'),
        customerId: 'cust-1',
      }),
    ]);
    queryDocsByField.set('brandId:brand_thrive_syracuse', [
      makeDoc('order-1', {
        createdAt: new Date('2026-04-17T15:00:00.000Z'),
        customerId: 'cust-1',
      }),
      makeDoc('order-2', {
        createdAt: new Date('2026-04-17T17:30:00.000Z'),
        customerEmail: 'repeat@example.com',
      }),
    ]);
    queryDocsByField.set('dispensaryId:org_thrive_syracuse', [
      makeDoc('order-3', {
        createdAt: new Date('2026-04-18T00:15:00.000Z'),
        customerId: 'outside-window',
      }),
    ]);

    const { queryHistoricalOrdersByScope } = await import('../order-history-query');

    const db = {
      collection: mockCollection,
    } as unknown as FirebaseFirestore.Firestore;

    const scope = {
      tenantIds: ['org_thrive_syracuse', 'brand_thrive_syracuse'],
      rootProductQueryIds: {
        orgId: ['org_thrive_syracuse'],
        dispensaryId: ['org_thrive_syracuse'],
        brandId: ['brand_thrive_syracuse'],
      },
    };

    const result = await queryHistoricalOrdersByScope(db, 'org_thrive_syracuse', scope, {
      startDate: new Date('2026-04-17T00:00:00.000Z'),
      endDate: new Date('2026-04-18T00:00:00.000Z'),
    });

    expect(result.orders.map((order) => order.id)).toEqual(['order-1', 'order-2']);
    expect(result.queryMatches).toEqual([
      { field: 'brandId', candidateId: 'brand_thrive_syracuse', count: 2 },
      { field: 'orgId', candidateId: 'org_thrive_syracuse', count: 1 },
    ]);
    expect(queryClauses).toEqual(
      expect.arrayContaining([
        [
          ['brandId', '==', 'brand_thrive_syracuse'],
          ['createdAt', '>=', new Date('2026-04-17T00:00:00.000Z')],
        ],
        [
          ['orgId', '==', 'org_thrive_syracuse'],
          ['createdAt', '>=', new Date('2026-04-17T00:00:00.000Z')],
        ],
      ]),
    );
  });
});
