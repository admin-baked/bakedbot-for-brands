'use client';

/**
 * Vibe IDE Beta Page
 *
 * New experimental vibe experience that generates live code instead of just themes.
 * Users can prompt → generate React components → preview in WebContainer → export as .zip
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Sparkles,
  Code2,
  Wand2,
  ArrowRight,
  Download,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { generateCodeFromVibe, refineCode, exportProjectAsZip } from './actions';
import { VibeCodePreview } from './components/vibe-code-preview';
import { UpgradeModal } from './components/upgrade-modal';
import type { VibeCodeProject } from '@/types/vibe-code';
import type { VibeConfig } from '@/types/vibe';

// Example prompts
const EXAMPLE_PROMPTS = [
  'Dark luxury dispensary with gold accents, large product images, and smooth animations',
  'Minimal and fast - clean white background, green accents, Instagram-style product grid',
  'Cyberpunk themed with neon green and purple, futuristic fonts, glowing cards',
];

export default function VibeBetaPage() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [project, setProject] = useState<VibeCodeProject | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [refining, setRefining] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | undefined>();

  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.length < 20) {
      toast({
        title: 'Describe your vision',
        description: 'Please provide a more detailed description (at least 20 characters)',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    try {
      // Create a basic vibe config from the prompt
      const vibeConfig: Partial<VibeConfig> = {
        name: 'Custom Dispensary',
        description: prompt,
        theme: {
          colors: {
            primary: '#10b981',
            secondary: '#059669',
            accent: '#fbbf24',
            background: '#ffffff',
            surface: '#f9fafb',
            text: '#111827',
            textMuted: '#6b7280',
            border: '#e5e7eb',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
          },
          typography: {
            headingFont: 'Inter',
            bodyFont: 'Inter',
            headingWeight: 700,
            bodyWeight: 400,
            baseSize: 16,
            lineHeight: 1.6,
            letterSpacing: 0,
          },
          spacing: {
            unit: 8,
            compact: false,
          },
          radius: {
            none: '0',
            sm: '4px',
            md: '8px',
            lg: '16px',
            xl: '24px',
            full: '9999px',
            default: 'md',
          },
          shadows: {
            style: 'medium',
          },
        },
        generatedBy: 'ai',
      };

      const result = await generateCodeFromVibe(vibeConfig, prompt);

      if (result.success && result.project) {
        setProject(result.project);
        toast({
          title: 'Code Generated!',
          description: `Created ${result.project.files.length} files. Check out the live preview!`,
        });
      } else {
        toast({
          title: 'Generation Failed',
          description: result.error || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!project || !refinementPrompt.trim()) return;

    setRefining(true);
    try {
      const result = await refineCode(project.id, refinementPrompt);

      if (result.success && result.project) {
        setProject(result.project);
        setRefinementPrompt('');
        toast({
          title: 'Code Refined!',
          description: result.reasoning || 'Changes applied successfully',
        });
      } else {
        toast({
          title: 'Refinement Failed',
          description: result.error || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refine code',
        variant: 'destructive',
      });
    } finally {
      setRefining(false);
    }
  };

  const handleExport = async () => {
    if (!project) return;

    setExporting(true);
    try {
      const result = await exportProjectAsZip(project.id);

      if (result.success && result.zipData && result.filename) {
        // Create blob and download
        const blob = new Blob([new Uint8Array(result.zipData)], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: 'Project Exported!',
          description: `Downloaded ${result.filename}`,
        });
      } else {
        toast({
          title: 'Export Failed',
          description: result.error || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export project',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const startOver = () => {
    setProject(null);
    setPrompt('');
    setRefinementPrompt('');
  };

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      {!project && (
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4 gap-1">
            <Code2 className="h-3 w-3" />
            Beta - Code Generation
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            AI Builds Your Dispensary<br />
            <span className="text-primary">With Real Code</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-4">
            Describe your vision and get a complete Next.js app with live preview and editable code.
          </p>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" />
            Powered by Claude Sonnet 4.5 + WebContainers
          </p>
        </div>
      )}

      {/* Generator Section */}
      {!project ? (
        <div className="max-w-3xl mx-auto space-y-8">
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="h-5 w-5 text-primary" />
                <span className="font-semibold">Describe Your Dispensary Website</span>
              </div>
              <Textarea
                placeholder="e.g., Dark luxury dispensary with gold accents and large product images. Think high-end retail meets cannabis. Smooth hover animations, modern sans-serif fonts, and a product grid that looks like an Apple store."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                className="resize-none text-lg"
              />
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={generating}
                className="w-full gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating Code...
                  </>
                ) : (
                  <>
                    <Code2 className="h-5 w-5" />
                    Generate Live Code
                  </>
                )}
              </Button>

              {/* Example prompts */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Try one of these:</p>
                <div className="flex flex-col gap-2">
                  {EXAMPLE_PROMPTS.map((example, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-2 text-left justify-start"
                      onClick={() => setPrompt(example)}
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Beta Notice */}
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                What Makes This Different?
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
                  <span><strong>Real Code:</strong> Get actual React components, not just design configs</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
                  <span><strong>Live Preview:</strong> See your site running in a real dev server</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
                  <span><strong>Edit & Refine:</strong> Modify code directly or use AI to make changes</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
                  <span><strong>Export & Deploy:</strong> Download as .zip and deploy to Vercel in minutes</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Social Proof */}
          <div className="text-center pt-8 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              Want the original theme generator?{' '}
              <Link href="/vibe" className="text-primary hover:underline">
                Try Vibe Studio Classic
              </Link>
            </p>
          </div>
        </div>
      ) : (
        /* Code Preview Section */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="default" className="gap-1">
                  <Code2 className="h-3 w-3" />
                  Live Code
                </Badge>
              </div>
              <h2 className="text-2xl font-bold">{project.name}</h2>
              <p className="text-muted-foreground">{project.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                onClick={() => setShowUpgradeModal(true)}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                Add Backend
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={exporting}
                className="gap-2"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export ZIP
              </Button>
              <Button variant="ghost" onClick={startOver} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Start Over
              </Button>
            </div>
          </div>

          {/* Live Preview */}
          <VibeCodePreview project={project} onExport={handleExport} />

          {/* Refinement Input */}
          <Card className="border-dashed">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Refine Your Code</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tell the AI what to change: "make the headers bolder", "add a search bar", "use darker colors"
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Add a sticky navigation bar with cart icon..."
                  value={refinementPrompt}
                  onChange={(e) => setRefinementPrompt(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleRefine}
                  disabled={refining || !refinementPrompt.trim()}
                  className="gap-2"
                >
                  {refining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Refine
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps CTA */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-bold mb-2">Ready to Go Live?</h3>
              <p className="text-muted-foreground mb-6">
                Export your code and deploy to Vercel, Netlify, or any hosting platform in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={handleExport} disabled={exporting} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Project
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/signup" className="gap-2">
                    Get Full Platform Access
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upgrade Modal */}
      {project && (
        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          projectId={project.id}
          projectName={project.name}
          userId="demo-user" // TODO: Get from auth
          orgId={undefined} // TODO: Get from user's org
          onSuccess={(url) => {
            if (url) {
              setDeploymentUrl(url);
              toast({
                title: 'Deployed Successfully!',
                description: 'Your full-stack app is now live',
              });
            }
          }}
        />
      )}
    </div>
  );
}
