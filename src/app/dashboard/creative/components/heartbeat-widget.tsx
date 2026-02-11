/**
 * Heartbeat Widget
 *
 * Proactive creative suggestions based on heartbeat system triggers
 * Shows AI-detected opportunities for content creation
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Zap,
  TrendingUp,
  Clock,
  Calendar,
  ShoppingBag,
  Users,
  Sparkles,
  X,
  ChevronRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetTemplate } from '@/types/creative-asset';

export interface CreativeSuggestion {
  id: string;
  type: 'deal' | 'new_product' | 'event' | 'trending' | 'engagement_drop' | 'competitor' | 'birthday';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  reasoning: string;
  suggestedTemplates: string[]; // Template IDs
  suggestedPlatforms: string[];
  expiresAt?: Date;
  createdAt: Date;
  dismissed?: boolean;
  actioned?: boolean;
}

interface HeartbeatWidgetProps {
  suggestions: CreativeSuggestion[];
  onCreateFromSuggestion: (suggestion: CreativeSuggestion, template: AssetTemplate) => void;
  onDismiss: (suggestionId: string) => void;
  className?: string;
}

export function HeartbeatWidget({
  suggestions,
  onCreateFromSuggestion,
  onDismiss,
  className,
}: HeartbeatWidgetProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Filter out dismissed suggestions
  const activeSuggestions = suggestions.filter(s => !s.dismissed);

  // Count by priority
  const highPriority = activeSuggestions.filter(s => s.priority === 'high').length;
  const mediumPriority = activeSuggestions.filter(s => s.priority === 'medium').length;

  return (
    <Card className={cn('w-80 flex flex-col overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-baked-green flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">AI Suggestions</h3>
              <p className="text-xs text-gray-600">Proactive opportunities</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronRight className={cn('w-4 h-4 transition', collapsed && 'rotate-180')} />
          </Button>
        </div>

        {/* Stats */}
        {!collapsed && activeSuggestions.length > 0 && (
          <div className="flex gap-2 mt-3">
            {highPriority > 0 && (
              <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-200">
                {highPriority} High Priority
              </Badge>
            )}
            {mediumPriority > 0 && (
              <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200">
                {mediumPriority} Medium
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Suggestions List */}
      {!collapsed && (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {activeSuggestions.length === 0 ? (
              // Empty State
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h4 className="font-bold text-gray-900 mb-1">All Caught Up!</h4>
                <p className="text-sm text-gray-500">
                  No new suggestions right now
                </p>
              </div>
            ) : (
              activeSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onDismiss={() => onDismiss(suggestion.id)}
                  onAction={() => {
                    // TODO: Open template selector for this suggestion
                    console.log('Action:', suggestion);
                  }}
                />
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {/* Footer */}
      {!collapsed && activeSuggestions.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Powered by Heartbeat AI
          </p>
        </div>
      )}
    </Card>
  );
}

/**
 * Suggestion Card
 */
interface SuggestionCardProps {
  suggestion: CreativeSuggestion;
  onDismiss: () => void;
  onAction: () => void;
}

function SuggestionCard({ suggestion, onDismiss, onAction }: SuggestionCardProps) {
  const config = getSuggestionConfig(suggestion.type);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 p-3 transition hover:shadow-md',
        suggestion.priority === 'high'
          ? 'border-red-200 bg-red-50'
          : suggestion.priority === 'medium'
          ? 'border-yellow-200 bg-yellow-50'
          : 'border-gray-200 bg-white'
      )}
    >
      {/* Dismiss Button */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition"
      >
        <X className="w-3 h-3 text-gray-600" />
      </button>

      {/* Icon & Title */}
      <div className="flex items-start gap-3 mb-2 pr-6">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.bgColor)}>
          <Icon className={cn('w-4 h-4', config.iconColor)} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm text-gray-900 mb-1">
            {suggestion.title}
          </h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            {suggestion.description}
          </p>
        </div>
      </div>

      {/* Reasoning */}
      <div className="mb-3 pl-11">
        <p className="text-xs text-gray-500 italic">
          💡 {suggestion.reasoning}
        </p>
      </div>

      {/* Platforms */}
      {suggestion.suggestedPlatforms && suggestion.suggestedPlatforms.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3 pl-11">
          {suggestion.suggestedPlatforms.map((platform) => (
            <Badge key={platform} variant="outline" className="text-[10px] px-1.5 py-0">
              {platform}
            </Badge>
          ))}
        </div>
      )}

      {/* Action Button */}
      <div className="pl-11">
        <Button
          size="sm"
          onClick={onAction}
          className="w-full bg-baked-green hover:bg-baked-green/90 text-white"
        >
          <Sparkles className="w-3 h-3 mr-2" />
          Create Now
        </Button>
      </div>

      {/* Expiration */}
      {suggestion.expiresAt && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-2 pl-11">
          <Clock className="w-3 h-3" />
          <span>Expires {new Date(suggestion.expiresAt).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Get suggestion type configuration
 */
function getSuggestionConfig(type: CreativeSuggestion['type']) {
  switch (type) {
    case 'deal':
      return {
        icon: ShoppingBag,
        bgColor: 'bg-orange-100',
        iconColor: 'text-orange-600',
      };
    case 'new_product':
      return {
        icon: Sparkles,
        bgColor: 'bg-purple-100',
        iconColor: 'text-purple-600',
      };
    case 'event':
      return {
        icon: Calendar,
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
      };
    case 'trending':
      return {
        icon: TrendingUp,
        bgColor: 'bg-green-100',
        iconColor: 'text-green-600',
      };
    case 'engagement_drop':
      return {
        icon: AlertCircle,
        bgColor: 'bg-red-100',
        iconColor: 'text-red-600',
      };
    case 'competitor':
      return {
        icon: Users,
        bgColor: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
      };
    case 'birthday':
      return {
        icon: Users,
        bgColor: 'bg-pink-100',
        iconColor: 'text-pink-600',
      };
    default:
      return {
        icon: Sparkles,
        bgColor: 'bg-gray-100',
        iconColor: 'text-gray-600',
      };
  }
}

/**
 * Mock suggestions generator (for demo/testing)
 */
export function generateMockSuggestions(): CreativeSuggestion[] {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return [
    {
      id: 'sug_1',
      type: 'deal',
      priority: 'high',
      title: 'Flash Sale Opportunity',
      description: 'You have 5 products with expiring batches in the next week',
      reasoning: 'Creating clearance content can boost sales and reduce waste',
      suggestedTemplates: ['flash_sale', 'weekly_deals'],
      suggestedPlatforms: ['Instagram Story', 'TikTok'],
      expiresAt: tomorrow,
      createdAt: now,
    },
    {
      id: 'sug_2',
      type: 'new_product',
      priority: 'medium',
      title: 'New Product Launch',
      description: '3 new products added this week - announce them!',
      reasoning: 'New arrival posts get 2x more engagement than regular posts',
      suggestedTemplates: ['new_arrival', 'product_spotlight'],
      suggestedPlatforms: ['Instagram Feed', 'Facebook'],
      createdAt: now,
    },
    {
      id: 'sug_3',
      type: 'trending',
      priority: 'medium',
      title: 'Trending Strain Type',
      description: 'Indica products are trending 40% above baseline',
      reasoning: 'Capitalize on current customer preferences',
      suggestedTemplates: ['strain_spotlight', 'terpene_guide'],
      suggestedPlatforms: ['Instagram', 'TikTok'],
      createdAt: now,
    },
  ];
}
