'use client';

/**
 * Project Card Component
 *
 * Enhanced card with glassmorphism styling, intelligence level badges,
 * and dropdown actions menu.
 */

import { Project } from '@/types/project';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    MoreVertical,
    Edit3,
    Copy,
    Archive,
    MessageSquare,
    FileText,
    Zap,
    Sparkles,
    Brain,
    Crown,
    Shield,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { getIntelligenceLevel, LEVEL_CONFIG, type IntelligenceLevel } from '@/lib/intelligence-levels';
import { cn } from '@/lib/utils';

// Icon mapping for intelligence levels
const LEVEL_ICONS: Record<IntelligenceLevel, React.ComponentType<{ className?: string }>> = {
    Standard: Zap,
    Advanced: Sparkles,
    Expert: Brain,
    Genius: Crown,
};

interface ProjectCardProps {
    project: Project;
    isOwner: boolean;
    onEdit?: (project: Project) => void;
    onDuplicate?: (project: Project) => void;
    onArchive?: (project: Project) => void;
}

export function ProjectCard({
    project,
    isOwner,
    onEdit,
    onDuplicate,
    onArchive,
}: ProjectCardProps) {
    const level = getIntelligenceLevel(project.defaultModel);
    const levelConfig = LEVEL_CONFIG[level];
    const LevelIcon = LEVEL_ICONS[level];

    return (
        <Link href={`/dashboard/projects/${project.id}`}>
            <Card
                className={cn(
                    'glass-card glass-card-hover group relative overflow-hidden cursor-pointer h-full',
                    'rounded-xl'
                )}
            >
                {/* Left Accent Bar */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                    style={{ backgroundColor: project.color || '#10b981' }}
                />

                <CardContent className="p-4 pl-5">
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                                {project.name}
                            </h3>
                        </div>

                        {/* Dropdown Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -m-1 rounded hover:bg-muted"
                                onClick={(e) => e.preventDefault()}
                            >
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onEdit?.(project);
                                    }}
                                >
                                    <Edit3 className="h-4 w-4 mr-2" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onDuplicate?.(project);
                                    }}
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onArchive?.(project);
                                    }}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">
                        {project.systemInstructions?.slice(0, 100) ||
                            project.description ||
                            'No description'}
                    </p>

                    {/* Badges Row */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {/* Intelligence Level Badge */}
                        <Badge
                            variant="outline"
                            className={cn(
                                levelConfig.bgColor,
                                levelConfig.color,
                                'border-transparent text-xs gap-1'
                            )}
                        >
                            <LevelIcon className="h-3 w-3" />
                            {level}
                        </Badge>

                        {/* Role Badge */}
                        {isOwner && (
                            <Badge
                                variant="outline"
                                className="bg-primary/10 text-primary border-transparent text-xs gap-1"
                            >
                                <Shield className="h-3 w-3" />
                                Admin
                            </Badge>
                        )}
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {project.chatCount} chats
                        </span>
                        <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {project.documentCount} files
                        </span>
                    </div>

                    {/* Last Updated */}
                    <p className="text-xs text-muted-foreground mt-2">
                        Updated {formatDistanceToNow(project.updatedAt, { addSuffix: true })}
                    </p>
                </CardContent>
            </Card>
        </Link>
    );
}

export default ProjectCard;
