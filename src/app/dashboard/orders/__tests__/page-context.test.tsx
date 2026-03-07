import React from 'react';
import { render, screen } from '@testing-library/react';

const mockRequireUser = jest.fn();
const mockGetOrders = jest.fn();

jest.mock('@/server/auth/auth', () => ({
  requireUser: (...args: any[]) => mockRequireUser(...args),
}));

jest.mock('../actions', () => ({
  getOrders: (...args: any[]) => mockGetOrders(...args),
}));

jest.mock('../orders-client', () => {
  return function OrdersPageClientMock(props: any) {
    return (
      <div>
        <div data-testid="orders-client-org">{props.orgId}</div>
        <div data-testid="orders-client-count">{(props.initialOrders || []).length}</div>
      </div>
    );
  };
});

describe('OrdersPage context wiring regression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes tenant orgId and separate locationId to getOrders for dispensary users', async () => {
    mockRequireUser.mockResolvedValue({
      uid: 'user_1',
      role: 'dispensary',
      orgId: 'org_tenant_1',
      currentOrgId: 'org_old',
      locationId: 'loc_123',
    });
    mockGetOrders.mockResolvedValue({ success: true, data: [] });

    const mod = await import('../page');
    const page = await mod.default();
    render(page as any);

    expect(mockGetOrders).toHaveBeenCalledWith({
      orgId: 'org_tenant_1',
      locationId: 'loc_123',
    });
    expect(screen.getByTestId('orders-client-org')).toHaveTextContent('org_tenant_1');
  });

  it('handles org with no location by passing undefined locationId', async () => {
    mockRequireUser.mockResolvedValue({
      uid: 'user_2',
      role: 'dispensary',
      orgId: 'org_tenant_2',
    });
    mockGetOrders.mockResolvedValue({ success: true, data: [] });

    const mod = await import('../page');
    const page = await mod.default();
    render(page as any);

    expect(mockGetOrders).toHaveBeenCalledWith({
      orgId: 'org_tenant_2',
      locationId: undefined,
    });
  });
});
