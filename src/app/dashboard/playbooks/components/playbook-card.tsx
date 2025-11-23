
// src/app/dashboard/playbooks/components/playbook-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export interface Playbook {
    id: string;
    title: string;
    type: 'signal' | 'automation';
    tags: string[];
    enabled: boolean;
}

interface PlaybookCardProps {
    playbook: Playbook;
}

const tagColors = [
    'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
]

export function PlaybookCard({ playbook }: PlaybookCardProps) {
    const [isEnabled, setIsEnabled] = useState(playbook.enabled);

    return (
        <Card className="flex flex-col justify-between">
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                     <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                            <span>{playbook.type}</span>
                             <DropdownMenu>
                                <DropdownMenuTrigger className="outline-none">
                                    <ChevronDown className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem>Edit</DropdownMenuItem>
                                    <DropdownMenuItem>Duplicate</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <CardTitle className="text-lg mt-1">{playbook.title}</CardTitle>
                    </div>
                    <Switch
                        checked={isEnabled}
                        onCheckedChange={setIsEnabled}
                        aria-label={`Toggle ${playbook.title}`}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2">
                    {playbook.tags.map((tag, index) => (
                        <Badge key={tag} variant="outline" className={`border-transparent ${tagColors[index % tagColors.length]}`}>
                            {tag}
                        </Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
