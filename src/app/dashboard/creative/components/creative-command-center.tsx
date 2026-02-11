/**
 * Creative Command Center
 *
 * Integrated creative workspace with:
 * - Brand Guide integration
 * - Memory-powered suggestions
 * - Template browser
 * - Canvas workspace
 * - Asset library
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  LayoutGrid,
  Calendar,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SocialPlatform } from '@/types/creative-content';
import type { AssetTemplate, CreativeAsset } from '@/types/creative-asset';
import type { BrandGuide } from '@/types/brand-guide';

// Phase 1 Components
import { CanvasWorkspace } from './vibe-studio/canvas-workspace';
import { PlatformSelector } from './vibe-studio/platform-selector';
import { ContentCalendar } from './content-calendar';

// Phase 2 Components
import { TemplateBrowser } from './template-browser';
import { AssetLibraryRail } from './asset-library-rail';
import { MagicGenerateDialog, type GenerateParams } from './magic-generate-dialog';

// Phase 3 Components
import { HeartbeatWidget, generateMockSuggestions, type CreativeSuggestion } from './heartbeat-widget';
import { MemoryPanel } from './memory-panel';
import { SmartScheduler } from './smart-scheduler';

// Hooks
import { useBrandGuide } from '@/hooks/use-brand-guide';
import { useCreativeMemory } from '@/hooks/use-creative-memory';

interface CreativeCommandCenterProps {
  userId: string;
  brandId: string;
  tenantId: string;
  role: string;
}

type ViewMode = 'workspace' | 'calendar' | 'analytics';

export function CreativeCommandCenter({
  userId,
  brandId,
  tenantId,
  role,
}: CreativeCommandCenterProps) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('workspace');
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('instagram');
  const [selectedTemplate, setSelectedTemplate] = useState<AssetTemplate | null>(null);
  const [generatedAsset, setGeneratedAsset] = useState<CreativeAsset | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [savedAssets, setSavedAssets] = useState<CreativeAsset[]>([]);

  // Phase 3 State
  const [showScheduler, setShowScheduler] = useState(false);
  const [heartbeatSuggestions, setHeartbeatSuggestions] = useState<CreativeSuggestion[]>(generateMockSuggestions());

  // Hooks
  const { brandGuide, loading: brandGuideLoading } = useBrandGuide(brandId);
  const memory = useCreativeMemory(userId, brandGuide);

  // Handlers
  const handleTemplateSelect = (template: AssetTemplate) => {
    setSelectedTemplate(template);
    // Auto-open generate dialog when template is selected
    setShowGenerateDialog(true);
  };

  const handleGenerate = async (params: GenerateParams) => {
    console.log('Generating with params:', params);

    // TODO: Call actual generation API
    // For now, create a mock asset
    const mockAsset: CreativeAsset = {
      id: `asset_${Date.now()}`,
      brandId,
      templateId: params.templateId,
      generatedAt: new Date(),
      generatedBy: userId,
      prompt: params.prompt,
      aiModel: selectedTemplate?.aiModel || 'gemini-pro',
      generationCost: selectedTemplate?.estimatedCost || 0.02,
      name: `${selectedTemplate?.name} - ${new Date().toLocaleDateString()}`,
      category: selectedTemplate?.category || 'social_media',
      format: selectedTemplate?.format || 'image',
      fileUrl: '', // Will be populated by actual generation
      thumbnailUrl: '',
      fileSize: 0, // Will be set after generation
      complianceStatus: 'pending',
      disclaimers: [],
      status: 'draft',
      tags: selectedTemplate?.tags || [],
    };

    setGeneratedAsset(mockAsset);
    setSavedAssets([mockAsset, ...savedAssets]);

    // Record approval in memory (can be updated later)
    await memory.recordApproval(mockAsset.id, true);
  };

  const handleAssetClick = (asset: CreativeAsset) => {
    setGeneratedAsset(asset);
  };

  const handleAssetDownload = (asset: CreativeAsset) => {
    console.log('Downloading asset:', asset);
    // TODO: Implement download
  };

  // Phase 3 Handlers
  const handleDismissSuggestion = (suggestionId: string) => {
    setHeartbeatSuggestions(prev =>
      prev.map(s => s.id === suggestionId ? { ...s, dismissed: true } : s)
    );
  };

  const handleCreateFromSuggestion = (suggestion: CreativeSuggestion, template: AssetTemplate) => {
    setSelectedTemplate(template);
    setShowGenerateDialog(true);
  };

  const handleScheduleAsset = (scheduledAt: Date, autoPost: boolean) => {
    console.log('Scheduling asset for:', scheduledAt, 'Auto-post:', autoPost);
    // TODO: Implement scheduling logic
    setShowScheduler(false);
  };

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900">
                Creative Command Center
              </h1>
              <p className="text-gray-600 mt-1">
                AI-powered content creation with your brand guide
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Memory Panel */}
              <MemoryPanel memory={memory} />

              {/* View Mode Toggle */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList>
                  <TabsTrigger value="workspace" className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" />
                    Workspace
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Calendar
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Analytics
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Platform Selector (only show in workspace view) */}
          {viewMode === 'workspace' && (
            <PlatformSelector
              selectedPlatform={selectedPlatform}
              onPlatformChange={setSelectedPlatform}
            />
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {viewMode === 'workspace' && (
            <>
              {/* Heartbeat Widget (Left) */}
              <div className="p-6 border-r border-gray-200">
                <HeartbeatWidget
                  suggestions={heartbeatSuggestions}
                  onCreateFromSuggestion={handleCreateFromSuggestion}
                  onDismiss={handleDismissSuggestion}
                />
              </div>

              {/* Main Workspace */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                  {/* Template Browser */}
                  <div>
                    <TemplateBrowser
                      onTemplateSelect={handleTemplateSelect}
                      selectedTemplateId={selectedTemplate?.id}
                    />
                  </div>

                  {/* Canvas Workspace */}
                  <div className="sticky top-0">
                    <CanvasWorkspace
                      platform={selectedPlatform}
                      brandGuide={brandGuide}
                      generatedAsset={generatedAsset}
                      onGenerate={() => {
                        if (selectedTemplate) {
                          setShowGenerateDialog(true);
                        } else {
                          alert('Please select a template first');
                        }
                      }}
                      onEdit={() => console.log('Edit')}
                      onDownload={() => generatedAsset && handleAssetDownload(generatedAsset)}
                      onShare={() => {
                        if (generatedAsset) {
                          setShowScheduler(true);
                        }
                      }}
                      onDelete={() => setGeneratedAsset(null)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {viewMode === 'calendar' && (
            <div className="p-6">
              <ContentCalendar
                brandId={brandId}
                scheduledContent={[]}
                onScheduleNew={(date) => console.log('Schedule for', date)}
                onEditScheduled={(content) => console.log('Edit', content)}
              />
            </div>
          )}

          {viewMode === 'analytics' && (
            <div className="p-6">
              <Card className="p-8 text-center">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Analytics Coming Soon
                </h3>
                <p className="text-gray-600">
                  Track performance, engagement, and conversions
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Right Rail: Asset Library */}
      {viewMode === 'workspace' && (
        <AssetLibraryRail
          brandId={brandId}
          assets={savedAssets}
          onAssetClick={handleAssetClick}
          onAssetDownload={handleAssetDownload}
        />
      )}

      {/* Magic Generate Dialog */}
      <MagicGenerateDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        template={selectedTemplate}
        platform={selectedPlatform}
        brandGuide={brandGuide}
        memory={memory}
        onGenerate={handleGenerate}
      />

      {/* Smart Scheduler Dialog */}
      <SmartScheduler
        open={showScheduler}
        onOpenChange={setShowScheduler}
        asset={generatedAsset}
        platform={selectedPlatform}
        onSchedule={handleScheduleAsset}
      />
    </div>
  );
}
