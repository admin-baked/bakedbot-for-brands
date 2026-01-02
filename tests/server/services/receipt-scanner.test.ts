// Mock Genkit and server-only immediately to prevent ESM/Next.js import issues
jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('@/ai/genkit', () => ({
    ai: {
        generate: jest.fn()
    }
}));

import { ReceiptScanner } from '@/server/services/vision/receipt-scanner';
import { ai } from '@/ai/genkit';

describe('ReceiptScanner Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should extract receipt data successfully', async () => {
        const mockOutput = {
            merchantName: 'Essex Apothecary',
            totalAmount: 42.0,
            transactionDate: '2026-01-01',
            items: [
                { name: 'Sleepy Gummies', price: 20.0, category: 'edible' },
                { name: 'Blue Dream Flower', price: 22.0, category: 'flower' }
            ],
            confidence: 0.95
        };

        (ai.generate as jest.Mock).mockResolvedValue({
            output: mockOutput
        });

        const result = await ReceiptScanner.scan('https://example.com/receipt.jpg');
        
        expect(result).toEqual(mockOutput);
        expect(ai.generate).toHaveBeenCalledWith(expect.objectContaining({
            model: 'googleai/gemini-2.5-flash-lite',
            prompt: expect.arrayContaining([
                expect.objectContaining({ text: expect.any(String) }),
                expect.objectContaining({ media: { url: 'https://example.com/receipt.jpg' } })
            ])
        }));
    });

    it('should throw error if scanning fails', async () => {
        (ai.generate as jest.Mock).mockRejectedValue(new Error('AI Failure'));
        
        await expect(ReceiptScanner.scan('invalid_url'))
            .rejects.toThrow('Failed to scan receipt.');
    });
});
