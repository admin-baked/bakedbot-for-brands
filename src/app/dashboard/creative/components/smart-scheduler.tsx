/**
 * Smart Scheduler
 *
 * AI-powered content scheduling with optimal posting times
 * Integrates with heartbeat suggestions and audience insights
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  Clock,
  TrendingUp,
  Users,
  Zap,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, addHours, setHours, setMinutes } from 'date-fns';
import type { SocialPlatform } from '@/types/creative-content';
import type { CreativeAsset } from '@/types/creative-asset';

interface SmartSchedulerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: CreativeAsset | null;
  platform: SocialPlatform;
  onSchedule: (scheduledAt: Date, autoPost: boolean) => void;
}

interface OptimalTime {
  time: Date;
  reason: string;
  engagementScore: number; // 0-100
  audienceSize: number; // estimated reach
}

export function SmartScheduler({
  open,
  onOpenChange,
  asset,
  platform,
  onSchedule,
}: SmartSchedulerProps) {
  const [scheduleType, setScheduleType] = useState<'optimal' | 'custom'>('optimal');
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [autoPost, setAutoPost] = useState(false);

  // Get optimal posting times based on platform and audience insights
  const optimalTimes = getOptimalPostingTimes(platform);

  const handleSchedule = () => {
    const scheduledTime = scheduleType === 'optimal' ? optimalTimes[0].time : selectedTime;
    onSchedule(scheduledTime, autoPost);
    onOpenChange(false);
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Smart Scheduler</DialogTitle>
              <DialogDescription>
                AI-optimized posting times for maximum engagement
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Asset Preview */}
          <Card className="p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              {asset.thumbnailUrl && (
                <img
                  src={asset.thumbnailUrl}
                  alt={asset.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h4 className="font-bold text-sm text-gray-900">{asset.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {platform}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {asset.format}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Schedule Type Toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setScheduleType('optimal')}
              className={cn(
                'p-4 rounded-xl border-2 transition text-left',
                scheduleType === 'optimal'
                  ? 'border-baked-green bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className={cn('w-5 h-5', scheduleType === 'optimal' ? 'text-baked-green' : 'text-gray-400')} />
                <span className="font-bold text-sm">Optimal Time</span>
              </div>
              <p className="text-xs text-gray-600">
                AI-recommended posting times
              </p>
            </button>

            <button
              onClick={() => setScheduleType('custom')}
              className={cn(
                'p-4 rounded-xl border-2 transition text-left',
                scheduleType === 'custom'
                  ? 'border-baked-green bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className={cn('w-5 h-5', scheduleType === 'custom' ? 'text-baked-green' : 'text-gray-400')} />
                <span className="font-bold text-sm">Custom Time</span>
              </div>
              <p className="text-xs text-gray-600">
                Choose your own time
              </p>
            </button>
          </div>

          {/* Optimal Times */}
          {scheduleType === 'optimal' && (
            <div className="space-y-3">
              <Label className="text-sm font-bold">Recommended Posting Times</Label>
              <div className="space-y-2">
                {optimalTimes.map((time, idx) => (
                  <OptimalTimeCard
                    key={idx}
                    time={time}
                    selected={idx === 0}
                    rank={idx + 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Custom Time Picker */}
          {scheduleType === 'custom' && (
            <div className="space-y-3">
              <Label className="text-sm font-bold">Choose Date & Time</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600 mb-2 block">Date</Label>
                  <Select
                    value={selectedTime.toISOString()}
                    onValueChange={(v) => setSelectedTime(new Date(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 7 }).map((_, i) => {
                        const date = addDays(new Date(), i);
                        return (
                          <SelectItem key={i} value={date.toISOString()}>
                            {format(date, 'EEE, MMM d')}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-gray-600 mb-2 block">Time</Label>
                  <Select
                    value={selectedTime.getHours().toString()}
                    onValueChange={(v) => {
                      const newTime = setHours(setMinutes(selectedTime, 0), parseInt(v));
                      setSelectedTime(newTime);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }).map((_, hour) => (
                        <SelectItem key={hour} value={hour.toString()}>
                          {format(setHours(new Date(), hour), 'h:00 a')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <p className="text-xs text-yellow-800">
                  This time may not be optimal for engagement. Consider using AI recommendations.
                </p>
              </div>
            </div>
          )}

          {/* Auto-Post Toggle */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <input
              type="checkbox"
              id="autoPost"
              checked={autoPost}
              onChange={(e) => setAutoPost(e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="autoPost" className="font-bold text-sm text-gray-900 cursor-pointer">
                Auto-publish at scheduled time
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Automatically post to {platform} without manual approval
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              className="flex-1 bg-baked-green hover:bg-baked-green/90"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Optimal Time Card
 */
interface OptimalTimeCardProps {
  time: OptimalTime;
  selected: boolean;
  rank: number;
}

function OptimalTimeCard({ time, selected, rank }: OptimalTimeCardProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border-2 transition',
        selected
          ? 'border-baked-green bg-green-50'
          : 'border-gray-200 hover:border-gray-300'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <Badge
            variant={rank === 1 ? 'default' : 'outline'}
            className={cn(
              'text-xs font-bold',
              rank === 1 && 'bg-baked-green'
            )}
          >
            #{rank}
          </Badge>
          <div>
            <div className="font-bold text-sm text-gray-900">
              {format(time.time, 'EEEE, MMM d')}
            </div>
            <div className="text-sm text-gray-600">
              {format(time.time, 'h:mm a')}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-baked-green" />
            <span className="text-sm font-bold text-baked-green">
              {time.engagementScore}%
            </span>
          </div>
          <div className="text-xs text-gray-500">engagement</div>
        </div>
      </div>

      <p className="text-xs text-gray-600 mb-2">{time.reason}</p>

      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Users className="w-3 h-3" />
        <span>~{time.audienceSize.toLocaleString()} estimated reach</span>
      </div>
    </div>
  );
}

/**
 * Get optimal posting times based on platform and historical data
 */
function getOptimalPostingTimes(platform: SocialPlatform): OptimalTime[] {
  const now = new Date();
  const baseEngagement = {
    instagram: 65,
    tiktok: 70,
    facebook: 55,
    twitter: 60,
    linkedin: 50,
  };

  // Mock optimal times based on platform best practices
  const times: OptimalTime[] = [];

  // Tomorrow at 9 AM
  times.push({
    time: setHours(setMinutes(addDays(now, 1), 0), 9),
    reason: 'Peak morning engagement for your audience',
    engagementScore: baseEngagement[platform] + 15,
    audienceSize: 2500,
  });

  // Tomorrow at 2 PM
  times.push({
    time: setHours(setMinutes(addDays(now, 1), 0), 14),
    reason: 'Lunch break browsing time',
    engagementScore: baseEngagement[platform] + 10,
    audienceSize: 2200,
  });

  // Tomorrow at 7 PM
  times.push({
    time: setHours(setMinutes(addDays(now, 1), 0), 19),
    reason: 'Evening engagement peak',
    engagementScore: baseEngagement[platform] + 12,
    audienceSize: 3000,
  });

  return times.sort((a, b) => b.engagementScore - a.engagementScore);
}
