/**
 * Memory Panel
 *
 * View and manage learned creative preferences
 * Shows what the AI has learned about user's style
 */

'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Brain,
  TrendingUp,
  Palette,
  MessageSquare,
  Hash,
  Eye,
  Trash2,
  RefreshCw,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UseCreativeMemoryReturn, CreativePreferences } from '@/hooks/use-creative-memory';

interface MemoryPanelProps {
  memory: UseCreativeMemoryReturn;
  className?: string;
}

export function MemoryPanel({ memory, className }: MemoryPanelProps) {
  const { preferences, clearHistory } = memory;

  if (!preferences) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="text-center">
          <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-bold text-gray-900 mb-2">Learning Your Style</h3>
          <p className="text-sm text-gray-600">
            As you create content, BakedBot learns your preferences
          </p>
        </div>
      </Card>
    );
  }

  const totalGenerations = preferences.generationHistory.length;
  const approvedGenerations = preferences.generationHistory.filter(g => g.approved === true).length;
  const approvalRate = totalGenerations > 0
    ? Math.round((approvedGenerations / totalGenerations) * 100)
    : 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Brain className="w-4 h-4" />
          Memory Insights
          {totalGenerations > 0 && (
            <Badge variant="secondary" className="ml-1">
              {totalGenerations}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Creative Memory</DialogTitle>
              <DialogDescription>
                What BakedBot has learned about your style
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Performance Stats */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                icon={Hash}
                label="Total Generations"
                value={totalGenerations.toString()}
                color="bg-blue-100 text-blue-600"
              />
              <StatCard
                icon={CheckCircle}
                label="Approval Rate"
                value={`${approvalRate}%`}
                color="bg-green-100 text-green-600"
              />
              <StatCard
                icon={TrendingUp}
                label="Favorite Templates"
                value={preferences.favoriteTemplates.length.toString()}
                color="bg-purple-100 text-purple-600"
              />
            </div>

            <Separator />

            {/* Favorite Templates */}
            {preferences.favoriteTemplates.length > 0 && (
              <Section
                icon={Palette}
                title="Favorite Templates"
                description="Templates you use most often"
              >
                <div className="space-y-2">
                  {preferences.favoriteTemplates.slice(0, 5).map((templateId, idx) => (
                    <div
                      key={templateId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          #{idx + 1}
                        </Badge>
                        <span className="text-sm font-medium text-gray-900">
                          {templateId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Preferred Platforms */}
            {preferences.preferredPlatforms.length > 0 && (
              <Section
                icon={Hash}
                title="Preferred Platforms"
                description="Where you publish most"
              >
                <div className="flex flex-wrap gap-2">
                  {preferences.preferredPlatforms.map((platform) => (
                    <Badge
                      key={platform}
                      variant="outline"
                      className="px-3 py-1.5 text-sm capitalize"
                    >
                      {platform}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}

            {/* Preferred Tones */}
            {preferences.preferredTones.length > 0 && (
              <Section
                icon={MessageSquare}
                title="Preferred Tones"
                description="Tones you use consistently"
              >
                <div className="flex flex-wrap gap-2">
                  {preferences.preferredTones.map((tone) => (
                    <Badge
                      key={tone}
                      variant="outline"
                      className="px-3 py-1.5 text-sm capitalize"
                    >
                      {tone}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}

            {/* Recent History */}
            {preferences.generationHistory.length > 0 && (
              <Section
                icon={Eye}
                title="Recent Generations"
                description="Last 10 creative generations"
              >
                <div className="space-y-2">
                  {preferences.generationHistory.slice(0, 10).map((generation, idx) => (
                    <div
                      key={generation.timestamp}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={generation.approved ? 'default' : 'outline'}
                            className={cn(
                              'text-xs',
                              generation.approved
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : generation.approved === false
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : ''
                            )}
                          >
                            {generation.approved ? 'Approved' : generation.approved === false ? 'Rejected' : 'Pending'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(generation.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {generation.prompt}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span className="capitalize">{generation.platform}</span>
                        <span>•</span>
                        <span className="capitalize">{generation.tone}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-xs text-gray-500">
            Memory helps improve suggestions over time
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Clear all memory? This cannot be undone.')) {
                  clearHistory();
                }
              }}
            >
              <Trash2 className="w-3 h-3 mr-2" />
              Clear Memory
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Stat Card
 */
interface StatCardProps {
  icon: any;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-black text-gray-900 mb-1">{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}

/**
 * Section
 */
interface SectionProps {
  icon: any;
  title: string;
  description: string;
  children: React.ReactNode;
}

function Section({ icon: Icon, title, description, children }: SectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-gray-600" />
        <div>
          <h4 className="font-bold text-sm text-gray-900">{title}</h4>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
