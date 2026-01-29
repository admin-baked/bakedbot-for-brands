'use client';

/**
 * Preset Prompts Manager Component
 *
 * Manages preset prompt templates for role-based ground truth.
 * Features:
 * - List preset prompts with category filtering
 * - Add/Edit/Delete preset prompts
 * - Variable editor with Mustache-style variables {{variable}}
 * - Preview with variable substitution
 */

import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
    Loader2,
    Plus,
    Pencil,
    Trash2,
    Copy,
    Eye,
    Wand2,
    AlertCircle,
} from 'lucide-react';

import {
    getPresetPrompts,
    upsertPresetPrompt,
    deletePresetPrompt,
} from '@/server/actions/role-ground-truth';

import type { RoleContextType, PresetPromptTemplate } from '@/types/ground-truth';
import { extractTemplateVariables, substitutePromptVariables } from '@/types/ground-truth';
import type { InboxThreadType, InboxAgentPersona } from '@/types/inbox';

// ============================================================================
// Types
// ============================================================================

interface PresetPromptsManagerProps {
    role: RoleContextType;
    tenantId?: string;
}

interface PresetFormData {
    id: string;
    label: string;
    description: string;
    threadType: InboxThreadType;
    defaultAgent: InboxAgentPersona;
    promptTemplate: string;
    category: string;
    roles: string[];
    icon?: string;
    estimatedTime?: string;
    version: string;
}

// ============================================================================
// Component
// ============================================================================

