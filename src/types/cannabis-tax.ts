/**
 * Cannabis Tax & Profitability Types
 *
 * Handles IRS 280E compliance, NY-specific cannabis taxes,
 * and profitability analysis for dispensaries.
 *
 * Key Concepts:
 * - 280E: Cannabis businesses cannot deduct normal business expenses,
 *   ONLY Cost of Goods Sold (COGS). Effective tax rates can reach 70-90%.
 * - NY Cannabis Tax: Potency-based THC tax + 13% state sales tax
 * - Absorption Costing: Allocating indirect costs into COGS (280E strategy)
 */

// =============================================================================
// 280E TAX & COGS OPTIMIZATION
// =============================================================================

/**
 * Categories for 280E expense classification
 * Deductible = Can be allocated to COGS
 * Non-Deductible = Cannot be deducted under 280E
 */
export type ExpenseCategory280E =
  | 'cogs_direct'           // Direct product costs (always deductible)
  | 'cogs_indirect'         // Allocatable to COGS via absorption costing
  | 'non_deductible';       // Operating expenses (NOT deductible under 280E)

/**
 * Expense subcategories for detailed 280E tracking
 */
export type ExpenseSubcategory =
  // Direct COGS (always deductible)
  | 'product_purchase'      // Wholesale product purchases
  | 'packaging'             // Product packaging materials
  | 'lab_testing'           // Required lab testing (CoA)
  | 'excise_tax_wholesale'  // Excise taxes paid on wholesale

  // Indirect COGS (allocatable via absorption costing)
  | 'facility_rent_storage' // Rent for inventory storage areas
  | 'utilities_storage'     // Utilities for storage/cultivation areas
  | 'labor_inventory'       // Labor directly handling inventory
  | 'security_inventory'    // Security for product storage
  | 'insurance_inventory'   // Insurance on inventory
  | 'depreciation_equipment'// Equipment depreciation for inventory handling

  // Non-Deductible (280E disallowed)
  | 'marketing'             // All marketing/advertising
  | 'admin_salaries'        // Administrative staff
  | 'professional_fees'     // Legal, accounting, consulting
  | 'facility_rent_retail'  // Retail floor space rent
  | 'utilities_retail'      // Retail utilities
  | 'software'              // POS, inventory management software
  | 'bank_fees'             // Cannabis banking fees
  | 'compliance'            // Licensing, compliance costs
  | 'other_operating';      // Other operating expenses

/**
 * Individual expense entry for 280E tracking
 */
export interface Expense280E {
  id: string;
  tenantId: string;
  description: string;
  amount: number;
  date: Date | string;
  category: ExpenseCategory280E;
  subcategory: ExpenseSubcategory;

  // Allocation details for indirect costs
  allocationPercentage?: number;  // % allocatable to COGS (0-100)
  allocationRationale?: string;   // Justification for allocation

  // Audit trail
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;

  // Optional: link to vendor/invoice
  vendorName?: string;
  invoiceNumber?: string;

  // Period tracking
  periodMonth: number;  // 1-12
  periodYear: number;
}

/**
 * 280E Tax Analysis Summary
 */
export interface Tax280EAnalysis {
  tenantId: string;
  periodStart: Date | string;
  periodEnd: Date | string;

  // Revenue
  grossRevenue: number;

  // COGS Breakdown
  directCOGS: number;           // Direct product costs
  indirectCOGS: number;         // Allocated indirect costs
  totalCOGS: number;            // Total deductible COGS

  // Non-Deductible Expenses
  nonDeductibleExpenses: number;

  // Tax Calculations
  grossProfit: number;          // Revenue - COGS (taxable income)
  estimatedTaxRate: number;     // Effective tax rate (often 70-90%)
  estimatedTaxLiability: number;

  // Cash vs Paper Analysis
  paperProfit: number;          // Gross Profit on P&L
  cashReserveNeeded: number;    // Cash to set aside for taxes (40-50% of gross)
  actualCashProfit: number;     // What's left after tax reserve

