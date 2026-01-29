'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Eye, Copy } from 'lucide-react';
import type { RoleContextType, PresetPromptTemplate } from '@/types/ground-truth';
import type { InboxThreadType, InboxAgentPersona } from '@/types/inbox';
import {
    getPresetPrompts,
    getTenantOverrides,
    getMergedGroundTruth,
    addTenantPresetOverride,
    disableTenantPreset,
    enableTenantPreset,
    deleteTenantPresetOverride,
} from '@/server/actions/role-ground-truth';
import { extractTemplateVariables, substitutePromptVariables } from '@/types/ground-truth';

interface TenantOverridesPanelProps {
    role: RoleContextType;
    tenantId: string;
    tenantName: string;
}

interface PresetFormData {
    id: string;
    label: string;
    description: string;
    threadType: InboxThreadType;
    defaultAgent: InboxAgentPersona;
    promptTemplate: string;
    category: string;
    icon?: string;
    estimatedTime?: string;
}

const THREAD_TYPES: InboxThreadType[] = [
    'general',
    'carousel',
    'bundle',
    'creative',
    'campaign',
    'qr_code',
    'retail_partner',
    'launch',
    'performance',
    'outreach',
    'inventory_promo',
    'event',
];

const AGENT_PERSONAS: InboxAgentPersona[] = [
    'craig',
    'smokey',
    'pops',
    'ezal',
    'deebo',
];

