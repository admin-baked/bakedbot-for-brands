import { ai } from '@/ai/genkit';
import { z } from 'zod';

export interface ExtractedReceiptItem {
    name: string;
    price: number;
    quantity?: number;
    category?: 'flower' | 'edible' | 'vape' | 'concentrate' | 'other';
}

export interface ExtractedReceipt {
    merchantName: string;
    totalAmount: number;
    transactionDate?: string;
    items: ExtractedReceiptItem[];
    confidence: number;
}

// Prompt for the AI
const RECEIPT_PROMPT = `
Analyze this image of a cannabis dispensary receipt. 
Extract the following information in JSON format:
- Merchant Name (Dispensary Name)
- Total Amount (Final total paid)
- Date (YYYY-MM-DD)
- Items purchased (Name, Price, Category)

Classify items into: flower, edible, vape, concentrate, other.
If the image is not a receipt, return null.
`;

const ReceiptSchema = z.object({
    merchantName: z.string(),
    totalAmount: z.number(),
    transactionDate: z.string().optional(),
    items: z.array(z.object({
        name: z.string(),
        price: z.number(),
        quantity: z.number().optional(),
        category: z.enum(['flower', 'edible', 'vape', 'concentrate', 'other']).optional()
    })),
    confidence: z.number().default(0.9)
});

export class ReceiptScanner {
    
    /**
     * Scans a receipt image URL using Gemini Vision.
     */
    static async scan(imageUrl: string): Promise<ExtractedReceipt | null> {
        try {
            const { output } = await ai.generate({
                model: 'googleai/gemini-2.5-flash-lite', 
                prompt: [
                    { text: RECEIPT_PROMPT },
                    { media: { url: imageUrl } }
                ],
                output: { format: 'json', schema: ReceiptSchema }
            });

            return output;
        } catch (error) {
            console.error('Receipt Scan Error:', error);
            throw new Error('Failed to scan receipt.');
        }
    }
}
