
'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BarChart, DollarSign, Package } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart as RechartsBarChart } from 'recharts';
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

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
          <CardDescription>Daily GMV for the last 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
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
            </ResponsiveContainer>
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

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Sessions to Paid Orders.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
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
                  <ChartTooltip />
                  <Bar dataKey="count" fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={40}>
                    {/* Label List could go here */}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
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
    </div>
  );
}
