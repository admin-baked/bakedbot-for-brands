'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  AlertTriangle,
  Building2,
  Calculator,
  Wallet,
  Scale,
  Lightbulb,
  PiggyBank,
  Receipt,
  Package,
  Info,
} from 'lucide-react';
import { getProfitabilityDashboard, getProductProfitabilityData } from '@/server/actions/profitability';
import type {
  ProfitabilityMetrics,
  Tax280EAnalysis,
  NYTaxSummary,
  WorkingCapitalAnalysis,
  TenantTaxConfig,
  ReportPeriod,
} from '@/types/cannabis-tax';
import type { ProductProfitabilityItem } from '@/server/actions/profitability';
import { CANNABIS_BENCHMARKS } from '@/types/cannabis-tax';

interface DashboardData {
  metrics: ProfitabilityMetrics;
  tax280E: Tax280EAnalysis;
  nyTax: NYTaxSummary;
  workingCapital: WorkingCapitalAnalysis;
  config: TenantTaxConfig | null;
}

interface ProductsData {
  products: ProductProfitabilityItem[];
  summary: {
    totalInventoryValue: number;
    totalRevenuePotential: number;
    avgMarginPercent: number | null;
    productsWithCogs: number;
    productsWithoutCogs: number;
  };
}

export function ProfitabilityDashboard({ userId: _userId }: { userId: string }) {
  const [period, setPeriod] = useState<ReportPeriod>('current_month');
  const [data, setData] = useState<DashboardData | null>(null);
  const [productsData, setProductsData] = useState<ProductsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load product COGS data (independent of period — based on current catalog)
  useEffect(() => {
    async function fetchProducts() {
      setProductsLoading(true);
      try {
        const result = await getProductProfitabilityData();
        setProductsData(result);
      } catch (err) {
        // Non-fatal — products tab will show empty state
        console.error('[ProfitabilityDashboard] Failed to load product COGS data', err);
      } finally {
        setProductsLoading(false);
      }
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getProfitabilityDashboard(period);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [period]);

  return (
    <div className="space-y-6">
      {/* Tabs — Products tab is first (real POS data), financial tabs follow */}
      <Tabs defaultValue="products" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="280e" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              280E Tax
            </TabsTrigger>
            <TabsTrigger value="ny-tax" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              NY Tax
            </TabsTrigger>
            <TabsTrigger value="benchmarks" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Benchmarks
            </TabsTrigger>
            <TabsTrigger value="capital" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Working Capital
            </TabsTrigger>
          </TabsList>

          {/* Period selector only applies to financial tabs */}
          <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Current Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="current_quarter">Current Quarter</SelectItem>
              <SelectItem value="last_quarter">Last Quarter</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Tab — real POS COGS data */}
        <TabsContent value="products" className="space-y-4">
          <ProductsTab data={productsData} loading={productsLoading} />
        </TabsContent>

        {/* Financial tabs — use period-based data */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error || !data ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error loading financial data</AlertTitle>
            <AlertDescription>{error || 'No data available'}</AlertDescription>
          </Alert>
        ) : (
          <>
            {/* KPI Cards */}
            <TabsContent value="280e">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                <KPICard
                  title="Gross Revenue"
                  value={formatCurrency(data.metrics.grossRevenue)}
                  subtitle="Total sales"
                  icon={<DollarSign className="h-4 w-4" />}
                />
                <KPICard
                  title="Gross Margin"
                  value={formatPercent(data.metrics.grossMargin)}
                  subtitle={getBenchmarkLabel(data.metrics.grossMargin, CANNABIS_BENCHMARKS.grossMargin)}
                  icon={<Percent className="h-4 w-4" />}
                  trend={data.metrics.grossMargin >= CANNABIS_BENCHMARKS.grossMargin.good ? 'up' : 'down'}
                />
                <KPICard
                  title="280E Tax Liability"
                  value={formatCurrency(data.tax280E.estimatedTaxLiability)}
                  subtitle={`${formatPercent(data.tax280E.estimatedTaxRate)} effective rate`}
                  icon={<Receipt className="h-4 w-4" />}
                  variant="warning"
                />
                <KPICard
                  title="Actual Cash Profit"
                  value={formatCurrency(data.tax280E.actualCashProfit)}
                  subtitle="After tax reserve"
                  icon={<PiggyBank className="h-4 w-4" />}
                  trend={data.tax280E.actualCashProfit > 0 ? 'up' : 'down'}
                />
              </div>
              <Tax280ETab data={data.tax280E} />
            </TabsContent>

            <TabsContent value="ny-tax" className="space-y-4">
              <NYTaxTab data={data.nyTax} />
            </TabsContent>

            <TabsContent value="benchmarks" className="space-y-4">
              <BenchmarksTab data={data.metrics} config={data.config} />
            </TabsContent>

            <TabsContent value="capital" className="space-y-4">
              <WorkingCapitalTab data={data.workingCapital} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

// =============================================================================
// PRODUCTS TAB — POS COGS DATA
// =============================================================================

interface ProductsTabProps {
  data: {
    products: ProductProfitabilityItem[];
    summary: {
      totalInventoryValue: number;
      totalRevenuePotential: number;
      avgMarginPercent: number | null;
      productsWithCogs: number;
      productsWithoutCogs: number;
    };
  } | null;
  loading: boolean;
}

function ProductsTab({ data, loading }: ProductsTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data || data.products.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Sync your POS to load product COGS data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { products, summary } = data;
  const coveragePercent =
    summary.productsWithCogs + summary.productsWithoutCogs > 0
      ? (summary.productsWithCogs / (summary.productsWithCogs + summary.productsWithoutCogs)) * 100
      : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Avg Gross Margin"
          value={summary.avgMarginPercent !== null ? formatPercent(summary.avgMarginPercent) : 'N/A'}
          subtitle={`${summary.productsWithCogs} products with COGS`}
          icon={<Percent className="h-4 w-4" />}
          trend={
            summary.avgMarginPercent !== null
              ? summary.avgMarginPercent >= 0.5 ? 'up' : 'down'
              : undefined
          }
        />
        <KPICard
          title="Inventory at Cost"
          value={formatCurrency(summary.totalInventoryValue)}
          subtitle="Current stock × COGS/unit"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KPICard
          title="Revenue Potential"
          value={formatCurrency(summary.totalRevenuePotential)}
          subtitle="Current stock × retail price"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KPICard
          title="COGS Coverage"
          value={`${coveragePercent.toFixed(0)}%`}
          subtitle={`${summary.productsWithoutCogs} products missing COGS`}
          icon={<Package className="h-4 w-4" />}
          variant={coveragePercent < 50 ? 'warning' : 'default'}
        />
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Profitability
          </CardTitle>
          <CardDescription>
            COGS from Alleaves POS · Sorted by margin (lowest first) · Cost of Good takes priority over Batch Cost
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Product</th>
                  <th className="text-left py-2 pr-4 font-medium">Category</th>
                  <th className="text-right py-2 pr-4 font-medium">COGS/unit</th>
                  <th className="text-right py-2 pr-4 font-medium">Retail</th>
                  <th className="text-right py-2 pr-4 font-medium">Margin $</th>
                  <th className="text-right py-2 pr-4 font-medium">Margin %</th>
                  <th className="text-right py-2 pr-4 font-medium">Stock</th>
                  <th className="text-right py-2 font-medium">Inv. Value</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-2 pr-4 max-w-[220px]">
                      <span className="font-medium line-clamp-1" title={p.name}>{p.name}</span>
                      {p.costSource !== 'none' && (
                        <span className="text-xs text-muted-foreground block">
                          {p.costSource === 'cost_of_good' ? 'Cost of Good' : 'Batch Cost'}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 capitalize text-muted-foreground">{p.category}</td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {p.effectiveCost !== null
                        ? formatCurrency(p.effectiveCost)
                        : <span className="text-muted-foreground flex items-center justify-end gap-1"><Info className="h-3 w-3" />N/A</span>}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">{formatCurrency(p.retailPrice)}</td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {p.marginAmount !== null ? formatCurrency(p.marginAmount) : '—'}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {p.marginPercent !== null ? (
                        <span className={
                          p.marginPercent >= 0.5 ? 'text-green-600 font-medium' :
                          p.marginPercent >= 0.3 ? 'text-yellow-600 font-medium' :
                          'text-red-600 font-medium'
                        }>
                          {formatPercent(p.marginPercent)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2 pr-4 text-right">{p.stockCount}</td>
                    <td className="py-2 text-right font-mono">
                      {p.inventoryValue !== null ? formatCurrency(p.inventoryValue) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {summary.productsWithoutCogs > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-lg flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong>{summary.productsWithoutCogs} product{summary.productsWithoutCogs !== 1 ? 's' : ''}</strong>{' '}
                {summary.productsWithoutCogs !== 1 ? 'have' : 'has'} no COGS data from Alleaves.
                Enter "Cost of Good" or "Batch Cost" values in Alleaves and run a POS sync to populate margins.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// KPI CARD COMPONENT
// =============================================================================

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  variant?: 'default' | 'warning' | 'success';
}

function KPICard({ title, value, subtitle, icon, trend, variant = 'default' }: KPICardProps) {
  return (
    <Card className={variant === 'warning' ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {trend && (
            trend === 'up'
              ? <TrendingUp className="h-4 w-4 text-green-500" />
              : <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// 280E TAB
// =============================================================================

function Tax280ETab({ data }: { data: Tax280EAnalysis }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* COGS Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            COGS Breakdown (Deductible)
          </CardTitle>
          <CardDescription>
            Under IRS 280E, only Cost of Goods Sold is deductible
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Direct COGS</span>
              <span className="font-medium">{formatCurrency(data.directCOGS)}</span>
            </div>
            <Progress value={(data.directCOGS / data.totalCOGS) * 100} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Indirect COGS (Allocated)</span>
              <span className="font-medium">{formatCurrency(data.indirectCOGS)}</span>
            </div>
            <Progress value={(data.indirectCOGS / data.totalCOGS) * 100} className="h-2 bg-blue-100" />
          </div>
          <div className="pt-2 border-t">
            <div className="flex justify-between font-bold">
              <span>Total Deductible COGS</span>
              <span className="text-green-600">{formatCurrency(data.totalCOGS)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash vs Paper Profit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cash vs Paper Profit
          </CardTitle>
          <CardDescription>
            280E creates significant gap between P&L and actual cash
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between py-2 border-b">
            <span>Gross Revenue</span>
            <span className="font-medium">{formatCurrency(data.grossRevenue)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>Less: Total COGS</span>
            <span className="font-medium text-red-500">-{formatCurrency(data.totalCOGS)}</span>
          </div>
          <div className="flex justify-between py-2 border-b font-bold">
            <span>Gross Profit (Taxable)</span>
            <span>{formatCurrency(data.grossProfit)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>Less: Non-Deductible Expenses</span>
            <span className="font-medium text-red-500">-{formatCurrency(data.nonDeductibleExpenses)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>Paper Profit (P&L)</span>
            <span className="font-medium">{formatCurrency(data.paperProfit)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>Less: Tax Reserve (45%)</span>
            <span className="font-medium text-orange-500">-{formatCurrency(data.cashReserveNeeded)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold text-lg">
            <span>Actual Cash Profit</span>
            <span className={data.actualCashProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(data.actualCashProfit)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Suggestions */}
      {data.optimizationSuggestions.length > 0 && (
        <Card className="md:col-span-2 border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              280E Optimization Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.optimizationSuggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span className="text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
            {data.potentialCogsAllocation > 0 && (
              <div className="mt-4 p-3 bg-white dark:bg-gray-900 rounded-lg">
                <p className="text-sm font-medium">
                  Potential Additional COGS Allocation: {formatCurrency(data.potentialCogsAllocation)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Review indirect expenses for increased allocation percentages
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// NY TAX TAB
// =============================================================================

function NYTaxTab({ data }: { data: NYTaxSummary }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Tax Summary */}
      <Card>
        <CardHeader>
          <CardTitle>NY Cannabis Tax Summary</CardTitle>
          <CardDescription>
            Potency tax (per mg THC) + 13% state sales tax
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between py-2 border-b">
            <span>Gross Sales</span>
            <span className="font-medium">{formatCurrency(data.grossSales)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>Potency Tax Collected</span>
            <span className="font-medium">{formatCurrency(data.potencyTaxCollected)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>Sales Tax Collected (13%)</span>
            <span className="font-medium">{formatCurrency(data.salesTaxCollected)}</span>
          </div>
          <div className="flex justify-between py-2 border-b font-bold">
            <span>Total Tax Collected</span>
            <span className="text-orange-600">{formatCurrency(data.totalTaxCollected)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold">
            <span>Net Revenue (After Tax)</span>
            <span className="text-green-600">{formatCurrency(data.netRevenueAfterTax)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Tax by Product Category</CardTitle>
          <CardDescription>
            Potency tax rates: Flower $0.005/mg, Concentrate $0.008/mg, Edible $0.03/mg
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium capitalize">{cat.category}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({cat.unitsSold} units)
                    </span>
                  </div>
                  <Badge variant="outline">{formatCurrency(cat.grossSales)}</Badge>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Potency: {formatCurrency(cat.potencyTax)}</span>
                  <span>Sales: {formatCurrency(cat.salesTax)}</span>
                </div>
                <Progress
                  value={(cat.grossSales / data.grossSales) * 100}
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tax Calendar Alert */}
      <Card className="md:col-span-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600" />
            Tax Liability Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-muted-foreground">Potency Tax Owed</p>
              <p className="text-2xl font-bold">{formatCurrency(data.potencyTaxOwed)}</p>
            </div>
            <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-muted-foreground">Sales Tax Owed</p>
              <p className="text-2xl font-bold">{formatCurrency(data.salesTaxOwed)}</p>
            </div>
            <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Tax Owed</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(data.totalTaxOwed)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// BENCHMARKS TAB
// =============================================================================

function BenchmarksTab({ data, config }: { data: ProfitabilityMetrics; config: TenantTaxConfig | null }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Industry Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle>Industry Benchmarks</CardTitle>
          <CardDescription>
            Your performance vs cannabis retail industry standards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BenchmarkRow
            label="Gross Margin"
            value={data.grossMargin}
            benchmarks={CANNABIS_BENCHMARKS.grossMargin}
            format="percent"
          />
          <BenchmarkRow
            label="Inventory Turnover"
            value={data.inventoryTurnover}
            benchmarks={CANNABIS_BENCHMARKS.inventoryTurnover}
            format="number"
            suffix="x/year"
          />
          {data.revenuePerSqFt && (
            <BenchmarkRow
              label="Revenue per Sq Ft"
              value={data.revenuePerSqFt}
              benchmarks={CANNABIS_BENCHMARKS.revenuePerSqFt}
              format="currency"
            />
          )}
          {data.revenuePerEmployee && (
            <BenchmarkRow
              label="Revenue per Employee"
              value={data.revenuePerEmployee}
              benchmarks={CANNABIS_BENCHMARKS.revenuePerEmployee}
              format="currency"
            />
          )}
        </CardContent>
      </Card>

      {/* Category Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Category Performance</CardTitle>
          <CardDescription>
            Margin performance vs category benchmarks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.categoryPerformance.map((cat) => (
              <div key={cat.category} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium capitalize">{cat.category}</span>
                  <Badge
                    variant={
                      cat.performance === 'above' ? 'default' :
                      cat.performance === 'at' ? 'secondary' : 'destructive'
                    }
                  >
                    {formatPercent(cat.margin)} ({cat.performance})
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={(cat.margin / cat.benchmark) * 100}
                    className="h-2 flex-1"
                  />
                  <span className="text-xs text-muted-foreground">
                    Target: {formatPercent(cat.benchmark)}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Revenue: {formatCurrency(cat.revenue)}</span>
                  <span>Profit: {formatCurrency(cat.grossProfit)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Facility Configuration */}
      {config && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Facility Configuration</CardTitle>
            <CardDescription>
              These values are used for per-unit benchmark calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Square Footage</p>
                <p className="text-2xl font-bold">{config.squareFootage?.toLocaleString() || 'N/A'}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Employees</p>
                <p className="text-2xl font-bold">{config.employeeCount || 'N/A'}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">State</p>
                <p className="text-2xl font-bold">{config.state}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">County</p>
                <p className="text-2xl font-bold">{config.county || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface BenchmarkRowProps {
  label: string;
  value: number;
  benchmarks: { poor: number; average: number; good: number; excellent: number };
  format: 'percent' | 'currency' | 'number';
  suffix?: string;
}

function BenchmarkRow({ label, value, benchmarks, format, suffix = '' }: BenchmarkRowProps) {
  const formatValue = (v: number) => {
    if (format === 'percent') return formatPercent(v);
    if (format === 'currency') return formatCurrency(v);
    return `${v.toLocaleString()}${suffix}`;
  };

  const level = value >= benchmarks.excellent ? 'excellent' :
                value >= benchmarks.good ? 'good' :
                value >= benchmarks.average ? 'average' : 'poor';

  const levelColors = {
    excellent: 'text-green-600',
    good: 'text-blue-600',
    average: 'text-yellow-600',
    poor: 'text-red-600',
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="font-medium">{label}</span>
        <span className={`font-bold ${levelColors[level]}`}>
          {formatValue(value)}
        </span>
      </div>
      <div className="flex gap-1 h-2">
        <div className={`flex-1 rounded-l ${value >= benchmarks.poor ? 'bg-red-500' : 'bg-gray-200'}`} />
        <div className={`flex-1 ${value >= benchmarks.average ? 'bg-yellow-500' : 'bg-gray-200'}`} />
        <div className={`flex-1 ${value >= benchmarks.good ? 'bg-blue-500' : 'bg-gray-200'}`} />
        <div className={`flex-1 rounded-r ${value >= benchmarks.excellent ? 'bg-green-500' : 'bg-gray-200'}`} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Poor</span>
        <span>Average</span>
        <span>Good</span>
        <span>Excellent</span>
      </div>
    </div>
  );
}

// =============================================================================
// WORKING CAPITAL TAB
// =============================================================================

function WorkingCapitalTab({ data }: { data: WorkingCapitalAnalysis }) {
  const riskColors = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Liquidity Position */}
      <Card>
        <CardHeader>
          <CardTitle>Liquidity Position</CardTitle>
          <CardDescription>
            Current assets and working capital metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between py-2 border-b">
            <span>Cash on Hand</span>
            <span className="font-medium">{formatCurrency(data.cashOnHand)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>Accounts Receivable</span>
            <span className="font-medium">{formatCurrency(data.accountsReceivable)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>Inventory Value</span>
            <span className="font-medium">{formatCurrency(data.inventoryValue)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>Accounts Payable</span>
            <span className="font-medium text-red-500">-{formatCurrency(data.accountsPayable)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold">
            <span>Working Capital</span>
            <span className={data.workingCapital >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(data.workingCapital)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Ratios & Runway */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Ratios</CardTitle>
          <CardDescription>
            Liquidity and runway analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between py-2 border-b">
            <span>Current Ratio</span>
            <span className={`font-medium ${data.currentRatio >= 1.5 ? 'text-green-600' : 'text-orange-600'}`}>
              {data.currentRatio.toFixed(2)}x
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>Quick Ratio</span>
            <span className={`font-medium ${data.quickRatio >= 1.0 ? 'text-green-600' : 'text-orange-600'}`}>
              {data.quickRatio.toFixed(2)}x
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>Monthly Operating Expenses</span>
            <span className="font-medium">{formatCurrency(data.monthlyOperatingExpenses)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>Cash Runway</span>
            <span className={`font-medium ${data.runwayMonths >= 6 ? 'text-green-600' : data.runwayMonths >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
              {data.runwayMonths === Infinity ? '∞' : `${data.runwayMonths.toFixed(1)} months`}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span>Tax Reserve</span>
            <span className="font-medium text-orange-600">{formatCurrency(data.taxReserve)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Liquidity Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-4 h-4 rounded-full ${riskColors[data.liquidityRisk]}`} />
            <span className="text-lg font-bold capitalize">{data.liquidityRisk} Risk</span>
          </div>

          {data.riskFactors.length > 0 && (
            <div className="mb-4">
              <p className="font-medium mb-2">Risk Factors:</p>
              <ul className="list-disc list-inside space-y-1">
                {data.riskFactors.map((factor, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{factor}</li>
                ))}
              </ul>
            </div>
          )}

          {data.recommendations.length > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium mb-2">Recommendations:</p>
              <ul className="list-disc list-inside space-y-1">
                {data.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm">{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Cannabis-specific note */}
          <div className="mt-4 p-4 border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg">
            <p className="text-sm">
              <strong>Cannabis Banking Note:</strong> Monthly banking fees of {formatCurrency(data.bankingFees)} are
              typical for cannabis businesses due to limited banking options. Shop for competitive rates annually.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function getBenchmarkLabel(value: number, benchmarks: { poor: number; average: number; good: number; excellent: number }): string {
  if (value >= benchmarks.excellent) return 'Excellent';
  if (value >= benchmarks.good) return 'Good';
  if (value >= benchmarks.average) return 'Average';
  return 'Below Average';
}