  // Optimization Insights
  potentialCogsAllocation: number;  // Additional costs that COULD be allocated
  optimizationSuggestions: string[];

  // Breakdown by subcategory
  expenseBreakdown: {
    subcategory: ExpenseSubcategory;
    total: number;
    deductibleAmount: number;
  }[];
}

// =============================================================================
// NEW YORK CANNABIS TAX
// =============================================================================

/**
 * NY Cannabis Product Categories (affects potency tax rate)
 */
export type NYProductCategory =
  | 'flower'        // 0.5 cents per mg THC
  | 'concentrate'   // 0.8 cents per mg THC
  | 'edible';       // 3.0 cents per mg THC

/**
 * NY Tax Rate Configuration (as of 2024)
 */
export const NY_TAX_RATES = {
  // Potency Tax (paid by distributor, passed to retailer)
  potencyTax: {
    flower: 0.005,      // $0.005 per mg THC
    concentrate: 0.008, // $0.008 per mg THC
    edible: 0.03,       // $0.03 per mg THC
  },

  // State Sales Tax
  salesTax: 0.13,  // 13% state cannabis sales tax

  // Note: Some counties may have additional local taxes
} as const;

/**
 * NY Tax Calculation for a single product
 */
export interface NYProductTax {
  productId: string;
  productName: string;
  category: NYProductCategory;
  thcMg: number;          // Total THC in mg
  retailPrice: number;    // Retail price before tax

  // Tax Components
  potencyTax: number;     // THC-based tax
  salesTax: number;       // 13% sales tax
  totalTax: number;       // Combined tax

  // Final Pricing
  priceAfterTax: number;  // What consumer pays
  effectiveTaxRate: number; // Total tax / retail price
}

/**
 * NY Tax Summary for period
 */
export interface NYTaxSummary {
  tenantId: string;
  periodStart: Date | string;
  periodEnd: Date | string;

  // Revenue
  grossSales: number;

  // Tax Collected
  potencyTaxCollected: number;
  salesTaxCollected: number;
  totalTaxCollected: number;

  // Tax Liability (what's owed to state)
  potencyTaxOwed: number;
  salesTaxOwed: number;
  totalTaxOwed: number;

  // Net Revenue
  netRevenueAfterTax: number;

  // Breakdown by category
  categoryBreakdown: {
    category: NYProductCategory;
    unitsSold: number;
    grossSales: number;
    potencyTax: number;
    salesTax: number;
  }[];
}

// =============================================================================
// PROFITABILITY & BENCHMARKING
// =============================================================================

/**
 * Industry Benchmarks for cannabis retail
 */
export const CANNABIS_BENCHMARKS = {
  // Revenue per square foot (annual)
  revenuePerSqFt: {
    poor: 500,
    average: 974,    // Industry average
    good: 1500,
    excellent: 2500,
  },

  // Revenue per employee (annual)
  revenuePerEmployee: {
    poor: 100000,
    average: 150000,
    good: 200000,
    excellent: 400000,
  },

  // Gross Margin targets
  grossMargin: {
    poor: 0.30,      // 30%
    average: 0.45,   // 45%
    good: 0.55,      // 55%
    excellent: 0.65, // 65%
  },

  // Inventory Turnover (annual)
  inventoryTurnover: {
    poor: 4,         // 4x per year (90 days)
    average: 8,      // 8x per year (45 days)
    good: 12,        // 12x per year (30 days)
    excellent: 18,   // 18x per year (20 days)
  },

  // Category margin targets
  categoryMargins: {
    flower: 0.40,      // 40% typical
    concentrate: 0.50, // 50% typical
    edible: 0.55,      // 55% typical
    accessory: 0.60,   // 60% typical
    preroll: 0.45,     // 45% typical
  },
} as const;

/**
 * Profitability Metrics Dashboard
 */
export interface ProfitabilityMetrics {
  tenantId: string;
  periodStart: Date | string;
  periodEnd: Date | string;

  // Core Metrics
  grossRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;

