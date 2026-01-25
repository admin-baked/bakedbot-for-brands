'use client';

/**
 * Activity Log
 *
 * Shows recent activity from agents and users in the Creative Center.
 * Displays timestamps, agent avatars, and action descriptions.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
    MoreHorizontal,
    Sparkles,
    CheckCircle2,
    AlertTriangle,
    Edit3,
    Clock,
    ImageIcon,
    MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type ActivityType =
    | 'generate'
    | 'approve'
    | 'revise'
    | 'compliance_check'
    | 'schedule'
    | 'edit'
    | 'comment';

interface ActivityItem {
    id: string;
    type: ActivityType;
    agent: {
        name: string;
        avatar?: string;
        initials: string;
    };
    description: string;
    timestamp: Date;
    metadata?: {
        platform?: string;
        contentId?: string;
        status?: string;
    };
}

interface ActivityLogProps {
    activities?: ActivityItem[];
    className?: string;
    maxHeight?: string;
}

const ACTIVITY_ICONS: Record<ActivityType, typeof Sparkles> = {
    generate: Sparkles,
    approve: CheckCircle2,
    revise: Edit3,
    compliance_check: AlertTriangle,
    schedule: Clock,
    edit: Edit3,
    comment: MessageSquare,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
    generate: 'text-purple-400',
    approve: 'text-green-400',
    revise: 'text-blue-400',
    compliance_check: 'text-amber-400',
    schedule: 'text-cyan-400',
    edit: 'text-orange-400',
    comment: 'text-slate-400',
};

// Demo activities for when no real data
const DEMO_ACTIVITIES: ActivityItem[] = [
    {
        id: '1',
        type: 'generate',
        agent: { name: 'Craig', initials: 'C' },
        description: 'Generated Instagram post for 4/20 promotion',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        metadata: { platform: 'instagram' },
    },
    {
        id: '2',
        type: 'compliance_check',
        agent: { name: 'Deebo', initials: 'D' },
        description: 'Scanned content - 2 issues found',
        timestamp: new Date(Date.now() - 4 * 60 * 1000),
    },
    {
        id: '3',
        type: 'revise',
        agent: { name: 'Craig', initials: 'C' },
        description: 'Applied compliance fixes to caption',
        timestamp: new Date(Date.now() - 3 * 60 * 1000),
    },
    {
        id: '4',
        type: 'compliance_check',
        agent: { name: 'Deebo', initials: 'D' },
        description: 'Re-scanned content - All clear',
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
    },
    {
        id: '5',
        type: 'generate',
        agent: { name: 'Nano Banana', initials: 'NB' },
        description: 'Generated hero image (4K)',
        timestamp: new Date(Date.now() - 90 * 1000),
        metadata: { platform: 'instagram' },
    },
    {
        id: '6',
        type: 'approve',
        agent: { name: 'You', initials: 'Y' },
        description: 'Approved content for scheduling',
        timestamp: new Date(Date.now() - 60 * 1000),
    },
];

export function ActivityLog({
    activities = DEMO_ACTIVITIES,
    className,
    maxHeight = '320px',
}: ActivityLogProps) {
    return (
        <Card className={cn('glass-card glass-card-hover', className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Activity Log</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
            </CardHeader>
            <CardContent>
                <ScrollArea style={{ height: maxHeight }}>
                    <div className="space-y-4 pr-4">
                        {activities.map((activity) => {
                            const Icon = ACTIVITY_ICONS[activity.type];
                            const iconColor = ACTIVITY_COLORS[activity.type];

                            return (
                                <div
                                    key={activity.id}
                                    className="flex items-start gap-3 group"
                                >
                                    {/* Agent Avatar */}
                                    <div className="relative">
                                        <Avatar className="h-8 w-8">
                                            {activity.agent.avatar && (
                                                <AvatarImage src={activity.agent.avatar} />
                                            )}
                                            <AvatarFallback className="text-xs bg-secondary">
                                                {activity.agent.initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        {/* Activity Icon Badge */}
                                        <div
                                            className={cn(
                                                'absolute -bottom-1 -right-1 p-0.5 rounded-full bg-background border border-border',
                                                iconColor
                                            )}
                                        >
                                            <Icon className="h-2.5 w-2.5" />
                                        </div>
                                    </div>

                                    {/* Activity Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-foreground">
                                                {activity.agent.name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(activity.timestamp, {
                                                    addSuffix: true,
                                                })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                            {activity.description}
                                        </p>
                                        {activity.metadata?.platform && (
                                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                                                <ImageIcon className="h-2.5 w-2.5" />
                                                {activity.metadata.platform}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>

                {/* View All Link */}
                <div className="pt-3 mt-3 border-t border-border/30">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground hover:text-foreground"
                    >
                        View Full Activity History
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default ActivityLog;
