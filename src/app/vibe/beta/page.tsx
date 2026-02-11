'use client';

/**
 * Vibe IDE Beta - Demo & Testing Page
 *
 * Showcases all new Vibe IDE features:
 * - Multi-provider payments
 * - Template marketplace
 * - Custom domain setup
 * - Real-time collaboration
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Code2,
  Users,
  CreditCard,
  Globe,
  Download,
  Sparkles,
  Rocket,
  CheckCircle
} from 'lucide-react';
import { TemplateMarketplace } from './components/template-marketplace';
import { CustomDomainSetup } from './components/custom-domain-setup';
import { CollaborationManager } from './components/collaboration-manager';
import Link from 'next/link';

export default function VibeBetaPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Code2 className="w-8 h-8 text-primary" />
                <h1 className="text-4xl font-bold">Vibe IDE</h1>
                <Badge variant="secondary" className="ml-2">Beta</Badge>
              </div>
              <p className="text-muted-foreground text-lg">
                Build, deploy, and collaborate on cannabis websites in real-time
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/vibe">
                <Button variant="outline">
                  Back to Vibe Studio
                </Button>
              </Link>
              <Link href="/dashboard/vibe-studio">
                <Button>
                  <Rocket className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Multi-Provider Payments</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Authorize.net, Stripe, and Square CBD integration
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                Production Ready
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Template Marketplace</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                1000+ community templates to start from
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                Production Ready
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Custom Domains</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Deploy to your own domain with DNS wizard
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                Production Ready
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Real-Time Collaboration</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Live code editing with team members
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                Production Ready
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="domains">Domains</TabsTrigger>
            <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
            <TabsTrigger value="extension">VS Code</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>What's New in Vibe IDE</CardTitle>
                <CardDescription>
                  We've built a complete development platform on top of Vibe Studio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">🎨 From Theme Generator to Full IDE</h3>
                  <p className="text-sm text-muted-foreground">
                    Vibe Studio generates beautiful themes. Vibe IDE takes it further with:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1 ml-4">
                    <li>Full Next.js code generation with live preview</li>
                    <li>Backend integration (Firestore, API routes, auth)</li>
                    <li>One-click deployment to Firebase</li>
                    <li>GitHub repository creation</li>
                    <li>Real-time collaborative editing</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">💳 Flexible Payment Processing</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose the payment provider that works for your business:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1 ml-4">
                    <li><strong>Authorize.net</strong> - Cannabis-friendly, PCI compliant</li>
                    <li><strong>Stripe</strong> - Standard products only (no cannabis)</li>
                    <li><strong>Square CBD</strong> - Specialized cannabis payments</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">📦 VS Code Extension</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Develop locally with full IDE features:
                  </p>
                  <div className="bg-muted p-4 rounded-lg">
                    <code className="text-sm">
                      code --install-extension vscode-extension/bakedbot-vibe-ide-1.0.0.vsix
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <TemplateMarketplace
              userId="demo_user"
              onTemplateSelect={(template) => {
                console.log('Selected template:', template);
              }}
            />
          </TabsContent>

          {/* Domains Tab */}
          <TabsContent value="domains" className="mt-6">
            <CustomDomainSetup
              projectId="demo_project"
              userId="demo_user"
              currentSubdomain="my-dispensary"
              onDomainConfigured={(domain) => {
                console.log('Domain configured:', domain);
              }}
            />
          </TabsContent>

          {/* Collaboration Tab */}
          <TabsContent value="collaboration" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Real-Time Collaboration</CardTitle>
                <CardDescription>
                  Work together on code with live cursor tracking and built-in chat
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <CollaborationManager
                    projectId="demo_project"
                    userId="demo_user"
                    userName="Demo User"
                    onSessionStart={(sessionId) => {
                      console.log('Session started:', sessionId);
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div>
                    <h4 className="font-semibold mb-2">Features</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✓ Live cursor tracking</li>
                      <li>✓ Real-time code sync</li>
                      <li>✓ Built-in chat</li>
                      <li>✓ File locking</li>
                      <li>✓ Conflict resolution</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Powered By</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Firebase Realtime Database</li>
                      <li>• Monaco Editor (VS Code)</li>
                      <li>• Operational Transforms</li>
                      <li>• WebSockets</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* VS Code Extension Tab */}
          <TabsContent value="extension" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>BakedBot Vibe IDE Extension</CardTitle>
                <CardDescription>
                  Develop locally with full VS Code integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Installation</h3>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="text-sm font-mono">
                      # Install from VSIX
                    </p>
                    <code className="text-sm block">
                      code --install-extension vscode-extension/bakedbot-vibe-ide-1.0.0.vsix
                    </code>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Project Creation</p>
                        <p className="text-xs text-muted-foreground">
                          Create from templates or scratch
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Live Preview</p>
                        <p className="text-xs text-muted-foreground">
                          Hot reload development server
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Cloud Sync</p>
                        <p className="text-xs text-muted-foreground">
                          Auto-sync to BakedBot cloud
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">One-Click Deploy</p>
                        <p className="text-xs text-muted-foreground">
                          Deploy to *.bakedbot.ai
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Quick Start Commands</h3>
                  <div className="space-y-2">
                    <div className="bg-muted p-3 rounded">
                      <code className="text-sm">Ctrl+Shift+P → "Vibe IDE: Create New Project"</code>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <code className="text-sm">Ctrl+Shift+P → "Vibe IDE: Preview Project"</code>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <code className="text-sm">Ctrl+Shift+P → "Vibe IDE: Deploy to Production"</code>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button asChild>
                    <a href="/vscode-extension/bakedbot-vibe-ide-1.0.0.vsix" download>
                      <Download className="w-4 h-4 mr-2" />
                      Download Extension
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="/vscode-extension/README.md" target="_blank">
                      View Documentation
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