  // Operating Metrics
  operatingExpenses: number;
  operatingProfit: number;  // Before 280E adjustment
  operatingMargin: number;

  // 280E Adjusted
  tax280ELiability: number;
  netProfitAfter280E: number;
  effectiveTaxRate: number;

  // Benchmarks
  revenuePerSqFt?: number;
  revenuePerEmployee?: number;
  inventoryTurnover: number;

  // Category Performance
  categoryPerformance: {
    category: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
    margin: number;
    benchmark: number;  // Target margin
    performance: 'below' | 'at' | 'above'; // vs benchmark
  }[];

  // Trend Analysis
  vsLastPeriod: {
    revenueChange: number;  // Percentage change
    marginChange: number;
    profitChange: number;
  };
}

/**
 * Price Compression Analysis (GTI Rule)
 * If market prices drop X%, volume must increase by X/(1-X) to maintain revenue
 */
export interface PriceCompressionAnalysis {
  tenantId: string;
  analysisDate: Date | string;

  // Current State
  currentAveragePrice: number;
  currentVolume: number;
  currentRevenue: number;

  // Market Compression
  marketPriceDropPercent: number;  // e.g., 0.20 for 20% drop

  // GTI Rule Calculation
  requiredVolumeIncrease: number;  // Percentage increase needed
  requiredNewVolume: number;       // Absolute units needed

  // Scenarios
  scenarios: {
    priceDropPercent: number;
    volumeIncreaseNeeded: number;
    newVolume: number;
    revenueAtNewPrice: number;
    breakeven: boolean;
  }[];

  // Strategy Recommendations
  recommendations: string[];
}

/**
 * Working Capital Analysis
 */
export interface WorkingCapitalAnalysis {
  tenantId: string;
  analysisDate: Date | string;

  // Current Position
  cashOnHand: number;
  accountsReceivable: number;
  inventoryValue: number;
  accountsPayable: number;

  // Working Capital Metrics
  workingCapital: number;           // Current Assets - Current Liabilities
  currentRatio: number;             // Current Assets / Current Liabilities
  quickRatio: number;               // (Cash + AR) / Current Liabilities

  // Cash Flow
  monthlyOperatingExpenses: number;
  monthlyRevenue: number;
  monthlyCashBurn: number;          // If negative, burning cash
  runwayMonths: number;             // Cash / Monthly Burn

  // Cannabis-Specific
  taxReserve: number;               // Set aside for 280E (40-50% of gross)
  bankingFees: number;              // Monthly cannabis banking fees

  // Risk Assessment
  liquidityRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  recommendations: string[];
}

// =============================================================================
// TENANT CONFIGURATION
// =============================================================================

/**
 * Tenant-specific tax and profitability settings
 */
export interface TenantTaxConfig {
  tenantId: string;

  // Location
  state: string;              // 'NY', 'CA', etc.
  county?: string;            // For local tax variations

  // Facility Metrics (for benchmarking)
  squareFootage?: number;
  employeeCount?: number;

  // 280E Settings
  enable280ETracking: boolean;
  defaultAllocationPercentages: {
    facilityRent: number;     // % of rent allocatable to inventory storage
    utilities: number;        // % of utilities for storage
    labor: number;            // % of labor for inventory handling
  };

  // Tax Reserve
  taxReservePercentage: number;  // Default 45%

  // Working Capital
  targetRunwayMonths: number;    // Minimum months of expenses in cash
  monthlyBankingFees: number;    // Cannabis banking fees

  createdAt: Date | string;
  updatedAt: Date | string;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Period selection for reports
 */
export type ReportPeriod =
  | 'current_month'
  | 'last_month'
  | 'current_quarter'
  | 'last_quarter'
  | 'ytd'
  | 'last_year'
  | 'custom';

/**
 * Report configuration
 */
export interface TaxReportConfig {
  tenantId: string;
  period: ReportPeriod;
  startDate?: Date | string;
  endDate?: Date | string;
  includeDetails: boolean;
  include280E: boolean;
  includeNYTax: boolean;
  includeBenchmarks: boolean;
}
