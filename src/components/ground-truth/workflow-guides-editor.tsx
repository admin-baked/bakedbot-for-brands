'use client';

/**
 * Workflow Guides Editor Component
 *
 * Manages step-by-step workflow guides for role-based ground truth.
 * Features:
 * - List workflow guides with difficulty/tag filtering
 * - Add/Edit/Delete workflow guides
 * - Drag-and-drop step builder
 * - Agent assignment per step
 * - Preview workflow
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
    Eye,
    GripVertical,
    ChevronUp,
    ChevronDown,
    AlertTriangle,
} from 'lucide-react';

import {
    getWorkflowGuides,
    upsertWorkflowGuide,
} from '@/server/actions/role-ground-truth';

import type { RoleContextType, WorkflowGuide } from '@/types/ground-truth';
import type { InboxAgentPersona } from '@/types/inbox';

// ============================================================================
// Types
// ============================================================================

interface WorkflowGuidesEditorProps {
    role: RoleContextType;
    tenantId?: string;
}

interface WorkflowStep {
    title: string;
    description: string;
    agentId?: InboxAgentPersona;
    toolsUsed?: string[];
    expectedOutput: string;
}

interface WorkflowFormData {
    id: string;
    title: string;
    description: string;
    steps: WorkflowStep[];
    tags: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime?: string;
    prerequisites?: string[];
}

// ============================================================================
// Component
// ============================================================================

export function WorkflowGuidesEditor({ role, tenantId }: WorkflowGuidesEditorProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [workflows, setWorkflows] = useState<WorkflowGuide[]>([]);
    const [filteredWorkflows, setFilteredWorkflows] = useState<WorkflowGuide[]>([]);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Dialog states
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showPreviewDialog, setShowPreviewDialog] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState<WorkflowGuide | null>(null);
    const [previewWorkflow, setPreviewWorkflow] = useState<WorkflowGuide | null>(null);

    // Form state
    const [formData, setFormData] = useState<WorkflowFormData>({
        id: '',
        title: '',
        description: '',
        steps: [],
        tags: [],
        difficulty: 'intermediate',
        estimatedTime: '',
        prerequisites: [],
    });

    // New step form
    const [newStep, setNewStep] = useState<WorkflowStep>({
        title: '',
        description: '',
        agentId: undefined,
        toolsUsed: [],
        expectedOutput: '',
    });

    // Load workflows on mount
    useEffect(() => {
        loadWorkflows();
    }, [role, tenantId]);

    // Filter workflows when difficulty or search changes
    useEffect(() => {
        filterWorkflows();
    }, [workflows, selectedDifficulty, searchQuery]);

    const loadWorkflows = async () => {
        setIsLoading(true);
        const result = await getWorkflowGuides(role, tenantId);
        if (result.success && result.data) {
            setWorkflows(result.data);
        } else {
            toast({
                title: 'Error loading workflows',
                description: result.message,
                variant: 'destructive',
            });
        }
        setIsLoading(false);
    };

    const filterWorkflows = () => {
        let filtered = workflows;

        // Filter by difficulty
        if (selectedDifficulty !== 'all') {
            filtered = filtered.filter(w => w.difficulty === selectedDifficulty);
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                w =>
                    w.title.toLowerCase().includes(query) ||
                    w.description.toLowerCase().includes(query) ||
                    w.tags.some(t => t.toLowerCase().includes(query))
            );
        }

        setFilteredWorkflows(filtered);
    };

    const getDifficultyColor = (difficulty: 'beginner' | 'intermediate' | 'advanced') => {
        const colors = {
            beginner: 'bg-green-100 text-green-700 border-green-200',
            intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            advanced: 'bg-red-100 text-red-700 border-red-200',
        };
        return colors[difficulty];
    };

    const handleAdd = () => {
        setFormData({
            id: '',
            title: '',
            description: '',
            steps: [],
            tags: [],
            difficulty: 'intermediate',
            estimatedTime: '',
            prerequisites: [],
        });
        setShowAddDialog(true);
    };

    const handleEdit = (workflow: WorkflowGuide) => {
        setEditingWorkflow(workflow);
        setFormData({
            id: workflow.id,
            title: workflow.title,
            description: workflow.description,
            steps: [...workflow.steps],
            tags: [...workflow.tags],
            difficulty: workflow.difficulty,
            estimatedTime: workflow.estimatedTime,
            prerequisites: workflow.prerequisites ? [...workflow.prerequisites] : [],
        });
        setShowEditDialog(true);
    };

    const handlePreview = (workflow: WorkflowGuide) => {
        setPreviewWorkflow(workflow);
        setShowPreviewDialog(true);
    };

    const handleAddStep = () => {
        if (!newStep.title || !newStep.description || !newStep.expectedOutput) {
            toast({
                title: 'Validation error',
                description: 'Title, description, and expected output are required for steps',
                variant: 'destructive',
            });
            return;
        }

        setFormData({
            ...formData,
            steps: [...formData.steps, { ...newStep }],
        });

        // Reset new step form
        setNewStep({
            title: '',
            description: '',
            agentId: undefined,
            toolsUsed: [],
            expectedOutput: '',
        });
    };

    const handleMoveStep = (index: number, direction: 'up' | 'down') => {
        const newSteps = [...formData.steps];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newSteps.length) return;

        [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
        setFormData({ ...formData, steps: newSteps });
    };

    const handleDeleteStep = (index: number) => {
        setFormData({
            ...formData,
            steps: formData.steps.filter((_, i) => i !== index),
        });
    };

    const handleSave = async () => {
        // Validate
        if (!formData.title || !formData.description || formData.steps.length === 0) {
            toast({
                title: 'Validation error',
                description: 'Title, description, and at least one step are required',
                variant: 'destructive',
            });
            return;
        }

        // Generate ID if adding new
        if (!formData.id) {
            formData.id = `${role}-workflow-${formData.title
                .toLowerCase()
                .replace(/\s+/g, '-')}`;
        }

        const workflow: WorkflowGuide = {
            ...formData,
        };

        const result = await upsertWorkflowGuide(role, workflow);

        if (result.success) {
            toast({ title: editingWorkflow ? 'Workflow updated' : 'Workflow created' });
            setShowAddDialog(false);
            setShowEditDialog(false);
            setEditingWorkflow(null);
            loadWorkflows();
        } else {
            toast({
                title: 'Error',
                description: result.message,
                variant: 'destructive',
            });
        }
    };

    const handleAddTag = (tag: string) => {
        if (tag && !formData.tags.includes(tag)) {
            setFormData({
                ...formData,
                tags: [...formData.tags, tag],
            });
        }
    };

    const handleRemoveTag = (tag: string) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter(t => t !== tag),
        });
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Workflow Guides</h3>
                    <p className="text-sm text-muted-foreground">
                        Step-by-step instructions for complex tasks
                    </p>
                </div>
                <Button onClick={handleAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Workflow
                </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search workflows..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All difficulties" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Difficulties</SelectItem>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{workflows.length}</div>
                        <p className="text-xs text-muted-foreground">Total Workflows</p>
                    </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-green-600">
                            {workflows.filter(w => w.difficulty === 'beginner').length}
                        </div>
                        <p className="text-xs text-green-600">Beginner</p>
                    </CardContent>
                </Card>
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-yellow-600">
                            {workflows.filter(w => w.difficulty === 'intermediate').length}
                        </div>
                        <p className="text-xs text-yellow-600">Intermediate</p>
                    </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-red-600">
                            {workflows.filter(w => w.difficulty === 'advanced').length}
                        </div>
                        <p className="text-xs text-red-600">Advanced</p>
                    </CardContent>
                </Card>
            </div>

            {/* Workflow List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            ) : filteredWorkflows.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        {workflows.length === 0
                            ? 'No workflow guides yet. Add your first one!'
                            : 'No workflows match your filters.'}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredWorkflows.map(workflow => (
                        <Card key={workflow.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-base">{workflow.title}</CardTitle>
                                            <Badge
                                                variant="outline"
                                                className={getDifficultyColor(workflow.difficulty)}
                                            >
                                                {workflow.difficulty}
                                            </Badge>
                                        </div>
                                        <CardDescription>{workflow.description}</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handlePreview(workflow)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(workflow)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span>{workflow.steps.length} steps</span>
                                        {workflow.estimatedTime && (
                                            <>
                                                <span>•</span>
                                                <span>{workflow.estimatedTime}</span>
                                            </>
                                        )}
                                    </div>
                                    {workflow.tags.length > 0 && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {workflow.tags.map(tag => (
                                                <Badge key={tag} variant="secondary">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                    {workflow.prerequisites && workflow.prerequisites.length > 0 && (
                                        <div className="flex items-start gap-2 text-sm">
                                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                                            <div>
                                                <span className="font-medium">Prerequisites:</span>{' '}
                                                {workflow.prerequisites.join(', ')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog
                open={showAddDialog || showEditDialog}
                onOpenChange={open => {
                    setShowAddDialog(open);
                    setShowEditDialog(open);
                    if (!open) setEditingWorkflow(null);
                }}
            >
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingWorkflow ? 'Edit Workflow Guide' : 'Add Workflow Guide'}
                        </DialogTitle>
                        <DialogDescription>
                            Create step-by-step guidance for complex tasks
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Basic Info */}
                        <div className="space-y-2">
                            <Label>Title *</Label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Product Launch Campaign"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description *</Label>
                            <Textarea
                                value={formData.description}
                                onChange={e =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                placeholder="Step-by-step guide for launching a new product..."
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Difficulty *</Label>
                                <Select
                                    value={formData.difficulty}
                                    onValueChange={value =>
                                        setFormData({
                                            ...formData,
                                            difficulty: value as 'beginner' | 'intermediate' | 'advanced',
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="beginner">Beginner</SelectItem>
                                        <SelectItem value="intermediate">Intermediate</SelectItem>
                                        <SelectItem value="advanced">Advanced</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Estimated Time</Label>
                                <Input
                                    value={formData.estimatedTime}
                                    onChange={e =>
                                        setFormData({ ...formData, estimatedTime: e.target.value })
                                    }
                                    placeholder="2-3 hours"
                                />
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="space-y-2">
                            <Label>Tags</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Add tag..."
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddTag(e.currentTarget.value);
                                            e.currentTarget.value = '';
                                        }
                                    }}
                                />
                            </div>
                            {formData.tags.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    {formData.tags.map(tag => (
                                        <Badge
                                            key={tag}
                                            variant="secondary"
                                            className="cursor-pointer"
                                            onClick={() => handleRemoveTag(tag)}
                                        >
                                            {tag} ×
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Steps */}
                        <div className="space-y-2">
                            <Label>Steps ({formData.steps.length})</Label>

                            {/* Existing Steps */}
                            {formData.steps.map((step, index) => (
                                <Card key={index}>
                                    <CardContent className="pt-4">
                                        <div className="flex items-start gap-2">
                                            <div className="flex flex-col gap-1 pt-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => handleMoveStep(index, 'up')}
                                                    disabled={index === 0}
                                                >
                                                    <ChevronUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => handleMoveStep(index, 'down')}
                                                    disabled={index === formData.steps.length - 1}
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">Step {index + 1}</Badge>
                                                    <span className="font-medium">{step.title}</span>
                                                    {step.agentId && (
                                                        <Badge variant="secondary">{step.agentId}</Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {step.description}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Expected: {step.expectedOutput}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteStep(index)}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {/* Add New Step */}
                            <Card className="border-dashed">
                                <CardContent className="pt-4 space-y-3">
                                    <div className="space-y-2">
                                        <Input
                                            placeholder="Step title..."
                                            value={newStep.title}
                                            onChange={e =>
                                                setNewStep({ ...newStep, title: e.target.value })
                                            }
                                        />
                                        <Textarea
                                            placeholder="Step description..."
                                            value={newStep.description}
                                            onChange={e =>
                                                setNewStep({ ...newStep, description: e.target.value })
                                            }
                                            rows={2}
                                        />
                                        <Input
                                            placeholder="Expected output..."
                                            value={newStep.expectedOutput}
                                            onChange={e =>
                                                setNewStep({
                                                    ...newStep,
                                                    expectedOutput: e.target.value,
                                                })
                                            }
                                        />
                                        <Select
                                            value={newStep.agentId || ''}
                                            onValueChange={value =>
                                                setNewStep({
                                                    ...newStep,
                                                    agentId: value ? (value as InboxAgentPersona) : undefined,
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select agent (optional)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">No agent</SelectItem>
                                                <SelectItem value="craig">Craig (Marketer)</SelectItem>
                                                <SelectItem value="smokey">Smokey (Budtender)</SelectItem>
                                                <SelectItem value="pops">Pops (Analyst)</SelectItem>
                                                <SelectItem value="ezal">Ezal (Research)</SelectItem>
                                                <SelectItem value="deebo">Deebo (Compliance)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={handleAddStep} variant="outline" className="w-full">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Step
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAddDialog(false);
                                setShowEditDialog(false);
                                setEditingWorkflow(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            {editingWorkflow ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{previewWorkflow?.title}</DialogTitle>
                        <DialogDescription>{previewWorkflow?.description}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {previewWorkflow?.steps.map((step, index) => (
                            <Card key={index}>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Badge>Step {index + 1}</Badge>
                                        <CardTitle className="text-sm">{step.title}</CardTitle>
                                        {step.agentId && (
                                            <Badge variant="secondary">{step.agentId}</Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p className="text-sm">{step.description}</p>
                                    <div className="text-xs text-muted-foreground">
                                        <span className="font-medium">Expected Output:</span>{' '}
                                        {step.expectedOutput}
                                    </div>
                                    {step.toolsUsed && step.toolsUsed.length > 0 && (
                                        <div className="text-xs text-muted-foreground">
                                            <span className="font-medium">Tools:</span>{' '}
                                            {step.toolsUsed.join(', ')}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
