'use client';

import { useEffect, useState } from 'react';
import { magnetsAPI, type VibeLead } from '@/lib/magnets-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function VibeAdminDashboard() {
  const [webLeads, setWebLeads] = useState<VibeLead[]>([]);
  const [mobileLeads, setMobileLeads] = useState<VibeLead[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [vibeGallery, setVibeGallery] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch both web and mobile leads
      const [webData, mobileData] = await Promise.all([
        magnetsAPI.getVibeLeads({ type: 'web', limit: 50 }),
        magnetsAPI.getVibeLeads({ type: 'mobile', limit: 50 }),
      ]);

      setWebLeads(webData.leads);
      setMobileLeads(mobileData.leads);
      setStats(webData.stats); // Stats include both types
    } catch (error) {
      console.error('Error fetching vibe data:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchGallery(type: 'web' | 'mobile') {
    try {
      setGalleryLoading(true);
      const data = await magnetsAPI.getVibeGallery({ type, limit: 20 });
      setVibeGallery(data.vibes);
    } catch (error) {
      console.error('Error fetching gallery:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch gallery',
        variant: 'destructive',
      });
    } finally {
      setGalleryLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vibe Studio Admin</h1>
          <p className="text-muted-foreground">
            Manage AI-powered menu theme generator leads and gallery
          </p>
        </div>
        <Button
          onClick={fetchData}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Leads</CardTitle>
            <CardDescription>All vibe studio leads</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats?.totalLeads || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Web Vibes</CardTitle>
            <CardDescription>Desktop themes generated</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats?.totalWebVibes || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mobile Vibes</CardTitle>
            <CardDescription>Mobile themes generated</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats?.totalMobileVibes || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate</CardTitle>
            <CardDescription>Vibe to lead conversion</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats?.conversionRate || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Leads Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Vibe Studio Leads</CardTitle>
          <CardDescription>
            Users who provided their email to save vibes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="web" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="web">
                Web Vibes ({webLeads.length})
              </TabsTrigger>
              <TabsTrigger value="mobile">
                Mobile Vibes ({mobileLeads.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="web" className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : webLeads.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                  No web vibe leads yet
                </p>
              ) : (
                <LeadsTable leads={webLeads} type="web" />
              )}
            </TabsContent>

            <TabsContent value="mobile" className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : mobileLeads.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                  No mobile vibe leads yet
                </p>
              ) : (
                <LeadsTable leads={mobileLeads} type="mobile" />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Vibe Gallery */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Vibes Gallery</CardTitle>
              <CardDescription>
                Recently generated themes from the community
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => fetchGallery('web')}
                disabled={galleryLoading}
                variant="outline"
                size="sm"
              >
                {galleryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load Web'}
              </Button>
              <Button
                onClick={() => fetchGallery('mobile')}
                disabled={galleryLoading}
                variant="outline"
                size="sm"
              >
                {galleryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load Mobile'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {vibeGallery.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Click a button above to load vibes
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vibeGallery.map((vibe, index) => (
                <div
                  key={vibe.id || index}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{vibe.preset || 'Custom'}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(vibe.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {vibe.colors && (
                    <div className="flex gap-2">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: vibe.colors.primary }}
                        title="Primary"
                      />
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: vibe.colors.accent }}
                        title="Accent"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LeadsTable({ leads, type }: { leads: VibeLead[]; type: 'web' | 'mobile' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3">Email</th>
            <th className="text-left p-3">Vibes Generated</th>
            <th className="text-left p-3">Created</th>
            <th className="text-left p-3">Intent Signals</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b hover:bg-muted/50">
              <td className="p-3 font-medium">{lead.email}</td>
              <td className="p-3">{lead.vibesGenerated}</td>
              <td className="p-3 text-sm text-muted-foreground">
                {new Date(lead.createdAt).toLocaleDateString()}
              </td>
              <td className="p-3">
                {lead.intentSignals && lead.intentSignals.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {lead.intentSignals.map((signal) => (
                      <span
                        key={signal}
                        className="px-2 py-1 text-xs bg-primary/10 text-primary rounded"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">None</span>
                )}
              </td>
              <td className="p-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <a
                    href={`mailto:${lead.email}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
