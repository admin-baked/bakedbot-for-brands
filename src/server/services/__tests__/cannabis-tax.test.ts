/**
 * Unit Tests for Cannabis Tax Service
 *
 * Tests 280E calculations, NY cannabis tax, profitability metrics,
 * GTI Rule price compression, and working capital analysis.
 */

import {
  classifyExpense,
  determineNYCategory,
  calculateNYProductTax,
  calculatePriceCompression,
} from '../cannabis-tax';
import { NY_TAX_RATES, CANNABIS_BENCHMARKS } from '@/types/cannabis-tax';

// Mock Firebase
jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(() => ({
    firestore: {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          collection: jest.fn(() => ({
            where: jest.fn(() => ({
              where: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ docs: [] }),
              })),
              get: jest.fn().mockResolvedValue({ docs: [] }),
            })),
            get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
          })),
          get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
        })),
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              withConverter: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ docs: [] }),
              })),
              get: jest.fn().mockResolvedValue({ docs: [] }),
            })),
            get: jest.fn().mockResolvedValue({ docs: [] }),
          })),
          get: jest.fn().mockResolvedValue({ docs: [] }),
        })),
      })),
    },
  })),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Cannabis Tax Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // EXPENSE CLASSIFICATION TESTS
  // ==========================================================================
  describe('classifyExpense', () => {
    it('should classify product_purchase as cogs_direct', () => {
      expect(classifyExpense('product_purchase')).toBe('cogs_direct');
    });

    it('should classify packaging as cogs_direct', () => {
      expect(classifyExpense('packaging')).toBe('cogs_direct');
    });

    it('should classify lab_testing as cogs_direct', () => {
      expect(classifyExpense('lab_testing')).toBe('cogs_direct');
    });

    it('should classify facility_rent_storage as cogs_indirect', () => {
      expect(classifyExpense('facility_rent_storage')).toBe('cogs_indirect');
    });

    it('should classify labor_inventory as cogs_indirect', () => {
      expect(classifyExpense('labor_inventory')).toBe('cogs_indirect');
    });

    it('should classify utilities_storage as cogs_indirect', () => {
      expect(classifyExpense('utilities_storage')).toBe('cogs_indirect');
    });

    it('should classify marketing as non_deductible', () => {
      expect(classifyExpense('marketing')).toBe('non_deductible');
    });

    it('should classify admin_salaries as non_deductible', () => {
      expect(classifyExpense('admin_salaries')).toBe('non_deductible');
    });

    it('should classify professional_fees as non_deductible', () => {
      expect(classifyExpense('professional_fees')).toBe('non_deductible');
    });

    it('should classify bank_fees as non_deductible', () => {
      expect(classifyExpense('bank_fees')).toBe('non_deductible');
    });
  });

  // ==========================================================================
  // NY PRODUCT CATEGORY TESTS
  // ==========================================================================
  describe('determineNYCategory', () => {
    it('should classify flower products correctly', () => {
      expect(determineNYCategory('Flower')).toBe('flower');
      expect(determineNYCategory('Indoor Flower')).toBe('flower');
      expect(determineNYCategory('Preroll')).toBe('flower');
    });

    it('should classify concentrate products correctly', () => {
      expect(determineNYCategory('Concentrate')).toBe('concentrate');
      expect(determineNYCategory('Live Resin')).toBe('concentrate');
      expect(determineNYCategory('Wax')).toBe('concentrate');
      expect(determineNYCategory('Shatter')).toBe('concentrate');
      expect(determineNYCategory('Distillate')).toBe('concentrate');
      expect(determineNYCategory('Vape Cartridge')).toBe('concentrate');
    });

    it('should classify edible products correctly', () => {
      expect(determineNYCategory('Edible')).toBe('edible');
      expect(determineNYCategory('Gummy')).toBe('edible');
      expect(determineNYCategory('Chocolate')).toBe('edible');
      expect(determineNYCategory('Beverage')).toBe('edible');
    });

    it('should default to flower for unknown categories', () => {
      expect(determineNYCategory('Unknown')).toBe('flower');
      expect(determineNYCategory('Accessory')).toBe('flower');
    });
  });

  // ==========================================================================
  // NY PRODUCT TAX CALCULATION TESTS
  // ==========================================================================
  describe('calculateNYProductTax', () => {
    it('should calculate flower tax correctly', () => {
      const result = calculateNYProductTax(
        'prod1',
        'Blue Dream 3.5g',
        'Flower',
        350, // 350mg THC
        50   // $50 retail
      );

      expect(result.category).toBe('flower');
      expect(result.potencyTax).toBeCloseTo(350 * 0.005); // $1.75
      expect(result.salesTax).toBeCloseTo(50 * 0.13);     // $6.50
      expect(result.totalTax).toBeCloseTo(1.75 + 6.50);   // $8.25
      expect(result.priceAfterTax).toBeCloseTo(50 + 8.25);
    });

    it('should calculate concentrate tax correctly', () => {
      const result = calculateNYProductTax(
        'prod2',
        'Live Resin 1g',
        'Concentrate',
        800, // 800mg THC
        70   // $70 retail
      );

      expect(result.category).toBe('concentrate');
      expect(result.potencyTax).toBeCloseTo(800 * 0.008); // $6.40
      expect(result.salesTax).toBeCloseTo(70 * 0.13);     // $9.10
      expect(result.totalTax).toBeCloseTo(6.40 + 9.10);   // $15.50
    });

    it('should calculate edible tax correctly', () => {
      const result = calculateNYProductTax(
        'prod3',
        'Gummies 100mg',
        'Edible',
        100, // 100mg THC
        25   // $25 retail
      );

      expect(result.category).toBe('edible');
      expect(result.potencyTax).toBeCloseTo(100 * 0.03);  // $3.00
      expect(result.salesTax).toBeCloseTo(25 * 0.13);     // $3.25
      expect(result.totalTax).toBeCloseTo(3.00 + 3.25);   // $6.25
    });

    it('should calculate effective tax rate correctly', () => {
      const result = calculateNYProductTax(
        'prod4',
        'Test Product',
        'Flower',
        200,
        40
      );

      const expectedTax = (200 * 0.005) + (40 * 0.13); // 1 + 5.2 = 6.2
      expect(result.effectiveTaxRate).toBeCloseTo(expectedTax / 40);
    });
  });

  // ==========================================================================
  // PRICE COMPRESSION / GTI RULE TESTS
  // ==========================================================================
  describe('calculatePriceCompression (GTI Rule)', () => {
    it('should calculate 20% price drop requires 25% volume increase', () => {
      const result = calculatePriceCompression(50, 1000, 0.20);

      // GTI Rule: 0.20 / (1 - 0.20) = 0.20 / 0.80 = 0.25
      expect(result.requiredVolumeIncrease).toBeCloseTo(0.25);
      expect(result.requiredNewVolume).toBeCloseTo(1250);
      expect(result.currentRevenue).toBe(50000);
    });

    it('should calculate 10% price drop requires ~11% volume increase', () => {
      const result = calculatePriceCompression(100, 500, 0.10);

      // GTI Rule: 0.10 / 0.90 = 0.1111...
      expect(result.requiredVolumeIncrease).toBeCloseTo(0.1111, 3);
    });

    it('should calculate 30% price drop requires ~43% volume increase', () => {
      const result = calculatePriceCompression(75, 2000, 0.30);

      // GTI Rule: 0.30 / 0.70 = 0.4286
      expect(result.requiredVolumeIncrease).toBeCloseTo(0.4286, 3);
    });

    it('should generate multiple scenarios', () => {
      const result = calculatePriceCompression(50, 1000, 0.20);

      expect(result.scenarios).toHaveLength(5);
      expect(result.scenarios[0].priceDropPercent).toBe(0.10);
      expect(result.scenarios[1].priceDropPercent).toBe(0.15);
      expect(result.scenarios[2].priceDropPercent).toBe(0.20);
      expect(result.scenarios[3].priceDropPercent).toBe(0.25);
      expect(result.scenarios[4].priceDropPercent).toBe(0.30);
    });

    it('should generate recommendations for significant price drops', () => {
      const result = calculatePriceCompression(50, 1000, 0.25);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('tiered pricing'))).toBe(true);
    });
  });

  // ==========================================================================
  // TAX RATE CONSTANTS TESTS
  // ==========================================================================
  describe('NY_TAX_RATES constant', () => {
    it('should have correct potency tax rates', () => {
      expect(NY_TAX_RATES.potencyTax.flower).toBe(0.005);
      expect(NY_TAX_RATES.potencyTax.concentrate).toBe(0.008);
      expect(NY_TAX_RATES.potencyTax.edible).toBe(0.03);
    });

    it('should have 13% sales tax', () => {
      expect(NY_TAX_RATES.salesTax).toBe(0.13);
    });
  });

  // ==========================================================================
  // BENCHMARK CONSTANTS TESTS
  // ==========================================================================
  describe('CANNABIS_BENCHMARKS constant', () => {
    it('should have revenue per sq ft benchmarks', () => {
      expect(CANNABIS_BENCHMARKS.revenuePerSqFt.poor).toBe(500);
      expect(CANNABIS_BENCHMARKS.revenuePerSqFt.average).toBe(974);
      expect(CANNABIS_BENCHMARKS.revenuePerSqFt.good).toBe(1500);
      expect(CANNABIS_BENCHMARKS.revenuePerSqFt.excellent).toBe(2500);
    });

    it('should have gross margin benchmarks', () => {
      expect(CANNABIS_BENCHMARKS.grossMargin.poor).toBe(0.30);
      expect(CANNABIS_BENCHMARKS.grossMargin.average).toBe(0.45);
      expect(CANNABIS_BENCHMARKS.grossMargin.good).toBe(0.55);
      expect(CANNABIS_BENCHMARKS.grossMargin.excellent).toBe(0.65);
    });

    it('should have inventory turnover benchmarks', () => {
      expect(CANNABIS_BENCHMARKS.inventoryTurnover.poor).toBe(4);
      expect(CANNABIS_BENCHMARKS.inventoryTurnover.average).toBe(8);
      expect(CANNABIS_BENCHMARKS.inventoryTurnover.good).toBe(12);
      expect(CANNABIS_BENCHMARKS.inventoryTurnover.excellent).toBe(18);
    });

    it('should have category margin targets', () => {
      expect(CANNABIS_BENCHMARKS.categoryMargins.flower).toBe(0.40);
      expect(CANNABIS_BENCHMARKS.categoryMargins.concentrate).toBe(0.50);
      expect(CANNABIS_BENCHMARKS.categoryMargins.edible).toBe(0.55);
    });
  });
});
