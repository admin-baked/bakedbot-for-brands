type QueryClause = [string, string, unknown];

let countQueryClauses: QueryClause[][] = [];
let countResponses: Array<{ data: () => { count: number } }> = [];

const mockCountGet = jest.fn().mockImplementation(() => {
  const response = countResponses.shift();
  if (!response) {
    throw new Error('No count response queued');
  }

  return Promise.resolve(response);
});

function createQuery(clauses: QueryClause[] = []) {
  return {
    where: (field: string, operator: string, value: unknown) =>
      createQuery([...clauses, [field, operator, value]]),
    count: () => {
      countQueryClauses.push(clauses);
      return {
        get: mockCountGet,
      };
    },
  };
}

const mockCollection = jest.fn().mockImplementation((name: string) => {
  if (name === 'customers') {
    return createQuery();
  }

  return createQuery();
});

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn().mockImplementation(() => ({
    collection: mockCollection,
  })),
}));

import { calculateActiveCustomerCount, getActiveCustomerCount } from '../customer-metrics';

describe('customer metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    countQueryClauses = [];
    countResponses = [
      { data: () => ({ count: 14 }) },
      { data: () => ({ count: 3 }) },
    ];
  });

  it('subtracts archived customers from total customers', async () => {
    await expect(getActiveCustomerCount('org_thrive_syracuse')).resolves.toBe(11);

    expect(countQueryClauses).toEqual([
      [['orgId', '==', 'org_thrive_syracuse']],
      [
        ['orgId', '==', 'org_thrive_syracuse'],
        ['archived', '==', true],
      ],
    ]);
    expect(countQueryClauses.flat()).not.toContainEqual(['archived', '!=', true]);
  });

  it('clamps negative active counts to zero', () => {
    expect(calculateActiveCustomerCount(2, 5)).toBe(0);
  });
});
