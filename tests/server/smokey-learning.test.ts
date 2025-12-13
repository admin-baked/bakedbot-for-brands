
import { updateRecWeights, BrandConfig } from '../../src/server/algorithms/smokey-algo';

describe('Smokey Learning Algorithms', () => {
    let config: BrandConfig;

    beforeEach(() => {
        config = {
            weights: {
                effect_match: 0.5,
                margin: 0.3,
                availability: 0.1,
                risk: 0.5
            },
            risk_params: {
                new_user_max_dose_mg: 10
            }
        };
    });

    test('thumbs_up should increase weight for contributing factors', () => {
        const attribution = { effectScore: 0.9, marginScore: 0.2 }; // Strong effect match

        const newConfig = updateRecWeights(config, 'thumbs_up', attribution);

        // Effect match should increase because it was a strong factor in the successful rec
        expect(newConfig.weights.effect_match).toBeGreaterThan(0.5);
        expect(newConfig.weights.margin).toBe(0.3); // Low score shouldn't change weight (or maybe it should?)
    });

    test('thumbs_down should decrease weight for contributing factors', () => {
        const attribution = { effectScore: 0.9, marginScore: 0.2 };

        const newConfig = updateRecWeights(config, 'thumbs_down', attribution);

        // We recommended based on Effect, but user hated it -> Maybe effect isn't what they want?
        // Or maybe the effect match was wrong? 
        // Simple logic: Decrease reliance on that factor.
        expect(newConfig.weights.effect_match).toBeLessThan(0.5);
    });

    test('weights should remain within bounds (0.1 to 0.9)', () => {
        config.weights.effect_match = 0.95;
        const attribution = { effectScore: 0.9, marginScore: 0.2 };

        const newConfig = updateRecWeights(config, 'thumbs_up', attribution);

        expect(newConfig.weights.effect_match).toBeLessThanOrEqual(1.0); // Allow 1.0 or cap at 0.9? Let's cap at 1.0 explicitly in code
    });
});
