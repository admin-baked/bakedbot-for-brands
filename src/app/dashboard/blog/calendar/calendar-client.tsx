'use client';

/**
 * Content Calendar Client Component
 *
 * Monthly calendar grid with color-coded content types,
 * publishing cadence sidebar, and performance dashboard.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    BarChart3,
    CheckCircle2,
    XCircle,
    Clock,
    Eye,
    FileText,
    TrendingUp,
} from 'lucide-react';
import {
    getContentCalendar,
    getContentPerformance,
    getPublishingCadence,
    type CalendarEntry,
    type ContentPerformance,
    type CadenceReport,
} from '@/server/actions/content-calendar';

// ============================================================================
// Color coding for content types
// ============================================================================

const CONTENT_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    standard: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Standard' },
    hub: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Hub' },
    spoke: { bg: 'bg-green-100', text: 'text-green-700', label: 'Spoke' },
    programmatic: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Auto' },
    comparison: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Compare' },
    report: { bg: 'bg-red-100', text: 'text-red-700', label: 'Report' },
};

const STATUS_DOTS: Record<string, string> = {
    draft: 'bg-gray-400',
    pending_review: 'bg-yellow-400',
    approved: 'bg-blue-400',
    scheduled: 'bg-purple-400',
    published: 'bg-green-400',
    archived: 'bg-gray-300',
};

// ============================================================================
// Calendar Grid
// ============================================================================

function CalendarGrid({ entries, currentMonth, currentYear }: {
    entries: CalendarEntry[];
    currentMonth: number;
    currentYear: number;
}) {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const padding = Array.from({ length: firstDayOfWeek }, (_, i) => i);

    const getEntriesForDay = (day: number) => {
        return entries.filter(e => {
            const d = new Date(e.date);
            return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
    };

    return (
        <div className="border rounded-lg overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-muted/50">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground border-b">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7">
                {/* Empty padding cells */}
                {padding.map(i => (
                    <div key={`pad-${i}`} className="min-h-[100px] border-b border-r bg-muted/20" />
                ))}

                {/* Day cells */}
                {days.map(day => {
                    const dayEntries = getEntriesForDay(day);
                    const isToday = new Date().getDate() === day
                        && new Date().getMonth() === currentMonth
                        && new Date().getFullYear() === currentYear;

                    return (
                        <div
                            key={day}
                            className={`min-h-[100px] border-b border-r p-1.5 ${isToday ? 'bg-primary/5' : ''}`}
                        >
                            <span className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                {day}
                            </span>
                            <div className="mt-1 space-y-1">
                                {dayEntries.slice(0, 3).map(entry => {
                                    const typeColor = CONTENT_TYPE_COLORS[entry.contentType || 'standard'];
                                    return (
                                        <div
                                            key={entry.id}
                                            className={`text-xs px-1.5 py-0.5 rounded truncate ${typeColor.bg} ${typeColor.text}`}
                                            title={`${entry.title} (${entry.status})`}
                                        >
                                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${STATUS_DOTS[entry.status] || 'bg-gray-400'}`} />
                                            {entry.title}
                                        </div>
                                    );
                                })}
                                {dayEntries.length > 3 && (
                                    <span className="text-xs text-muted-foreground pl-1">
                                        +{dayEntries.length - 3} more
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================================================
// Cadence Sidebar
// ============================================================================

function CadenceSidebar({ cadence }: { cadence: CadenceReport }) {
    if (cadence.series.length === 0) {
        return (
            <Card>
                <CardContent className="p-4 text-sm text-muted-foreground text-center">
                    No content series configured.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Publishing Cadence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {cadence.series.map(s => (
                    <div key={s.id} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {s.postsThisPeriod}/{s.targetThisPeriod} ({s.targetFrequency})
                            </p>
                        </div>
                        {s.onTrack ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Performance Tab
// ============================================================================

function PerformanceTab({ performance, dateRange, onDateRangeChange }: {
    performance: ContentPerformance;
    dateRange: '7d' | '30d' | '90d';
    onDateRangeChange: (range: '7d' | '30d' | '90d') => void;
}) {
    return (
        <div className="space-y-6">
            {/* Date range selector */}
            <div className="flex justify-end">
                <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as '7d' | '30d' | '90d')}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Eye className="w-4 h-4" />
                            <span className="text-xs">Total Views</span>
                        </div>
                        <p className="text-2xl font-bold">{performance.totalViews.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <FileText className="w-4 h-4" />
                            <span className="text-xs">Published</span>
                        </div>
                        <p className="text-2xl font-bold">{performance.publishedPosts}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs">This Week</span>
                        </div>
                        <p className="text-2xl font-bold">{performance.publishingFrequency.postsThisWeek}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <CalendarDays className="w-4 h-4" />
                            <span className="text-xs">This Month</span>
                        </div>
                        <p className="text-2xl font-bold">{performance.publishingFrequency.postsThisMonth}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Top Posts */}
            {performance.topPosts.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Top Posts by Views</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {performance.topPosts.map((post, i) => (
                                <div key={post.id} className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{post.title}</p>
                                        <p className="text-xs text-muted-foreground">{post.category}</p>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                        {post.views.toLocaleString()} views
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Views by Category */}
            {Object.keys(performance.viewsByCategory).length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Views by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(performance.viewsByCategory)
                                .sort(([, a], [, b]) => (b || 0) - (a || 0))
                                .map(([category, views]) => {
                                    const maxViews = Math.max(...Object.values(performance.viewsByCategory).map(v => v || 0));
                                    const pct = maxViews > 0 ? ((views || 0) / maxViews) * 100 : 0;
                                    return (
                                        <div key={category} className="flex items-center gap-3">
                                            <span className="text-xs w-24 truncate text-muted-foreground capitalize">
                                                {category.replace(/_/g, ' ')}
                                            </span>
                                            <div className="flex-1 bg-muted rounded-full h-2">
                                                <div
                                                    className="bg-primary rounded-full h-2 transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium w-12 text-right">
                                                {(views || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Views by Content Type */}
            {Object.keys(performance.viewsByContentType).length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Views by Content Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(performance.viewsByContentType)
                                .sort(([, a], [, b]) => b - a)
                                .map(([type, views]) => {
                                    const typeInfo = CONTENT_TYPE_COLORS[type] || CONTENT_TYPE_COLORS.standard;
                                    return (
                                        <Badge key={type} variant="outline" className={`${typeInfo.bg} ${typeInfo.text} border-0`}>
                                            {typeInfo.label}: {views.toLocaleString()}
                                        </Badge>
                                    );
                                })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export function ContentCalendarClient() {
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [entries, setEntries] = useState<CalendarEntry[]>([]);
    const [cadence, setCadence] = useState<CadenceReport>({ series: [] });
    const [performance, setPerformance] = useState<ContentPerformance | null>(null);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
    const [loading, setLoading] = useState(true);

    const loadCalendar = useCallback(async () => {
        setLoading(true);
        try {
            const startDate = new Date(currentYear, currentMonth, 1).toISOString();
            const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

            const [calendarData, cadenceData] = await Promise.all([
                getContentCalendar({ startDate, endDate }),
                getPublishingCadence(),
            ]);

            setEntries(calendarData);
            setCadence(cadenceData);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, [currentMonth, currentYear]);

    const loadPerformance = useCallback(async () => {
        try {
            const data = await getContentPerformance({ dateRange });
            setPerformance(data);
        } catch {
            // silently fail
        }
    }, [dateRange]);

    useEffect(() => {
        loadCalendar();
    }, [loadCalendar]);

    useEffect(() => {
        loadPerformance();
    }, [loadPerformance]);

    const navigateMonth = (delta: number) => {
        const newDate = new Date(currentYear, currentMonth + delta, 1);
        setCurrentMonth(newDate.getMonth());
        setCurrentYear(newDate.getFullYear());
    };

    const monthLabel = new Date(currentYear, currentMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Content Calendar</h1>
                    <p className="text-sm text-muted-foreground">Editorial calendar, publishing cadence, and performance tracking.</p>
                </div>
            </div>

            <Tabs defaultValue="calendar">
                <TabsList>
                    <TabsTrigger value="calendar" className="gap-1.5">
                        <CalendarDays className="w-4 h-4" />
                        Calendar
                    </TabsTrigger>
                    <TabsTrigger value="performance" className="gap-1.5">
                        <BarChart3 className="w-4 h-4" />
                        Performance
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="calendar" className="mt-4">
                    <div className="grid lg:grid-cols-[1fr_280px] gap-6">
                        {/* Calendar */}
                        <div>
                            {/* Month navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <h2 className="text-lg font-semibold">{monthLabel}</h2>
                                <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>

                            {loading ? (
                                <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                                    <Clock className="w-5 h-5 animate-spin mr-2" />
                                    Loading calendar...
                                </div>
                            ) : (
                                <CalendarGrid
                                    entries={entries}
                                    currentMonth={currentMonth}
                                    currentYear={currentYear}
                                />
                            )}

                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mt-4">
                                {Object.entries(CONTENT_TYPE_COLORS).map(([type, color]) => (
                                    <div key={type} className="flex items-center gap-1.5 text-xs">
                                        <span className={`w-3 h-3 rounded ${color.bg}`} />
                                        <span className="text-muted-foreground">{color.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Cadence sidebar */}
                        <div>
                            <CadenceSidebar cadence={cadence} />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="performance" className="mt-4">
                    {performance ? (
                        <PerformanceTab
                            performance={performance}
                            dateRange={dateRange}
                            onDateRangeChange={setDateRange}
                        />
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                            <Clock className="w-5 h-5 animate-spin mr-2" />
                            Loading performance data...
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
