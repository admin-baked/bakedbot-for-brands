
import { generateCompetitorReport } from '@/server/services/ezal/report-generator';
import { createServerClient } from '@/firebase/server-client';

// Mock dependencies
jest.mock('@/firebase/server-client');
jest.mock('@/server/services/ezal/competitor-manager');
jest.mock('@/server/services/ezal/diff-engine');

import { listCompetitors } from '@/server/services/ezal/competitor-manager';
import { getRecentInsights, findPriceGaps } from '@/server/services/ezal/diff-engine';

describe('Report Generator', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: {} });
    });

    it('should generate empty state report when no competitors', async () => {
        (listCompetitors as jest.Mock).mockResolvedValue([]);
        (getRecentInsights as jest.Mock).mockResolvedValue([]);
        (findPriceGaps as jest.Mock).mockResolvedValue([]);

        const report = await generateCompetitorReport('test-tenant');
        expect(report).toContain('No competitors configured');
    });

    it('should generate full report with insights', async () => {
        (listCompetitors as jest.Mock).mockResolvedValue([{ name: 'Comp A' }, { name: 'Comp B' }] as any);
        (getRecentInsights as jest.Mock).mockResolvedValue([
            { type: 'out_of_stock', brandName: 'Brand X', competitorId: 'Comp A', currentValue: false },
            { type: 'new_product', brandName: 'Brand Y', competitorId: 'Comp B', currentValue: 25.0 }
        ] as any);
        (findPriceGaps as jest.Mock).mockResolvedValue([
            { 
                category: 'Flower', 
                productName: 'Blue Dream', 
                competitorName: 'Comp A', 
                competitorPrice: 10, 
                ourPrice: 15, 
                gapAbsolute: 5 
            }
        ] as any);

        const report = await generateCompetitorReport('test-tenant');

        expect(report).toContain('COMPETITIVE PRICING SNAPSHOT');
        expect(report).toContain('Comp A vs Comp B');
        expect(report).toContain('Comp A offers Blue Dream ($10.00) vs our $15.00'); // Risk
        expect(report).toContain('Brand X'); // Out of Stock
        expect(report).toContain('Brand Y'); // New Product
    });
});
