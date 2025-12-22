'use client';

/**
 * Quick Start Cards Component
 * Role-specific high-leverage actions for new users
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Menu,
    Bot,
    Link as LinkIcon,
    BarChart,
    Shield,
    Globe,
    Map,
    Target,
    Bell,
    Mail,
    Clock
} from 'lucide-react';
import { QUICK_START_CARDS } from '@/lib/config/quick-start-cards';
import type { UserRole } from '@/types/agent-workspace';
import { useUserRole } from '@/hooks/use-user-role';

const ICON_MAP: Record<string, React.ReactNode> = {
    menu: <Menu className="h-5 w-5" />,
    bot: <Bot className="h-5 w-5" />,
    link: <LinkIcon className="h-5 w-5" />,
    chart: <BarChart className="h-5 w-5" />,
    shield: <Shield className="h-5 w-5" />,
    globe: <Globe className="h-5 w-5" />,
    map: <Map className="h-5 w-5" />,
    target: <Target className="h-5 w-5" />,
    notification: <Bell className="h-5 w-5" />,
    mail: <Mail className="h-5 w-5" />
};

interface QuickStartCardsProps {
    onCardClick?: (prompt: string, playbookId?: string) => void;
}

export function QuickStartCards({ onCardClick }: QuickStartCardsProps) {
    const { role } = useUserRole();

    if (!role || role === 'owner') {
        return null; // Owner doesn't see quick start cards
    }

    const roleCards = QUICK_START_CARDS.filter(card =>
        card.roles.includes(role as 'brand' | 'dispensary')
    );

    const handleCardClick = (prompt: string, playbookId?: string) => {
        if (onCardClick) {
            onCardClick(prompt, playbookId);
        } else {
            // Default behavior: log for now
            console.log('Quick Start clicked:', { prompt, playbookId });
            // TODO: Implement default behavior (scroll to chat + insert prompt)
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Quick Start</h2>
                <Badge variant="secondary" className="text-xs">
                    Get live in 30 min
                </Badge>
            </div>

            <div className="grid gap-3">
                {roleCards.map((card) => (
                    <Card
                        key={card.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => handleCardClick(card.prompt || '', card.playbookId)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    {ICON_MAP[card.icon] || <Globe className="h-5 w-5" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm mb-1">{card.title}</h3>
                                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                        {card.description}
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {card.estimatedTime}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Button
                variant="ghost"
                className="w-full text-xs"
                onClick={() => {
                    // TODO: Navigate to playbooks page
                }}
            >
                View All Playbooks →
            </Button>
        </div>
    );
}
