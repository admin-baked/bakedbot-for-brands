/**
 * Competitor Analysis Tab
 *
 * Analyze competitor brands and get strategic insights.
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, TrendingUp, TrendingDown, Minus, Target, Lightbulb, AlertTriangle } from 'lucide-react';
import { analyzeCompetitorBrand } from '@/server/actions/brand-guide';
import { useToast } from '@/hooks/use-toast';
import type { BrandGuide } from '@/types/brand-guide';

interface CompetitorAnalysisTabProps {
  brandId: string;
  brandGuide: BrandGuide;
}

interface CompetitorAnalysis {
  competitorName: string;
  competitorUrl: string;
  analyzedAt: Date;
  brandSummary: any;
  comparison: any;
  recommendations: string[];
}

export function CompetitorAnalysisTab({ brandId, brandGuide }: CompetitorAnalysisTabProps) {
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [competitorName, setCompetitorName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!competitorUrl.trim()) {
      toast({
        title: 'URL Required',
        description: 'Please enter a competitor website URL.',
        variant: 'destructive',
      });
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);

    try {
      const result = await analyzeCompetitorBrand(
        brandId,
        competitorUrl,
        competitorName || undefined
      );

      if (!result.success || !result.analysis) {
        throw new Error(result.error || 'Analysis failed');
      }

      setAnalysis(result.analysis);

      toast({
        title: 'Analysis Complete',
        description: `Successfully analyzed ${result.analysis.competitorName}`,
      });
    } catch (error) {
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Failed to analyze competitor',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getSimilarityColor = (score: number) => {
    if (score < 30) return 'text-green-600';
    if (score < 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSimilarityIcon = (score: number) => {
    if (score < 30) return <TrendingDown className="w-4 h-4" />;
    if (score < 60) return <Minus className="w-4 h-4" />;
    return <TrendingUp className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Analyze Competitor
          </CardTitle>
          <CardDescription>
            Enter a competitor's website URL to analyze their brand and compare with yours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="competitor-url">Competitor Website URL</Label>
              <Input
                id="competitor-url"
                type="url"
                value={competitorUrl}
                onChange={(e) => setCompetitorUrl(e.target.value)}
                placeholder="https://competitor.com"
                disabled={analyzing}
              />
            </div>
            <div>
              <Label htmlFor="competitor-name">Competitor Name (Optional)</Label>
              <Input
                id="competitor-name"
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
                placeholder="e.g., Green Valley Cannabis"
                disabled={analyzing}
              />
            </div>
          </div>

          <Button onClick={handleAnalyze} disabled={analyzing} className="w-full">
            {analyzing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Analyze Competitor
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <>
          {/* Similarity Scores */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Similarity Analysis</CardTitle>
              <CardDescription>
                How similar is {analysis.competitorName} to {brandGuide.brandName}?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Color Similarity */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Label>Color Palette Similarity</Label>
                    {getSimilarityIcon(analysis.comparison.colorSimilarity)}
                  </div>
                  <span className={`text-sm font-semibold ${getSimilarityColor(analysis.comparison.colorSimilarity)}`}>
                    {analysis.comparison.colorSimilarity.toFixed(0)}%
                  </span>
                </div>
                <Progress value={analysis.comparison.colorSimilarity} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {analysis.comparison.colorSimilarity < 30
                    ? 'Distinct color palette - good differentiation'
                    : analysis.comparison.colorSimilarity < 60
                    ? 'Some color overlap - consider adjusting for uniqueness'
                    : 'High similarity - consider refreshing your color palette'}
                </p>
              </div>

              {/* Voice Similarity */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Label>Brand Voice Similarity</Label>
                    {getSimilarityIcon(analysis.comparison.voiceSimilarity)}
                  </div>
                  <span className={`text-sm font-semibold ${getSimilarityColor(analysis.comparison.voiceSimilarity)}`}>
                    {analysis.comparison.voiceSimilarity.toFixed(0)}%
                  </span>
                </div>
                <Progress value={analysis.comparison.voiceSimilarity} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {analysis.comparison.voiceSimilarity < 30
                    ? 'Unique brand voice - strong differentiation'
                    : analysis.comparison.voiceSimilarity < 60
                    ? 'Moderate voice similarity - some overlap'
                    : 'High similarity - consider developing a more distinct voice'}
                </p>
              </div>

              {/* Positioning Overlap */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Label>Market Positioning Overlap</Label>
                    {getSimilarityIcon(analysis.comparison.positioningOverlap)}
                  </div>
                  <span className={`text-sm font-semibold ${getSimilarityColor(analysis.comparison.positioningOverlap)}`}>
                    {analysis.comparison.positioningOverlap.toFixed(0)}%
                  </span>
                </div>
                <Progress value={analysis.comparison.positioningOverlap} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Competitor Brand Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{analysis.competitorName} Brand Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Colors */}
              <div>
                <Label className="mb-2 block">Color Palette</Label>
                <div className="flex gap-2">
                  <div
                    className="w-16 h-16 rounded border"
                    style={{ backgroundColor: analysis.brandSummary.primaryColor.hex }}
                    title="Primary"
                  />
                  <div
                    className="w-16 h-16 rounded border"
                    style={{ backgroundColor: analysis.brandSummary.secondaryColor.hex }}
                    title="Secondary"
                  />
                </div>
              </div>

              {/* Personality */}
              <div>
                <Label className="mb-2 block">Personality Traits</Label>
                <div className="flex flex-wrap gap-2">
                  {analysis.brandSummary.personality.map((trait: string) => (
                    <Badge key={trait} variant="secondary">
                      {trait}
                    </Badge>
                  ))}
                  <Badge variant="outline">{analysis.brandSummary.tone}</Badge>
                </div>
              </div>

              {/* Messaging */}
              {analysis.brandSummary.tagline && (
                <div>
                  <Label className="mb-1 block">Tagline</Label>
                  <p className="text-sm italic">&ldquo;{analysis.brandSummary.tagline}&rdquo;</p>
                </div>
              )}

              {analysis.brandSummary.positioning && (
                <div>
                  <Label className="mb-1 block">Positioning</Label>
                  <p className="text-sm text-muted-foreground">
                    {analysis.brandSummary.positioning}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Strategic Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Differentiators */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  Your Differentiators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.comparison.differentiators.map((diff: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>{diff}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Opportunities */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.comparison.opportunities.map((opp: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">→</span>
                      <span>{opp}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Threats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  Competitive Threats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.comparison.threats.map((threat: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-orange-600 mt-0.5">!</span>
                      <span>{threat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Strategic Recommendations</CardTitle>
              <CardDescription>
                AI-powered suggestions to strengthen your competitive position
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.recommendations.map((rec: string, i: number) => (
                  <Alert key={i}>
                    <Lightbulb className="w-4 h-4" />
                    <AlertDescription>{rec}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
