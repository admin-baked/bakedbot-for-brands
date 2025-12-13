'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BarChart, DollarSign, Package } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart as RechartsBarChart, PieChart, Pie, Cell } from 'recharts';
import type { AnalyticsData } from '../actions';

interface AnalyticsDashboardProps {
  initialData: AnalyticsData;
}

export default function AnalyticsDashboard({ initialData }: AnalyticsDashboardProps) {

  const productChartConfig = initialData.salesByProduct.reduce((acc, item) => {
    acc[item.productName] = { label: item.productName };
    return acc;
  }, {} as any);

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${initialData.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">From all non-cancelled orders.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{initialData.totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Number of non-cancelled orders.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${initialData.averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Average revenue per order.</p>
          </CardContent>
        </Card>
      </div>



      {/* Cohort Analysis (Task 401) */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Retention Heatmap (Cohorts)</CardTitle>
          <CardDescription>Percentage of customers returning in subsequent months.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {initialData.cohorts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Not enough data for cohort analysis.</div>
            ) : (
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    <th className="p-2 text-left font-medium text-muted-foreground">Month</th>
                    <th className="p-2 text-left font-medium text-muted-foreground">Users</th>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <th key={i} className="p-2 font-medium text-muted-foreground">M{i}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {initialData.cohorts.map((cohort) => (
                    <tr key={cohort.month} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-2 font-medium">{cohort.month}</td>
                      <td className="p-2">{cohort.initialSize}</td>
                      {cohort.retention.map((pct, i) => {
                        // Heatmap color logic
                        let bg = 'bg-transparent';
                        if (pct >= 80) bg = 'bg-primary/90 text-primary-foreground';
                        else if (pct >= 60) bg = 'bg-primary/70 text-white';
                        else if (pct >= 40) bg = 'bg-primary/50 text-white';
                        else if (pct >= 20) bg = 'bg-primary/30';
                        else if (pct > 0) bg = 'bg-primary/10';

                        return (
                          <td key={i} className="p-1">
                            {pct > 0 ? (
                              <div className={`w-full h-8 flex items-center justify-center rounded ${bg}`}>
                                {i === 0 ? '100%' : `${Math.round(pct)}%`}
                              </div>
                            ) : <div className="text-center text-muted-foreground/20">-</div>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repeat Customer Rate</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(initialData.repeatCustomerRate * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Customers with &gt; 1 order.</p>
          </CardContent>
        </Card>
      </div>


      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
          <CardDescription>Daily GMV for the last 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ChartContainer config={{ gmv: { label: "Revenue", color: "hsl(var(--primary))" } }} className="h-full w-full">
              <RechartsBarChart data={initialData.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `$${value}`}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={<ChartTooltipContent
                    formatter={(value) => `$${Number(value).toLocaleString()}`}
                  />}
                />
                <Bar dataKey="gmv" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Sales by Product */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Top Selling Products
            </CardTitle>
            <CardDescription>
              Top 10 products by revenue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={productChartConfig} className="h-[300px] w-full">
              <RechartsBarChart
                accessibilityLayer
                data={initialData.salesByProduct}
                layout="vertical"
                margin={{ left: 0 }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="productName"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 20) + (value.length > 20 ? '...' : '')}
                  className="text-xs"
                  width={100}
                />
                <XAxis dataKey="revenue" type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent
                    formatter={(value) => `$${Number(value).toLocaleString()}`}
                    indicator="dot"
                  />}
                />
                <Bar
                  dataKey="revenue"
                  layout="vertical"
                  fill="var(--color-chart-1)"
                  radius={4}
                />
              </RechartsBarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Affinity Pairs (Task 403) */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Bought Together</CardTitle>
            <CardDescription>Top product correlations.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {initialData.affinityPairs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Need more order data for correlations.</p>
              ) : (
                initialData.affinityPairs.map((pair, i) => (
                  <div key={i} className="flex items-center justify-between border-b last:border-0 pb-2">
                    <div className="text-sm">
                      <div className="font-medium text-foreground">{pair.productA}</div>
                      <div className="text-muted-foreground text-xs">+ {pair.productB}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{pair.count}x</div>
                      <div className="text-xs text-muted-foreground">in {Math.round(pair.strength * 100)}% of orders</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sales by Category (Task 400) */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Revenue distribution.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ChartContainer config={{ revenue: { label: "Revenue" } }} className="h-full w-full">
                <PieChart>
                  <Pie
                    data={initialData.salesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="revenue"
                    nameKey="category"
                  >
                    {initialData.salesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={[
                        '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57'
                      ][index % 6]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value) => `$${Number(value).toLocaleString()}`} />}
                  />
                </PieChart>
              </ChartContainer>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {initialData.salesByCategory.slice(0, 6).map((item, i) => (
                  <div key={item.category} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{
                      backgroundColor: [
                        '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57'
                      ][i % 6]
                    }} />
                    <span className="truncate" title={item.category}>{item.category}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Sessions to Paid Orders.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ChartContainer config={{ count: { label: "Count", color: "hsl(var(--primary))" } }} className="h-full w-full">
                <RechartsBarChart data={initialData.conversionFunnel} layout="vertical">
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="stage"
                    type="category"
                    width={120}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={40}>
                  </Bar>
                </RechartsBarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance</CardTitle>
          <CardDescription>Where your traffic is coming from.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {initialData.channelPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No channel data available yet.</p>
            ) : (
              initialData.channelPerformance.map((channel) => (
                <div key={channel.channel} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium capitalize">{channel.channel}</p>
                    <p className="text-xs text-muted-foreground">{channel.sessions} sessions</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{(channel.conversionRate * 100).toFixed(1)}% Conv.</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div >
  );
}
