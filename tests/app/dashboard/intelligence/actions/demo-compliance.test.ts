
import { scanDemoCompliance } from '@/app/dashboard/intelligence/actions/demo-compliance';
import { discovery } from '@/server/services/firecrawl';
import { extractFromUrl } from '@/server/services/rtrvr';

// Mock Modules
jest.mock('@/server/services/firecrawl', () => ({
    discovery: {
        isConfigured: jest.fn(),
        discoverUrl: jest.fn(),
    }
}));

jest.mock('@/server/services/rtrvr', () => ({
    extractFromUrl: jest.fn(),
}));

describe('scanDemoCompliance', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (discovery.isConfigured as jest.Mock).mockReturnValue(true);
    });

    it('should use Firecrawl when available and successful', async () => {
        // Mock Firecrawl Success
        (discovery.discoverUrl as jest.Mock).mockResolvedValue({
            success: true,
            data: { markdown: 'This site contains age verification for 21+ only.' }
        });

        const result = await scanDemoCompliance('https://testElement.com');

        expect(discovery.discoverUrl).toHaveBeenCalled();
        expect(extractFromUrl).not.toHaveBeenCalled(); // Should NOT call RTRVR
        expect(result.success).toBe(true);
        expect(result.source).toBe('firecrawl');
        expect(result.details.passing).toContain('✅ Age Gate Detected');
    });

    it('should fallback to RTRVR when Firecrawl fails', async () => {
        // Mock Firecrawl Failure
        (discovery.discoverUrl as jest.Mock).mockResolvedValue({ success: false });

        // Mock RTRVR Success
        (extractFromUrl as jest.Mock).mockResolvedValue({
            success: true,
            data: { result: { text: 'This text is from RTRVR agent scan. 21+ only.' } }
        });

        const result = await scanDemoCompliance('https://testElement.com');

        expect(discovery.discoverUrl).toHaveBeenCalled();
        expect(extractFromUrl).toHaveBeenCalled(); // MUST call RTRVR
        expect(result.success).toBe(true);
        expect(result.source).toBe('rtrvr');
        expect(result.preview).toContain('DEEP AGENT SCAN');
        expect(result.details.passing).toContain('✅ Age Gate Detected');
    });

    it('should fallback to Mock when both fail', async () => {
        // Mock Failure for both
        (discovery.discoverUrl as jest.Mock).mockResolvedValue({ success: false });
        (extractFromUrl as jest.Mock).mockResolvedValue({ success: false });

        const result = await scanDemoCompliance('https://testElement.com');

        expect(discovery.discoverUrl).toHaveBeenCalled();
        expect(extractFromUrl).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.source).toBe('mock');
        expect(result.details.warnings).toContain('Deep scan unavailable - Site blocked automated inspectors.');
    });
});
