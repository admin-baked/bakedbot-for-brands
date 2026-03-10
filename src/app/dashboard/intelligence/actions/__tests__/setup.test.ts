import { searchLeaflyCompetitors, searchLocalCompetitors } from '../setup';
import { requireUser } from '@/server/auth/auth';
import { searchEntities } from '@/server/actions/discovery-search';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/server/actions/discovery-search', () => ({
  searchEntities: jest.fn(),
}));

jest.mock('@/server/services/integrations/leafly', () => ({
  LeaflyService: jest.fn().mockImplementation(() => ({
    searchDispensaries: jest.fn().mockResolvedValue([
      {
        name: 'Dispensary One',
        address: '123 Main St',
        city: 'Chicago',
        state: 'IL',
        zip: '60601',
        menuUrl: 'https://dispensary-one.com',
      },
    ]),
  })),
}));

describe('competitor setup search actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'user-123' });
  });

  it('searchLocalCompetitors uses brand discovery when type is brand', async () => {
    (searchEntities as jest.Mock).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'brand-1',
          name: 'FlynnStoned',
          url: 'https://flynnstoned.com',
          description: 'Cannabis lifestyle brand',
        },
      ],
    });

    const result = await searchLocalCompetitors('13202', 'brand');

    expect(searchEntities).toHaveBeenCalledWith('brands', 'brand', '13202');
    expect(result).toEqual([
      expect.objectContaining({
        id: 'brand-1',
        name: 'FlynnStoned',
        zip: '13202',
        menuUrl: 'https://flynnstoned.com',
      }),
    ]);
  });

  it('searchLeaflyCompetitors uses discovery search instead of Leafly when type is brand', async () => {
    (searchEntities as jest.Mock).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'brand-2',
          name: 'MFNY',
          url: 'https://mfnycannabis.com',
          description: 'New York craft brand',
        },
      ],
    });

    const result = await searchLeaflyCompetitors('Syracuse', 'NY', 'brand');

    expect(searchEntities).toHaveBeenCalledWith('Syracuse NY', 'brand');
    expect(result).toEqual([
      expect.objectContaining({
        id: 'brand-2',
        name: 'MFNY',
        city: 'Syracuse',
        state: 'NY',
      }),
    ]);
  });

  it('searchLeaflyCompetitors keeps Leafly for dispensary mode', async () => {
    const result = await searchLeaflyCompetitors('Chicago', 'IL', 'dispensary');

    expect(searchEntities).not.toHaveBeenCalled();
    expect(result).toEqual([
      expect.objectContaining({
        name: 'Dispensary One',
        city: 'Chicago',
        state: 'IL',
      }),
    ]);
  });
});
