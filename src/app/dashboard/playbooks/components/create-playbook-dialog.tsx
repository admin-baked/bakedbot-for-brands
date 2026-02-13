'use client';

/**
 * Create Playbook Dialog
 * Two modes: From Template or From Scratch
 */

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, FileText, Sparkles, Wand2, Copy } from 'lucide-react';
import { Playbook, PlaybookCategory } from '@/types/playbook';

const TEMPLATES = [
    {
        id: 'daily_intel',
        name: 'Daily Intelligence Snapshot',
        description: 'Morning report on market activity, competitor moves, and key metrics',
        agent: 'ezal',
        category: 'intel' as PlaybookCategory,
    },
    {
        id: 'lead_followup',
        name: 'Lead Follow-up',
        description: 'Automated follow-up email sequence for new leads',
        agent: 'craig',
        category: 'marketing' as PlaybookCategory,
    },
    {
        id: 'weekly_kpi',
        name: 'Weekly KPI Report',
        description: 'Executive summary of key performance indicators',
        agent: 'pops',
        category: 'reporting' as PlaybookCategory,
    },
    {
        id: 'low_stock_alert',
        name: 'Low Stock Alert',
        description: 'Monitor inventory and alert when items are running low',
        agent: 'smokey',
        category: 'ops' as PlaybookCategory,
    },
];

const AGENTS = [
    { id: 'smokey', name: 'Smokey', description: 'Budtender' },
    { id: 'craig', name: 'Craig', description: 'Marketing' },
    { id: 'pops', name: 'Pops', description: 'Analytics' },
    { id: 'ezal', name: 'Ezal', description: 'Intel' },
    { id: 'money_mike', name: 'Money Mike', description: 'Finance' },
    { id: 'deebo', name: 'Deebo', description: 'Compliance' },
];

interface CreatePlaybookDialogProps {
    onCreateFromScratch: (data: { name: string; description: string; agent: string; category: PlaybookCategory }) => void;
    onCloneTemplate: (templateId: string) => void;
    onCreateFromNaturalLanguage?: (prompt: string) => Promise<void>;
    existingPlaybooks?: Playbook[];
    trigger?: React.ReactElement;
}

export function CreatePlaybookDialog({
    onCreateFromScratch,
    onCloneTemplate,
    onCreateFromNaturalLanguage,
    existingPlaybooks = [],
    trigger,
}: CreatePlaybookDialogProps) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<'scratch' | 'template' | 'ai'>('scratch');

    // Scratch form
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [agent, setAgent] = useState('craig');
    const [category, setCategory] = useState<PlaybookCategory>('custom');

    // AI prompt
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleCreateFromScratch = () => {
        if (!name.trim()) return;
        onCreateFromScratch({ name, description, agent, category });
        setOpen(false);
        resetForm();
    };

    const handleCloneTemplate = (templateId: string) => {
        onCloneTemplate(templateId);
        setOpen(false);
    };

    const handleGenerateFromAI = async () => {
        if (!aiPrompt.trim() || !onCreateFromNaturalLanguage) return;
        setIsGenerating(true);
        try {
            await onCreateFromNaturalLanguage(aiPrompt);
            setOpen(false);
            resetForm();
        } finally {
            setIsGenerating(false);
        }
    };

    const resetForm = () => {
        setName('');
        setDescription('');
        setAgent('craig');
        setCategory('custom');
        setAiPrompt('');
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Playbook
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Playbook</DialogTitle>
                    <DialogDescription>
                        Build an automation workflow from scratch, use a template, or describe what you want in plain English.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="scratch" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            From Scratch
                        </TabsTrigger>
                        <TabsTrigger value="template" className="flex items-center gap-2">
                            <Copy className="h-4 w-4" />
                            From Template
                        </TabsTrigger>
                        <TabsTrigger value="ai" className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Describe It
                        </TabsTrigger>
                    </TabsList>

                    {/* From Scratch */}
                    <TabsContent value="scratch" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="scratch-name">Name</Label>
                            <Input
                                id="scratch-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="My Custom Playbook"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="scratch-desc">Description</Label>
                            <Textarea
                                id="scratch-desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What does this playbook do?"
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Agent</Label>
                                <Select value={agent} onValueChange={setAgent}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AGENTS.map(a => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {a.name} - {a.description}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={category} onValueChange={(v) => setCategory(v as PlaybookCategory)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="intel">Intelligence</SelectItem>
                                        <SelectItem value="marketing">Marketing</SelectItem>
                                        <SelectItem value="ops">Operations</SelectItem>
                                        <SelectItem value="seo">SEO</SelectItem>
                                        <SelectItem value="reporting">Reporting</SelectItem>
                                        <SelectItem value="compliance">Compliance</SelectItem>
                                        <SelectItem value="custom">Custom</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button className="w-full" onClick={handleCreateFromScratch} disabled={!name.trim()}>
                            Create Playbook
                        </Button>
                    </TabsContent>

                    {/* From Template */}
                    <TabsContent value="template" className="mt-4">
                        <div className="grid grid-cols-2 gap-3">
                            {TEMPLATES.map(template => (
                                <Card
                                    key={template.id}
                                    className="cursor-pointer hover:border-primary transition-colors"
                                    onClick={() => handleCloneTemplate(template.id)}
                                >
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm">{template.name}</CardTitle>
                                            <Badge variant="outline" className="capitalize text-xs">
                                                {template.category}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription className="text-xs">
                                            {template.description}
                                        </CardDescription>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* AI Generation */}
                    <TabsContent value="ai" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="ai-prompt">Describe your automation</Label>
                            <Textarea
                                id="ai-prompt"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="Example: Every morning, scan competitor prices in Chicago and email me a summary if any prices dropped by more than 10%."
                                rows={4}
                            />
                        </div>

                        <Button
                            className="w-full"
                            onClick={handleGenerateFromAI}
                            disabled={!aiPrompt.trim() || isGenerating || !onCreateFromNaturalLanguage}
                        >
                            <Wand2 className="h-4 w-4 mr-2" />
                            {isGenerating ? 'Generating...' : 'Generate Playbook'}
                        </Button>

                        {!onCreateFromNaturalLanguage && (
                            <p className="text-xs text-muted-foreground text-center">
                                AI generation coming soon. Use the chat to describe your playbook in natural language.
                            </p>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
