import { getAdminFirestore } from '@/firebase/admin';
import { getCustomerEmailCoverage } from '@/server/tools/crm-tools';

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

describe('getCustomerEmailCoverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('counts customer profiles with email addresses on file', async () => {
    const get = jest.fn().mockResolvedValue({
      empty: false,
      size: 4,
      docs: [
        { data: () => ({ email: 'a@example.com', phone: '+15550000001' }) },
        { data: () => ({ email: 'b@example.com', phone: '' }) },
        { data: () => ({ email: '   ', phone: '+15550000003' }) },
        { data: () => ({ phone: '+15550000004' }) },
      ],
    });

    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          select: jest.fn(() => ({
            get,
          })),
        })),
      })),
    });

    const result = await getCustomerEmailCoverage('org_thrive_syracuse');

    expect(result.metrics).toMatchObject({
      totalCustomers: 4,
      customersWithEmail: 2,
      customersWithoutEmail: 2,
      emailCoveragePct: 50,
      customersWithPhone: 3,
      phoneCoveragePct: 75,
    });
    expect(result.summary).toContain('Customers with email: 2 of 4 (50%)');
  });
});
