'use client';

import { useEffect, useState } from 'react';
import { magnetsAPI, type AcademyLead } from '@/lib/magnets-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AcademyDashboard() {
  const [leads, setLeads] = useState<AcademyLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      setLoading(true);
      const data = await magnetsAPI.getAcademyLeads({ limit: 50 });
      setLeads(data.leads);
      setTotal(data.total);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch leads',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(leadId: string, email: string) {
    if (!confirm(`Delete lead for ${email}?`)) return;

    try {
      setDeleting(leadId);
      await magnetsAPI.deleteAcademyLead(leadId);

      // Remove from local state
      setLeads(prev => prev.filter(lead => lead.id !== leadId));
      setTotal(prev => prev - 1);

      toast({
        title: 'Success',
        description: `Deleted lead for ${email}`,
      });
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete lead',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Academy Dashboard</h1>
          <p className="text-muted-foreground">
            Manage Cannabis Marketing AI Academy leads and analytics
          </p>
        </div>
        <Button
          onClick={fetchLeads}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Leads</CardTitle>
            <CardDescription>All-time academy leads</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Showing</CardTitle>
            <CardDescription>Currently displayed leads</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{leads.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion</CardTitle>
            <CardDescription>Email capture rate</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">~15%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Leads ({leads.length})</CardTitle>
          <CardDescription>
            Academy leads ordered by most recent first
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No leads yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Videos Watched</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-left p-3">Last Active</th>
                    <th className="text-left p-3">Intent Signals</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{lead.email}</td>
                      <td className="p-3">{lead.videosWatched} / 12</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(lead.lastViewedAt).toLocaleDateString()}
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
                          onClick={() => handleDelete(lead.id, lead.email)}
                          disabled={deleting === lead.id}
                          variant="ghost"
                          size="sm"
                        >
                          {deleting === lead.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