export function TenantOverridesPanel({ role, tenantId, tenantName }: TenantOverridesPanelProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [globalPresets, setGlobalPresets] = useState<PresetPromptTemplate[]>([]);
    const [customPresets, setCustomPresets] = useState<PresetPromptTemplate[]>([]);
    const [disabledPresetIds, setDisabledPresetIds] = useState<string[]>([]);
    const [mergedPresets, setMergedPresets] = useState<PresetPromptTemplate[]>([]);

    // Add/Edit Dialog State
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingPreset, setEditingPreset] = useState<PresetFormData | null>(null);
    const [formData, setFormData] = useState<PresetFormData>({
        id: '',
        label: '',
        description: '',
        threadType: 'general' as InboxThreadType,
        defaultAgent: 'craig' as InboxAgentPersona,
        promptTemplate: '',
        category: '',
        icon: '',
        estimatedTime: '',
    });

    // Preview Dialog State
    const [showPreviewDialog, setShowPreviewDialog] = useState(false);
    const [previewPreset, setPreviewPreset] = useState<PresetPromptTemplate | null>(null);
    const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});

    // Load data
    useEffect(() => {
        loadData();
    }, [role, tenantId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load global presets
            const globalResult = await getPresetPrompts(role);
            if (globalResult.success && globalResult.data) {
                setGlobalPresets(globalResult.data);
            }

            // Load tenant overrides
            const overridesResult = await getTenantOverrides(tenantId, role);
            if (overridesResult.success && overridesResult.data) {
                setCustomPresets(overridesResult.data.preset_prompts);
                setDisabledPresetIds(overridesResult.data.disabled_presets);
            } else {
                setCustomPresets([]);
                setDisabledPresetIds([]);
            }

            // Load merged view
            const mergedResult = await getMergedGroundTruth(role, tenantId);
            if (mergedResult.success && mergedResult.data) {
                setMergedPresets(mergedResult.data.preset_prompts);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to load tenant overrides',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleGlobalPreset = async (presetId: string, currentlyDisabled: boolean) => {
        try {
            const result = currentlyDisabled
                ? await enableTenantPreset(tenantId, role, presetId)
                : await disableTenantPreset(tenantId, role, presetId);

            if (result.success) {
                toast({
                    title: 'Success',
                    description: currentlyDisabled
                        ? 'Preset enabled for this tenant'
                        : 'Preset disabled for this tenant',
                });
                await loadData();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to toggle preset: ${error}`,
                variant: 'destructive',
            });
        }
    };

    const handleAddCustomPreset = () => {
        setEditingPreset(null);
        setFormData({
            id: '',
            label: '',
            description: '',
            threadType: 'general' as InboxThreadType,
            defaultAgent: 'craig' as InboxAgentPersona,
            promptTemplate: '',
            category: '',
            icon: '',
            estimatedTime: '',
        });
        setShowAddDialog(true);
    };

    const handleEditCustomPreset = (preset: PresetPromptTemplate) => {
        setEditingPreset({
            id: preset.id,
            label: preset.label,
            description: preset.description,
            threadType: preset.threadType,
            defaultAgent: preset.defaultAgent,
            promptTemplate: preset.promptTemplate,
            category: preset.category,
            icon: preset.icon,
            estimatedTime: preset.estimatedTime,
        });
        setFormData({
            id: preset.id,
            label: preset.label,
            description: preset.description,
            threadType: preset.threadType,
            defaultAgent: preset.defaultAgent,
            promptTemplate: preset.promptTemplate,
            category: preset.category,
            icon: preset.icon || '',
            estimatedTime: preset.estimatedTime || '',
        });
        setShowAddDialog(true);
    };

    const handleSaveCustomPreset = async () => {
        if (!formData.label || !formData.promptTemplate) {
            toast({
                title: 'Validation Error',
                description: 'Label and prompt template are required',
                variant: 'destructive',
            });
            return;
        }

        try {
            const variables = extractTemplateVariables(formData.promptTemplate);
            const preset: PresetPromptTemplate = {
                id: formData.id || `custom_${Date.now()}`,
                label: formData.label,
                description: formData.description,
                threadType: formData.threadType,
                defaultAgent: formData.defaultAgent,
                promptTemplate: formData.promptTemplate,
                variables,
                category: formData.category,
                icon: formData.icon || undefined,
                estimatedTime: formData.estimatedTime || undefined,
                roles: [role],
                version: '2.0',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const result = await addTenantPresetOverride(tenantId, role, preset);

            if (result.success) {
                toast({
                    title: 'Success',
                    description: editingPreset
                        ? 'Custom preset updated'
                        : 'Custom preset added',
                });
                setShowAddDialog(false);
                await loadData();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to save custom preset: ${error}`,
                variant: 'destructive',
            });
        }
    };

    const handleDeleteCustomPreset = async (presetId: string) => {
        if (!confirm('Are you sure you want to delete this custom preset?')) {
            return;
        }

        try {
            const result = await deleteTenantPresetOverride(tenantId, role, presetId);

            if (result.success) {
                toast({
                    title: 'Success',
                    description: 'Custom preset deleted',
                });
                await loadData();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to delete custom preset: ${error}`,
                variant: 'destructive',
            });
        }
    };

    const handlePreview = (preset: PresetPromptTemplate) => {
        setPreviewPreset(preset);
        const variables = extractTemplateVariables(preset.promptTemplate);
        const initialVars: Record<string, string> = {};
        variables.forEach(v => {
            initialVars[v] = `[${v}]`;
        });
        setPreviewVariables(initialVars);
        setShowPreviewDialog(true);
    };

    const handleDuplicate = (preset: PresetPromptTemplate) => {
        setEditingPreset(null);
        setFormData({
            id: '',
            label: `${preset.label} (Copy)`,
            description: preset.description,
            threadType: preset.threadType,
            defaultAgent: preset.defaultAgent,
            promptTemplate: preset.promptTemplate,
            category: preset.category,
            icon: preset.icon || '',
            estimatedTime: preset.estimatedTime || '',
        });
        setShowAddDialog(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-muted-foreground">Loading tenant overrides...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Tenant Overrides: {tenantName}</h3>
                    <p className="text-sm text-muted-foreground">
                        Customize preset prompts for this tenant by toggling global presets or adding custom ones
                    </p>
                </div>
                <Button onClick={handleAddCustomPreset}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Custom Preset
                </Button>
            </div>

            {/* Merged Preview */}
            <Card>
                <CardHeader>
                    <CardTitle>Active Presets (Merged View)</CardTitle>
                    <CardDescription>
                        This is what users from this tenant will see (global + custom - disabled)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {mergedPresets.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No preset prompts available for this role
                            </p>
                        ) : (
                            mergedPresets.map(preset => (
                                <div
                                    key={preset.id}
                                    className="flex items-center justify-between rounded-lg border p-3"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{preset.label}</span>
                                            {customPresets.some(p => p.id === preset.id) && (
                                                <Badge variant="secondary">Custom</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {preset.description}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handlePreview(preset)}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Global Presets Toggle */}
            <Card>
                <CardHeader>
                    <CardTitle>Global Presets</CardTitle>
                    <CardDescription>
                        Toggle global presets on/off for this tenant
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {globalPresets.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No global presets configured for this role
                            </p>
                        ) : (
                            globalPresets.map(preset => {
                                const isDisabled = disabledPresetIds.includes(preset.id);
                                return (
                                    <div
                                        key={preset.id}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`font-medium ${
                                                        isDisabled ? 'text-muted-foreground line-through' : ''
                                                    }`}
                                                >
                                                    {preset.label}
                                                </span>
                                                {isDisabled && (
                                                    <Badge variant="outline">Disabled</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {preset.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handlePreview(preset)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Switch
                                                checked={!isDisabled}
                                                onCheckedChange={() =>
                                                    handleToggleGlobalPreset(preset.id, isDisabled)
                                                }
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Custom Presets */}
            <Card>
                <CardHeader>
                    <CardTitle>Custom Presets</CardTitle>
                    <CardDescription>
                        Tenant-specific preset prompts (only visible to this tenant)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {customPresets.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No custom presets added for this tenant
                            </p>
                        ) : (
                            customPresets.map(preset => (
                                <div
                                    key={preset.id}
                                    className="flex items-center justify-between rounded-lg border p-3"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{preset.label}</span>
                                            <Badge variant="secondary">Custom</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {preset.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handlePreview(preset)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDuplicate(preset)}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditCustomPreset(preset)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteCustomPreset(preset.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingPreset ? 'Edit Custom Preset' : 'Add Custom Preset'}
                        </DialogTitle>
                        <DialogDescription>
                            Create a tenant-specific preset prompt (only visible to {tenantName})
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="label">Label *</Label>
                                <Input
                                    id="label"
                                    placeholder="e.g., Create Product Launch"
                                    value={formData.label}
                                    onChange={e =>
                                        setFormData({ ...formData, label: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Input
                                    id="category"
                                    placeholder="e.g., Marketing"
                                    value={formData.category}
                                    onChange={e =>
                                        setFormData({ ...formData, category: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Brief description of what this preset does"
                                value={formData.description}
                                onChange={e =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="defaultAgent">Default Agent</Label>
                                <Select
                                    value={formData.defaultAgent}
                                    onValueChange={value =>
                                        setFormData({
                                            ...formData,
                                            defaultAgent: value as InboxAgentPersona,
                                        })
                                    }
                                >
                                    <SelectTrigger id="defaultAgent">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AGENT_PERSONAS.map(agent => (
                                            <SelectItem key={agent} value={agent}>
                                                {agent}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="threadType">Thread Type</Label>
                                <Select
                                    value={formData.threadType}
                                    onValueChange={value =>
                                        setFormData({
                                            ...formData,
                                            threadType: value as InboxThreadType,
                                        })
                                    }
                                >
                                    <SelectTrigger id="threadType">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {THREAD_TYPES.map(type => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="estimatedTime">Est. Time</Label>
                                <Input
                                    id="estimatedTime"
                                    placeholder="e.g., 5 min"
                                    value={formData.estimatedTime}
                                    onChange={e =>
                                        setFormData({ ...formData, estimatedTime: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="promptTemplate">Prompt Template *</Label>
                            <Textarea
                                id="promptTemplate"
                                placeholder="Use {{variable_name}} for variables. Example: Create a product launch campaign for {{product_name}} targeting {{audience}}"
                                value={formData.promptTemplate}
                                onChange={e =>
                                    setFormData({ ...formData, promptTemplate: e.target.value })
                                }
                                rows={6}
                                className="font-mono text-sm"
                            />
                            {formData.promptTemplate && (
                                <div className="text-sm text-muted-foreground">
                                    Variables detected:{' '}
                                    {extractTemplateVariables(formData.promptTemplate).join(', ') ||
                                        'None'}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="icon">Icon (optional)</Label>
                            <Input
                                id="icon"
                                placeholder="lucide icon name (e.g., Rocket)"
                                value={formData.icon}
                                onChange={e => setFormData({ ...formData, icon: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveCustomPreset}>
                            {editingPreset ? 'Update' : 'Add'} Preset
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Preview: {previewPreset?.label}</DialogTitle>
                        <DialogDescription>{previewPreset?.description}</DialogDescription>
                    </DialogHeader>

                    {previewPreset && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-medium">Agent:</span>{' '}
                                    {previewPreset.defaultAgent}
                                </div>
                                <div>
                                    <span className="font-medium">Thread Type:</span>{' '}
                                    {previewPreset.threadType}
                                </div>
                                <div>
                                    <span className="font-medium">Category:</span>{' '}
                                    {previewPreset.category}
                                </div>
                                {previewPreset.estimatedTime && (
                                    <div>
                                        <span className="font-medium">Est. Time:</span>{' '}
                                        {previewPreset.estimatedTime}
                                    </div>
                                )}
                            </div>

                            {previewPreset.variables && previewPreset.variables.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Variables</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {previewPreset.variables.map(variable => (
                                            <div key={variable} className="space-y-1">
                                                <Label className="text-xs">{variable}</Label>
                                                <Input
                                                    size={1}
                                                    placeholder={`Enter ${variable}`}
                                                    value={previewVariables[variable] || ''}
                                                    onChange={e =>
                                                        setPreviewVariables({
                                                            ...previewVariables,
                                                            [variable]: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Rendered Prompt</Label>
                                <div className="rounded-lg border bg-muted p-4">
                                    <pre className="whitespace-pre-wrap text-sm">
                                        {substitutePromptVariables(
                                            previewPreset.promptTemplate,
                                            previewVariables
                                        )}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
