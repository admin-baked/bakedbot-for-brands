
import { DeeboComplianceEval } from '@/lib/evals/deebo-compliance';
import { CartItem } from '@/lib/compliance/compliance-rules';

describe('DeeboComplianceEval', () => {
    const evalInstance = new DeeboComplianceEval();

    it('should pass for valid California flower purchase', async () => {
        const cart: CartItem[] = [{ productType: 'flower', quantity: 20 }]; // Limit is 28.5g
        const result = await evalInstance.run({ cart, state: 'CA' });
        
        expect(result.passed).toBe(true);
        expect(result.score).toBe(1);
        expect(result.feedback).toContain('compliant');
    });

    it('should fail for excessive Flower purchase in Illinois', async () => {
        const cart: CartItem[] = [{ productType: 'flower', quantity: 40 }]; // Limit is 30g
        const result = await evalInstance.run({ cart, state: 'IL' });
        
        expect(result.passed).toBe(false);
        expect(result.score).toBe(0);
        expect(result.feedback).toContain('Flower limit exceeded');
    });

    it('should fail for excessive Concentrate purchase in California', async () => {
        const cart: CartItem[] = [{ productType: 'concentrate', quantity: 10 }]; // Limit is 8g
        const result = await evalInstance.run({ cart, state: 'CA' });
        
        expect(result.passed).toBe(false);
        expect(result.score).toBe(0);
        expect(result.feedback).toContain('Concentrate limit exceeded');
    });

    it('should pass for legal medical purchase in Florida (if medical check is simulated)', async () => {
        const cart: CartItem[] = [{ productType: 'flower', quantity: 10 }];
        const result = await evalInstance.run({ cart, state: 'FL' });
        
        expect(result.passed).toBe(true);
        // Should have a warning about medical card
        expect(result.metadata?.warnings).toContain('Florida requires a medical card for purchase');
    });
});
