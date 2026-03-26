jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }
}));

jest.mock('../deebo', () => ({
    deebo: {
        checkMarketingCompliance: jest.fn(),
    }
}));

import { deebo } from '../deebo';
import { maybeAnswerComplianceGuidance } from '../deebo-agent-impl';

describe('maybeAnswerComplianceGuidance', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns grounded state rules for NY compliance lookup without audit mode', async () => {
        const response = await maybeAnswerComplianceGuidance('What are the NY email compliance rules?');

        expect(response).toContain('### New York EMAIL Compliance');
        expect(response).toContain('Citations: 9 NYCRR');
        expect((deebo.checkMarketingCompliance as jest.Mock)).not.toHaveBeenCalled();
    });

    it('runs a direct audit when the request includes draft copy', async () => {
        (deebo.checkMarketingCompliance as jest.Mock).mockResolvedValue({
            status: 'fail',
            verdict: 'NON-COMPLIANT - medical claim',
            violations: ['Medical claim detected'],
            suggestions: ['Remove the medical claim'],
            citations: ['9 NYCRR §116.4'],
        });

        const response = await maybeAnswerComplianceGuidance('Check this NY SMS draft: "This product cures pain fast."');

        expect(deebo.checkMarketingCompliance).toHaveBeenCalledWith(
            'NY',
            'sms',
            'Check this NY SMS draft: "This product cures pain fast."'
        );
        expect(response).toContain('### NY SMS Audit');
        expect(response).toContain('Medical claim detected');
        expect(response).toContain('9 NYCRR §116.4');
    });
});
