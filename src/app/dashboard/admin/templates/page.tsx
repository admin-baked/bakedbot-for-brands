// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

'use client';

/**
 * Admin - Template Approval Dashboard
 *
 * Review and approve community-submitted templates
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Check, X, Eye, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  getPendingTemplates,
  approveTemplate,
  rejectTemplate,
} from '@/server/actions/template-admin';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  creatorName: string;
  thumbnail?: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function TemplateAdminPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    loadTemplates();
  }, [filter]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const fetchedTemplates = await getPendingTemplates(
        filter === 'pending' ? 'pending' : undefined
      );
      setTemplates(fetchedTemplates as Template[]);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleApprove = async (templateId: string) => {
    setProcessingId(templateId);
    try {
      const result = await approveTemplate(templateId);

      if (result.success) {
        toast({
          title: 'Template Approved',
          description: 'Template is now live in the marketplace',
        });
        loadTemplates();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Approval Failed',
        description: 'Could not approve template',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (templateId: string) => {
    setProcessingId(templateId);
    try {
      const result = await rejectTemplate(templateId);

      if (result.success) {
        toast({
          title: 'Template Rejected',
          description: 'Template has been rejected',
        });
        loadTemplates();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Rejection Failed',
        description: 'Could not reject template',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handlePreview = (templateId: string) => {
    window.open(`/vibe/templates/preview/${templateId}`, '_blank');
  };

  if (loading || loadingTemplates) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Template Approval Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Review and approve community-submitted templates
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="mb-6">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending Review
          </TabsTrigger>
          <TabsTrigger value="all">All Templates</TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                {filter === 'pending' ? (
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                ) : (
                  <Eye className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {filter === 'pending'
                  ? 'All caught up!'
                  : 'No templates yet'}
              </h3>
              <p className="text-muted-foreground">
                {filter === 'pending'
                  ? 'No templates pending review'
                  : 'Community templates will appear here'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card key={template.id} className="flex flex-col">
                  <CardHeader>
                    <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
                      {template.thumbnail ? (
                        <img
                          src={template.thumbnail}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No preview
                        </div>
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-xl truncate">
                        {template.name}
                      </CardTitle>
                      <Badge
                        variant={
                          template.status === 'approved'
                            ? 'default'
                            : template.status === 'pending'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {template.status}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {template.description}
                    </CardDescription>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <div>By: {template.creatorName}</div>
                      <div>Category: {template.category}</div>
                      <div>
                        Submitted:{' '}
                        {new Date(template.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardFooter className="mt-auto flex flex-col gap-2">
                    <Button
                      onClick={() => handlePreview(template.id)}
                      variant="outline"
                      size="sm"
                      className="w-full gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </Button>
                    {template.status === 'pending' && (
                      <div className="flex gap-2 w-full">
                        <Button
                          onClick={() => handleApprove(template.id)}
                          size="sm"
                          className="flex-1 gap-1"
                          disabled={processingId === template.id}
                        >
                          {processingId === template.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(template.id)}
                          variant="destructive"
                          size="sm"
                          className="flex-1 gap-1"
                          disabled={processingId === template.id}
                        >
                          {processingId === template.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
