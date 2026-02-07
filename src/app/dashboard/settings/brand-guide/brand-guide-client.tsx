/**
 * Brand Guide Client Component
 *
 * Main client component for brand guide management.
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Palette,
  MessageSquare,
  Target,
  Shield,
  Image as ImageIcon,
  History,
  Download,
  Share2,
  Sparkles,
  FileText,
  TrendingUp,
  Search,
} from 'lucide-react';
import type { BrandGuide } from '@/types/brand-guide';
import { VisualIdentityTab } from './components/visual-identity-tab';
import { BrandVoiceTab } from './components/brand-voice-tab';
import { MessagingTab } from './components/messaging-tab';
import { ComplianceTab } from './components/compliance-tab';
import { AssetsTab } from './components/assets-tab';
import { VersionHistoryTab } from './components/version-history-tab';
import { ExportTab } from './components/export-tab';
import { CompetitorAnalysisTab } from './components/competitor-analysis-tab';
import { ABTestingTab } from './components/ab-testing-tab';
import { CreateBrandGuideDialog } from './components/create-brand-guide-dialog';

interface BrandGuideClientProps {
  brandId: string;
  initialBrandGuide?: BrandGuide;
  userRole: string;
}

export function BrandGuideClient({
  brandId,
  initialBrandGuide,
  userRole,
}: BrandGuideClientProps) {
  const [brandGuide, setBrandGuide] = useState<BrandGuide | undefined>(
    initialBrandGuide
  );
  const [activeTab, setActiveTab] = useState('visual');

  // Show create dialog if no brand guide exists
  if (!brandGuide) {
    return (
      <Card className="p-12 text-center">
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Create Your Brand Guide</h2>
            <p className="text-muted-foreground">
              Get started by creating your brand guide. You can extract it from your
              website, choose a template, or build it manually.
            </p>
          </div>
          <CreateBrandGuideDialog
            brandId={brandId}
            onComplete={(guide) => setBrandGuide(guide)}
          />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with status and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant={brandGuide.status === 'active' ? 'default' : 'secondary'}>
            {brandGuide.status}
          </Badge>
          <div className="text-sm text-muted-foreground">
            Completeness: {brandGuide.completenessScore}%
          </div>
          {brandGuide.source.method && (
            <div className="text-sm text-muted-foreground">
              Source: {brandGuide.source.method.replace('_', ' ')}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${brandGuide.completenessScore}%` }}
        />
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="visual" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Visual
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="messaging" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Messaging
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Competitors
          </TabsTrigger>
          <TabsTrigger value="abtesting" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            A/B Testing
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Export
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="visual">
            <VisualIdentityTab
              brandId={brandId}
              brandGuide={brandGuide}
              onUpdate={(updates) =>
                setBrandGuide({ ...brandGuide, ...updates } as BrandGuide)
              }
            />
          </TabsContent>

          <TabsContent value="voice">
            <BrandVoiceTab
              brandId={brandId}
              brandGuide={brandGuide}
              onUpdate={(updates) =>
                setBrandGuide({ ...brandGuide, ...updates } as BrandGuide)
              }
            />
          </TabsContent>

          <TabsContent value="messaging">
            <MessagingTab
              brandId={brandId}
              brandGuide={brandGuide}
              onUpdate={(updates) =>
                setBrandGuide({ ...brandGuide, ...updates } as BrandGuide)
              }
            />
          </TabsContent>

          <TabsContent value="compliance">
            <ComplianceTab
              brandId={brandId}
              brandGuide={brandGuide}
              onUpdate={(updates) =>
                setBrandGuide({ ...brandGuide, ...updates } as BrandGuide)
              }
            />
          </TabsContent>

          <TabsContent value="assets">
            <AssetsTab
              brandId={brandId}
              brandGuide={brandGuide}
              onUpdate={(updates) =>
                setBrandGuide({ ...brandGuide, ...updates } as BrandGuide)
              }
            />
          </TabsContent>

          <TabsContent value="competitors">
            <CompetitorAnalysisTab brandId={brandId} brandGuide={brandGuide} />
          </TabsContent>

          <TabsContent value="abtesting">
            <ABTestingTab brandId={brandId} brandGuide={brandGuide} />
          </TabsContent>

          <TabsContent value="history">
            <VersionHistoryTab brandId={brandId} brandGuide={brandGuide} />
          </TabsContent>

          <TabsContent value="export">
            <ExportTab brandId={brandId} brandGuide={brandGuide} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
