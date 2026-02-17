'use client';

/**
 * Template Browser Component
 *
 * Allows users to browse and select pre-configured pricing rule templates.
 * Features category filtering, difficulty levels, and estimated impact.
 */

import { useState } from 'react';
import {
  PRICING_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
  type PricingRuleTemplate,
} from '@/lib/pricing-templates';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, CheckCircle2, AlertCircle, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { createPricingRule, previewPricingRuleImpact } from '@/app/actions/dynamic-pricing';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { DynamicPricingRule } from '@/types/dynamic-pricing';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TemplateBrowserProps {
  orgId: string;
  onRuleCreated?: () => void;
}

export function TemplateBrowser({ orgId, onRuleCreated }: TemplateBrowserProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PricingRuleTemplate | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Customization state
  const [customName, setCustomName] = useState('');
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [customMinPrice, setCustomMinPrice] = useState<number>(5.0);

  // Preview state
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<{
    affectedProductsCount: number;
    revenueImpact: number;
    avgDiscount: number;
  } | null>(null);

  const handleSelectTemplate = (template: PricingRuleTemplate) => {
    setSelectedTemplate(template);
    setCustomName(template.config.name);
    setCustomDiscount((template.config.priceAdjustment.value || 0) * 100);
    setCustomMinPrice(template.config.priceAdjustment.minPrice || 5.0);
    setIsCustomizing(true);
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !user) return;

    setIsCreating(true);
    try {
      const ruleConfig: Partial<DynamicPricingRule> = {
        ...selectedTemplate.config,
        name: customName,
        orgId,
        createdBy: user.uid,
        priceAdjustment: {
          ...selectedTemplate.config.priceAdjustment,
          value: customDiscount / 100,
          minPrice: customMinPrice,
        },
      };

      const result = await createPricingRule(ruleConfig);

      if (result.success) {
        toast({
          title: 'Rule Created',
          description: `${customName} has been created successfully.`,
        });
        setIsCustomizing(false);
        setSelectedTemplate(null);
        onRuleCreated?.();
      } else {
        throw new Error(result.error || 'Failed to create rule');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create rule',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handlePreviewImpact = async () => {
    if (!selectedTemplate) return;

    setIsPreviewing(true);
    setPreviewData(null);
    try {
      const ruleConfig: Partial<DynamicPricingRule> = {
        ...selectedTemplate.config,
        name: customName,
        orgId,
        priceAdjustment: {
          ...selectedTemplate.config.priceAdjustment,
          value: customDiscount / 100,
          minPrice: customMinPrice,
        },
      };

      const result = await previewPricingRuleImpact(orgId, ruleConfig);

      if (result.success && result.data) {
        setPreviewData({
          affectedProductsCount: result.data.affectedProductsCount,
          revenueImpact: result.data.revenueImpact,
          avgDiscount: result.data.avgDiscount,
        });
      } else {
        throw new Error(result.error || 'Failed to preview impact');
      }
    } catch (error) {
      toast({
        title: 'Preview Error',
        description: error instanceof Error ? error.message : 'Failed to preview impact',
        variant: 'destructive',
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const getDifficultyColor = (difficulty: PricingRuleTemplate['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'intermediate':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'advanced':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Rule Templates</h3>
          <Badge variant="outline" className="ml-auto">
            {PRICING_TEMPLATES.length} Templates
          </Badge>
        </div>

        {/* Category Tabs */}
        <Tabs defaultValue="clearance" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {TEMPLATE_CATEGORIES.map((category) => (
              <TabsTrigger key={category.id} value={category.id}>
                <span className="mr-1">{category.icon}</span>
                <span className="hidden sm:inline">{category.name.split(' ')[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {TEMPLATE_CATEGORIES.map((category) => (
            <TabsContent key={category.id} value={category.id} className="space-y-4">
              {/* Category Description */}
              <p className="text-sm text-muted-foreground">{category.description}</p>

              {/* Templates Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {getTemplatesByCategory(category.id as any).map((template) => (
                  <Card
                    key={template.id}
                    className="flex flex-col cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{template.icon}</span>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                        </div>
                        <Badge className={getDifficultyColor(template.difficulty)}>
                          {template.difficulty}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 pb-3 space-y-2">
                      {/* Estimated Impact */}
                      <div className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{template.estimatedImpact}</span>
                      </div>

                      {/* Recommended For */}
                      <div className="flex flex-wrap gap-1">
                        {template.recommendedFor.slice(0, 2).map((rec, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {rec}
                          </Badge>
                        ))}
                        {template.recommendedFor.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.recommendedFor.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTemplate(template);
                        }}
                      >
                        Use Template
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Customization Dialog */}
      <Dialog open={isCustomizing} onOpenChange={setIsCustomizing}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedTemplate?.icon}</span>
              Customize {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6 py-4">
              {/* Rule Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Rule Name</Label>
                <Input
                  id="name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter rule name"
                />
              </div>

              {/* Discount Percentage */}
              <div className="space-y-2">
                <Label htmlFor="discount">
                  Discount Percentage (Current: {customDiscount}%)
                </Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="40"
                  step="1"
                  value={customDiscount}
                  onChange={(e) => setCustomDiscount(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum 40% discount enforced by system
                </p>
              </div>

              {/* Minimum Price */}
              <div className="space-y-2">
                <Label htmlFor="minPrice">Minimum Price ($)</Label>
                <Input
                  id="minPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={customMinPrice}
                  onChange={(e) => setCustomMinPrice(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Products will never sell below this price
                </p>
              </div>

              {/* Template Info */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Template Details</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Strategy</p>
                    <p className="font-medium capitalize">{selectedTemplate.config.strategy}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Priority</p>
                    <p className="font-medium">{selectedTemplate.config.priority}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Difficulty</p>
                    <Badge className={getDifficultyColor(selectedTemplate.difficulty)}>
                      {selectedTemplate.difficulty}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant={selectedTemplate.config.active ? 'default' : 'secondary'}>
                      {selectedTemplate.config.active ? 'Active' : 'Template'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground mb-2">Recommended For:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplate.recommendedFor.map((rec, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {rec}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm">
                    <span className="font-medium text-green-600 dark:text-green-400">
                      Estimated Impact:{' '}
                    </span>
                    {selectedTemplate.estimatedImpact}
                  </p>
                </div>
              </div>

              {/* Preview Impact Section */}
              <div className="space-y-3">
                <Button
                  onClick={handlePreviewImpact}
                  variant="outline"
                  className="w-full gap-2"
                  disabled={isPreviewing || !customName}
                >
                  <Eye className="h-4 w-4" />
                  {isPreviewing ? 'Calculating...' : 'Preview Impact'}
                </Button>

                {previewData && (
                  <Alert>
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Affected Products:</span>
                          <Badge variant="secondary">{previewData.affectedProductsCount}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Avg Discount:</span>
                          <span className="text-sm font-semibold text-orange-600">
                            {previewData.avgDiscount.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Revenue Impact:</span>
                          <div className="flex items-center gap-1">
                            {previewData.revenueImpact < 0 ? (
                              <>
                                <TrendingDown className="h-4 w-4 text-red-500" />
                                <span className="text-sm font-semibold text-red-600">
                                  ${Math.abs(previewData.revenueImpact).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <>
                                <TrendingUp className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-semibold text-green-600">
                                  +${previewData.revenueImpact.toFixed(2)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomizing(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreateFromTemplate} disabled={isCreating || !customName}>
              {isCreating ? 'Creating...' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
