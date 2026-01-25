import {
    IntelligenceLevel,
    MODEL_TO_LEVEL,
    LEVEL_CONFIG,
    getIntelligenceLevel,
    getIntelligenceLevelConfig,
} from '@/lib/intelligence-levels';

describe('Intelligence Levels', () => {
    describe('MODEL_TO_LEVEL mapping', () => {
        it('maps lite to Standard', () => {
            expect(MODEL_TO_LEVEL['lite']).toBe('Standard');
        });

        it('maps standard to Advanced', () => {
            expect(MODEL_TO_LEVEL['standard']).toBe('Advanced');
        });

        it('maps advanced to Expert', () => {
            expect(MODEL_TO_LEVEL['advanced']).toBe('Expert');
        });

        it('maps premium to Genius', () => {
            expect(MODEL_TO_LEVEL['premium']).toBe('Genius');
        });
    });

    describe('LEVEL_CONFIG', () => {
        it('has config for Standard level', () => {
            expect(LEVEL_CONFIG.Standard).toEqual({
                icon: 'Zap',
                color: 'text-slate-400',
                bgColor: 'bg-slate-400/10',
            });
        });

        it('has config for Advanced level', () => {
            expect(LEVEL_CONFIG.Advanced).toEqual({
                icon: 'Sparkles',
                color: 'text-blue-400',
                bgColor: 'bg-blue-400/10',
            });
        });

        it('has config for Expert level', () => {
            expect(LEVEL_CONFIG.Expert).toEqual({
                icon: 'Brain',
                color: 'text-purple-400',
                bgColor: 'bg-purple-400/10',
            });
        });

        it('has config for Genius level', () => {
            expect(LEVEL_CONFIG.Genius).toEqual({
                icon: 'Crown',
                color: 'text-amber-400',
                bgColor: 'bg-amber-400/10',
            });
        });
    });

    describe('getIntelligenceLevel', () => {
        it('returns Standard for lite model', () => {
            expect(getIntelligenceLevel('lite')).toBe('Standard');
        });

        it('returns Advanced for standard model', () => {
            expect(getIntelligenceLevel('standard')).toBe('Advanced');
        });

        it('returns Expert for advanced model', () => {
            expect(getIntelligenceLevel('advanced')).toBe('Expert');
        });

        it('returns Genius for premium model', () => {
            expect(getIntelligenceLevel('premium')).toBe('Genius');
        });

        it('returns Standard for undefined model', () => {
            expect(getIntelligenceLevel(undefined)).toBe('Standard');
        });

        it('returns Standard for unknown model', () => {
            expect(getIntelligenceLevel('unknown-model')).toBe('Standard');
        });

        it('returns Standard for empty string', () => {
            expect(getIntelligenceLevel('')).toBe('Standard');
        });
    });

    describe('getIntelligenceLevelConfig', () => {
        it('returns full config for lite model', () => {
            const config = getIntelligenceLevelConfig('lite');
            expect(config).toEqual({
                level: 'Standard',
                icon: 'Zap',
                color: 'text-slate-400',
                bgColor: 'bg-slate-400/10',
            });
        });

        it('returns full config for premium model', () => {
            const config = getIntelligenceLevelConfig('premium');
            expect(config).toEqual({
                level: 'Genius',
                icon: 'Crown',
                color: 'text-amber-400',
                bgColor: 'bg-amber-400/10',
            });
        });

        it('returns Standard config for undefined model', () => {
            const config = getIntelligenceLevelConfig(undefined);
            expect(config.level).toBe('Standard');
        });
    });
});
