/**
 * Content Calendar Component
 *
 * Visual calendar for planning and scheduling creative content
 */

'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Instagram,
  Facebook,
  Sparkles,
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isToday } from 'date-fns';
import type { CreativeContent } from '@/types/creative-content';

interface ContentCalendarProps {
  brandId: string;
  scheduledContent?: CreativeContent[];
  onScheduleNew?: (date: Date) => void;
  onEditScheduled?: (content: CreativeContent) => void;
}

export function ContentCalendar({
  brandId,
  scheduledContent = [],
  onScheduleNew,
  onEditScheduled,
}: ContentCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<'month' | 'week'>('week');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  // Get content for a specific date
  const getContentForDate = (date: Date) => {
    return scheduledContent.filter((content) =>
      content.scheduledAt && isSameDay(new Date(content.scheduledAt), date)
    );
  };

  // Week view
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const start = startOfWeek(selectedDate);
    return addDays(start, i);
  });

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-baked-green" />
          <h3 className="text-lg font-bold">Content Calendar</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <Select value={view} onValueChange={(v: any) => setView(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week View</SelectItem>
              <SelectItem value="month">Month View</SelectItem>
            </SelectContent>
          </Select>

          {/* Navigation */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedDate(addDays(selectedDate, view === 'week' ? -7 : -30))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium px-3 min-w-[150px] text-center">
              {view === 'week'
                ? `Week of ${format(startOfWeek(selectedDate), 'MMM d, yyyy')}`
                : format(selectedDate, 'MMMM yyyy')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedDate(addDays(selectedDate, view === 'week' ? 7 : 30))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            size="sm"
            onClick={() => setShowScheduleDialog(true)}
            className="bg-baked-green hover:bg-baked-green/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Post
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      {view === 'week' ? (
        // Week View
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayContent = getContentForDate(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`border rounded-lg p-3 min-h-[200px] ${
                  isCurrentDay ? 'border-baked-green bg-green-50' : 'border-gray-200'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xs text-gray-500 uppercase">
                      {format(day, 'EEE')}
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        isCurrentDay ? 'text-baked-green' : 'text-gray-900'
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                  </div>
                  {isCurrentDay && (
                    <Badge variant="outline" className="text-[10px] bg-baked-green text-white border-baked-green">
                      TODAY
                    </Badge>
                  )}
                </div>

                {/* Scheduled Content */}
                <div className="space-y-2">
                  {dayContent.map((content) => (
                    <button
                      key={content.id}
                      onClick={() => onEditScheduled?.(content)}
                      className="w-full text-left p-2 rounded-lg border border-gray-200 hover:border-baked-green hover:bg-green-50 transition group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {content.platform === 'instagram' && (
                          <Instagram className="w-3 h-3 text-pink-500" />
                        )}
                        {content.platform === 'facebook' && (
                          <Facebook className="w-3 h-3 text-blue-500" />
                        )}
                        <span className="text-xs font-medium text-gray-700 group-hover:text-baked-green">
                          {content.scheduledAt && format(new Date(content.scheduledAt), 'h:mm a')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {content.caption}
                      </p>
                      {content.status && (
                        <Badge variant="outline" className="mt-1 text-[9px]">
                          {content.status}
                        </Badge>
                      )}
                    </button>
                  ))}

                  {/* Add Button */}
                  {dayContent.length === 0 && (
                    <button
                      onClick={() => {
                        setSelectedDate(day);
                        onScheduleNew?.(day);
                      }}
                      className="w-full p-3 border-2 border-dashed border-gray-200 rounded-lg hover:border-baked-green hover:bg-green-50 transition flex items-center justify-center gap-2 text-gray-400 hover:text-baked-green"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-xs font-medium">Schedule</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Month View
        <div className="space-y-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border"
          />

          {/* Content for selected date */}
          {selectedDate && (
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-3">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h4>
              <div className="space-y-2">
                {getContentForDate(selectedDate).map((content) => (
                  <button
                    key={content.id}
                    onClick={() => onEditScheduled?.(content)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-baked-green hover:bg-green-50 transition"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {content.platform === 'instagram' && (
                        <Instagram className="w-4 h-4 text-pink-500" />
                      )}
                      {content.platform === 'facebook' && (
                        <Facebook className="w-4 h-4 text-blue-500" />
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {content.scheduledAt && format(new Date(content.scheduledAt), 'h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {content.caption}
                    </p>
                    {content.status && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {content.status}
                      </Badge>
                    )}
                  </button>
                ))}

                {getContentForDate(selectedDate).length === 0 && (
                  <button
                    onClick={() => onScheduleNew?.(selectedDate)}
                    className="w-full p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-baked-green hover:bg-green-50 transition flex items-center justify-center gap-2 text-gray-400 hover:text-baked-green"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Schedule Post</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upcoming Suggestions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-baked-green" />
          Suggested Posts This Week
        </h4>
        <div className="space-y-2">
          <SuggestionCard
            title="Weekly Deals Roundup"
            description="Showcase this week's best deals"
            suggestedDay="Friday"
            platform="Instagram Feed"
          />
          <SuggestionCard
            title="Terpene Tuesday"
            description="Educational post about terpenes"
            suggestedDay="Tuesday"
            platform="Instagram Feed"
          />
          <SuggestionCard
            title="Product Spotlight"
            description="Feature your top-selling product"
            suggestedDay="Wednesday"
            platform="Instagram Story"
          />
        </div>
      </div>
    </Card>
  );
}

/**
 * Suggestion Card Component
 */
interface SuggestionCardProps {
  title: string;
  description: string;
  suggestedDay: string;
  platform: string;
}

function SuggestionCard({ title, description, suggestedDay, platform }: SuggestionCardProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-baked-green hover:bg-green-50 transition group cursor-pointer">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h5 className="text-sm font-semibold text-gray-800 group-hover:text-baked-green">
            {title}
          </h5>
          <Badge variant="outline" className="text-[10px]">
            {suggestedDay}
          </Badge>
        </div>
        <p className="text-xs text-gray-500">{description}</p>
        <div className="flex items-center gap-1 mt-1">
          <Instagram className="w-3 h-3 text-pink-500" />
          <span className="text-xs text-gray-400">{platform}</span>
        </div>
      </div>
      <Button size="sm" variant="ghost" className="group-hover:bg-baked-green group-hover:text-white">
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
