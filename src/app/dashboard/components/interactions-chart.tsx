
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { UserInteraction } from '@/firebase/converters';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface InteractionsChartProps {
  interactions: UserInteraction[];
  isLoading: boolean;
}

export default function InteractionsChart({ interactions, isLoading }: InteractionsChartProps) {
  const chartData = useMemo(() => {
    if (!interactions) return [];
    
    // Group interactions by day for the last 30 days
    const dailyCounts: { [date: string]: number } = {};
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyCounts[dateString] = 0;
    }

    interactions.forEach(interaction => {
      const dateString = interaction.interactionDate.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dailyCounts[dateString] !== undefined) {
        dailyCounts[dateString]++;
      }
    });

    return Object.keys(dailyCounts).map(date => ({
      date,
      interactions: dailyCounts[date],
    }));
  }, [interactions]);

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-64 w-full" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interactions Over Time</CardTitle>
        <CardDescription>Chatbot interactions over the last 30 days.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{
            interactions: {
                label: 'Interactions',
                color: 'hsl(var(--primary))',
            }
        }}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <Tooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar
              dataKey="interactions"
              fill="var(--color-interactions)"
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