export function PresetPromptsManager({ role, tenantId }: PresetPromptsManagerProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [presets, setPresets] = useState<PresetPromptTemplate[]>([]);
    const [filteredPresets, setFilteredPresets] = useState<PresetPromptTemplate[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Dialog states
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showPreviewDialog, setShowPreviewDialog] = useState(false);
    const [editingPreset, setEditingPreset] = useState<PresetPromptTemplate | null>(null);
    const [previewPreset, setPreviewPreset] = useState<PresetPromptTemplate | null>(null);
    const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});

    // Form state
    const [formData, setFormData] = useState<PresetFormData>({
        id: '',
        label: '',
        description: '',
        threadType: 'general',
        defaultAgent: 'craig',
        promptTemplate: '',
        category: 'marketing',
        roles: ['brand'],
        icon: 'MessageSquare',
        estimatedTime: '',
        version: '1.0',
    });

    // Load presets on mount
    useEffect(() => {
        loadPresets();
    }, [role, tenantId]);

    // Filter presets when category or search changes
    useEffect(() => {
        filterPresets();
    }, [presets, selectedCategory, searchQuery]);

    const loadPresets = async () => {
        setIsLoading(true);
        const result = await getPresetPrompts(role, tenantId);
        if (result.success && result.data) {
            setPresets(result.data);
        } else {
            toast({
                title: 'Error loading presets',
                description: result.message,
                variant: 'destructive',
            });
        }
        setIsLoading(false);
    };

    const filterPresets = () => {
        let filtered = presets;

        // Filter by category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                p =>
                    p.label.toLowerCase().includes(query) ||
                    p.description.toLowerCase().includes(query) ||
                    p.promptTemplate.toLowerCase().includes(query)
            );
        }

        setFilteredPresets(filtered);
    };

    const getCategories = () => {
        const categories = Array.from(new Set(presets.map(p => p.category)));
        return categories.sort();
    };

    const handleAdd = () => {
        setFormData({
            id: '',
            label: '',
            description: '',
            threadType: 'general',
            defaultAgent: 'craig',
            promptTemplate: '',
            category: 'marketing',
            roles: [role],
            icon: 'MessageSquare',
            estimatedTime: '',
            version: '1.0',
        });
        setShowAddDialog(true);
    };

    const handleEdit = (preset: PresetPromptTemplate) => {
        setEditingPreset(preset);
        setFormData({
            id: preset.id,
            label: preset.label,
            description: preset.description,
            threadType: preset.threadType,
            defaultAgent: preset.defaultAgent,
            promptTemplate: preset.promptTemplate,
            category: preset.category,
            roles: preset.roles,
            icon: preset.icon,
            estimatedTime: preset.estimatedTime,
            version: preset.version,
        });
        setShowEditDialog(true);
    };

    const handlePreview = (preset: PresetPromptTemplate) => {
        setPreviewPreset(preset);

        // Extract variables and create default values
        const variables = extractTemplateVariables(preset.promptTemplate);
        const defaultVars: Record<string, string> = {};
        variables.forEach(v => {
            defaultVars[v] = `[${v}]`;
        });
        setPreviewVariables(defaultVars);

        setShowPreviewDialog(true);
    };

    const handleSave = async () => {
        // Validate
        if (!formData.label || !formData.promptTemplate) {
            toast({
                title: 'Validation error',
                description: 'Label and prompt template are required',
                variant: 'destructive',
            });
            return;
        }

        // Generate ID if adding new
        if (!formData.id) {
            formData.id = `${role}-${formData.category}-${formData.label
                .toLowerCase()
                .replace(/\s+/g, '-')}`;
        }

        // Extract variables from template
        const variables = extractTemplateVariables(formData.promptTemplate);

        const preset: PresetPromptTemplate = {
            ...formData,
            variables: variables.length > 0 ? variables : undefined,
        };

        const result = await upsertPresetPrompt(role, preset);

        if (result.success) {
            toast({ title: editingPreset ? 'Preset updated' : 'Preset created' });
            setShowAddDialog(false);
            setShowEditDialog(false);
            setEditingPreset(null);
            loadPresets();
        } else {
            toast({
                title: 'Error',
                description: result.message,
                variant: 'destructive',
            });
        }
    };

    const handleDelete = async (presetId: string) => {
        const result = await deletePresetPrompt(role, presetId);

        if (result.success) {
            toast({ title: 'Preset deleted' });
            loadPresets();
        } else {
            toast({
                title: 'Error',
                description: result.message,
                variant: 'destructive',
            });
        }
    };

    const handleDuplicate = (preset: PresetPromptTemplate) => {
        setFormData({
            ...preset,
            id: '', // Will generate new ID
            label: `${preset.label} (Copy)`,
        });
        setShowAddDialog(true);
    };

    const getPreviewText = () => {
        if (!previewPreset) return '';
        return substitutePromptVariables(previewPreset.promptTemplate, previewVariables);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Preset Prompts</h3>
                    <p className="text-sm text-muted-foreground">
                        Quick action templates with variable substitution
                    </p>
                </div>
                <Button onClick={handleAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Preset
                </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search presets..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {getCategories().map(cat => (
                            <SelectItem key={cat} value={cat}>
                                {cat}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{presets.length}</div>
                        <p className="text-xs text-muted-foreground">Total Presets</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{getCategories().length}</div>
                        <p className="text-xs text-muted-foreground">Categories</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{filteredPresets.length}</div>
                        <p className="text-xs text-muted-foreground">Showing</p>
                    </CardContent>
                </Card>
            </div>

            {/* Preset List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            ) : filteredPresets.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        {presets.length === 0
                            ? 'No preset prompts yet. Add your first one!'
                            : 'No presets match your filters.'}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredPresets.map(preset => (
                        <Card key={preset.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base">{preset.label}</CardTitle>
                                        <CardDescription>{preset.description}</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handlePreview(preset)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDuplicate(preset)}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(preset)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Preset?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete "{preset.label}".
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(preset.id)}
                                                        className="bg-destructive text-destructive-foreground"
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="secondary">{preset.category}</Badge>
                                        <Badge variant="outline">{preset.defaultAgent}</Badge>
                                        {preset.variables && preset.variables.length > 0 && (
                                            <Badge variant="outline" className="gap-1">
                                                <Wand2 className="h-3 w-3" />
                                                {preset.variables.length} variable
                                                {preset.variables.length !== 1 ? 's' : ''}
                                            </Badge>
                                        )}
                                        {preset.estimatedTime && (
                                            <Badge variant="outline">{preset.estimatedTime}</Badge>
                                        )}
                                    </div>
                                    <div className="text-sm font-mono bg-muted p-2 rounded">
                                        {preset.promptTemplate.substring(0, 150)}
                                        {preset.promptTemplate.length > 150 && '...'}
                                    </div>
                                    {preset.variables && preset.variables.length > 0 && (
                                        <div className="text-xs text-muted-foreground">
                                            Variables: {preset.variables.map(v => `{{${v}}}`).join(', ')}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={showAddDialog || showEditDialog} onOpenChange={open => {
                setShowAddDialog(open);
                setShowEditDialog(open);
                if (!open) setEditingPreset(null);
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingPreset ? 'Edit Preset Prompt' : 'Add Preset Prompt'}
                        </DialogTitle>
                        <DialogDescription>
                            Create a quick action template with Mustache-style variables {`{{variable_name}}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Label *</Label>
                                <Input
                                    value={formData.label}
                                    onChange={e => setFormData({ ...formData, label: e.target.value })}
                                    placeholder="Product Launch"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Category *</Label>
                                <Input
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="marketing"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Description *</Label>
                            <Input
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Launch a new product with coordinated marketing"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Prompt Template *</Label>
                            <Textarea
                                value={formData.promptTemplate}
                                onChange={e => setFormData({ ...formData, promptTemplate: e.target.value })}
                                placeholder="Create a product launch campaign for {{product_name}} targeting {{target_audience}} with a budget of {{budget}}"
                                rows={4}
                                className="font-mono text-sm"
                            />
                            {formData.promptTemplate && (
                                <p className="text-xs text-muted-foreground">
                                    Variables detected: {extractTemplateVariables(formData.promptTemplate).map(v => `{{${v}}}`).join(', ') || 'None'}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Default Agent</Label>
                                <Select
                                    value={formData.defaultAgent}
                                    onValueChange={value => setFormData({ ...formData, defaultAgent: value as InboxAgentPersona })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="craig">Craig (Marketer)</SelectItem>
                                        <SelectItem value="smokey">Smokey (Budtender)</SelectItem>
                                        <SelectItem value="pops">Pops (Analyst)</SelectItem>
                                        <SelectItem value="ezal">Ezal (Research)</SelectItem>
                                        <SelectItem value="deebo">Deebo (Compliance)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Thread Type</Label>
                                <Input
                                    value={formData.threadType}
                                    onChange={e => setFormData({ ...formData, threadType: e.target.value as InboxThreadType })}
                                    placeholder="general"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Icon (Lucide name)</Label>
                                <Input
                                    value={formData.icon}
                                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                                    placeholder="MessageSquare"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Estimated Time</Label>
                                <Input
                                    value={formData.estimatedTime}
                                    onChange={e => setFormData({ ...formData, estimatedTime: e.target.value })}
                                    placeholder="5-10 min"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowAddDialog(false);
                            setShowEditDialog(false);
                            setEditingPreset(null);
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            {editingPreset ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Preview: {previewPreset?.label}</DialogTitle>
                        <DialogDescription>
                            Test variable substitution
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {previewPreset?.variables && previewPreset.variables.length > 0 && (
                            <div className="space-y-2">
                                <Label>Variables:</Label>
                                {previewPreset.variables.map(variable => (
                                    <div key={variable} className="flex items-center gap-2">
                                        <Label className="w-32 text-sm font-mono">{`{{${variable}}}`}</Label>
                                        <Input
                                            value={previewVariables[variable] || ''}
                                            onChange={e =>
                                                setPreviewVariables({
                                                    ...previewVariables,
                                                    [variable]: e.target.value,
                                                })
                                            }
                                            placeholder={`Enter ${variable}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Result:</Label>
                            <div className="p-4 bg-muted rounded-lg font-mono text-sm whitespace-pre-wrap">
                                {getPreviewText()}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
