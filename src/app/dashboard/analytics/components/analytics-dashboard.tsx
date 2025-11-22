
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
  
  const chartConfig = initialData.salesByProduct.reduce((acc, item) => {
    acc[item.productName] = { label: item.productName };
    return acc;
  }, {} as any);


  return (
    <div className="flex flex-col gap-6">
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

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Top Selling Products by Revenue
          </CardTitle>
          <CardDescription>
            This chart shows your top 10 products based on total revenue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-96 w-full">
            <RechartsBarChart
              accessibilityLayer
              data={initialData.salesByProduct}
              layout="vertical"
              margin={{ left: 20 }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="productName"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 25) + (value.length > 25 ? '...' : '')}
                className="text-xs"
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
    </div>
  );
}
