
import { Eval, EvalResult } from './engine';
import { validatePurchaseLimit, CartItem } from '@/lib/compliance/compliance-rules';

export class DeeboComplianceEval implements Eval {
    name = 'Deebo Daily Purchase Limit Eval';
    category: 'security' = 'security';

    async run(input: { cart: CartItem[], state: string }): Promise<EvalResult> {
        const { cart, state } = input;
        const validation = validatePurchaseLimit(cart, state);

        return {
            testName: `Compliance Check: ${state}`,
            passed: validation.valid,
            score: validation.valid ? 1 : 0,
            feedback: validation.valid 
                ? `Cart is compliant with ${state} laws.` 
                : `Cart violated ${state} limits: ${validation.errors.join(', ')}`,
            metadata: {
                errors: validation.errors,
                warnings: validation.warnings
            }
        };
    }
}
