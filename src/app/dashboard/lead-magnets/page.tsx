'use client';

import { useEffect, useState } from 'react';
import { magnetsAPI, type OverviewStats } from '@/lib/magnets-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Rocket, Sparkles, Users, TrendingUp, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function LeadMagnetsOverview() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchOverview();
  }, []);

  async function fetchOverview() {
    try {
      setLoading(true);
      const data = await magnetsAPI.getOverview();
      setOverview(data);
    } catch (error) {
      console.error('Error fetching overview:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch overview',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Magnets Overview</h1>
          <p className="text-muted-foreground">
            Unified view of all lead generation channels
          </p>
        </div>
        <Button
          onClick={fetchOverview}
          disabled={loading}
          variant="outline"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {/* Academy Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Cannabis Marketing AI Academy</h2>
          </div>
          <Link href="/dashboard/academy">
            <Button variant="outline" size="sm">
              Manage Leads
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview?.academy.totalLeads.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Email captures
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview?.academy.totalViews.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Video views
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Leads (7d)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview?.academy.recentLeads.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 7 days
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Vibe Studio Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Vibe Studio</h2>
          </div>
          <Link href="/dashboard/vibe-admin">
            <Button variant="outline" size="sm">
              Manage Vibes
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview?.vibe.totalLeads.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Email captures
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Web Vibes</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview?.vibe.totalWebVibes.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Desktop themes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mobile Vibes</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview?.vibe.totalMobileVibes.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Mobile themes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Leads (7d)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview?.vibe.recentLeads.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 7 days
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Training Program Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">BakedBot Builder Bootcamp</h2>
          </div>
          <Link href="/dashboard/training/admin">
            <Button variant="outline" size="sm">
              Manage Interns
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Interns</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview?.training.totalUsers.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Enrolled users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Interns (7d)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview?.training.recentUsers.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 7 days
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Magnet Performance</CardTitle>
          <CardDescription>
            Combined metrics across all channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Leads</span>
                <span className="text-2xl font-bold">
                  {((overview?.academy.totalLeads || 0) + (overview?.vibe.totalLeads || 0) + (overview?.training.totalUsers || 0)).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Across all lead magnets
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recent Growth (7d)</span>
                <span className="text-2xl font-bold">
                  {((overview?.academy.recentLeads || 0) + (overview?.vibe.recentLeads || 0) + (overview?.training.recentUsers || 0)).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                New leads this week
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      {overview?.lastUpdated && (
        <p className="text-sm text-muted-foreground text-center">
          Last updated: {new Date(overview.lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  );
}
