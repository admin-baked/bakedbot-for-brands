'use client';

/**
 * Ground Truth Management Tab
 *
 * CEO Dashboard tab for managing Ground Truth QA sets.
 * Features:
 * - Brand selector (all brands for super admin)
 * - Category accordion with QA editing
 * - Live Smokey tester
 * - Import/Export functionality
 */

import { useState, useEffect, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
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
    Download,
    Upload,
    FlaskConical,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Database,
    Code,
    RefreshCw,
    Copy,
    ChevronRight,
} from 'lucide-react';

import {
    listAllGroundTruthBrands,
    getGroundTruthForBrand,
    getCategories,
    getQAPairs,
    createGroundTruth,
    addCategory,
    updateCategory,
    deleteCategory,
    addQAPair,
    updateQAPair,
    deleteQAPair,
    exportGroundTruthJSON,
    importGroundTruthJSON,
    testQuestionLive,
    migrateFromCodeRegistry,
    type GroundTruthBrandSummary,
    type CategorySummary,
    type TestResult,
} from '@/server/actions/ground-truth';

import type { GroundTruthQAPair, GroundTruthQASet, QAPriority } from '@/types/ground-truth';

// ============================================================================
// Sub-Components
// ============================================================================

function StatsCards({ brand }: { brand: GroundTruthBrandSummary | null }) {
    if (!brand) return null;

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
                <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{brand.totalQAPairs}</div>
                    <p className="text-xs text-muted-foreground">Total QA Pairs</p>
                </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-red-600">{brand.criticalCount}</div>
                    <p className="text-xs text-red-600">Critical</p>
                </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-yellow-600">{brand.highCount}</div>
                    <p className="text-xs text-yellow-600">High Priority</p>
                </CardContent>
            </Card>
            <Card className="border-gray-200 bg-gray-50">
                <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-gray-600">{brand.mediumCount}</div>
                    <p className="text-xs text-gray-600">Medium</p>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                        {brand.source === 'firestore' ? (
                            <Database className="h-5 w-5 text-green-600" />
                        ) : (
                            <Code className="h-5 w-5 text-blue-600" />
                        )}
                        <span className="text-sm font-medium capitalize">{brand.source}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Data Source</p>
                </CardContent>
            </Card>
        </div>
    );
}

function PriorityBadge({ priority }: { priority: QAPriority }) {
    const variants: Record<QAPriority, { className: string; icon: React.ReactNode }> = {
        critical: { className: 'bg-red-100 text-red-700 border-red-200', icon: <AlertTriangle className="h-3 w-3" /> },
        high: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: null },
        medium: { className: 'bg-gray-100 text-gray-700 border-gray-200', icon: null },
    };
    const { className, icon } = variants[priority];

    return (
        <Badge variant="outline" className={className}>
            {icon}
            {priority}
        </Badge>
    );
}

function QAPairCard({
    qa,
    onEdit,
    onDelete,
}: {
    qa: GroundTruthQAPair;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                        {qa.id}
                    </Badge>
                    <PriorityBadge priority={qa.priority} />
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={onEdit}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete QA Pair?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the QA pair &quot;{qa.id}&quot;.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <div>
                <p className="font-medium text-sm">{qa.question}</p>
            </div>

            <div className="text-sm text-muted-foreground line-clamp-2">
                {qa.ideal_answer}
            </div>

            <div className="flex flex-wrap gap-1">
                {qa.keywords.slice(0, 5).map((kw, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                        {kw}
                    </Badge>
                ))}
                {qa.keywords.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                        +{qa.keywords.length - 5} more
                    </Badge>
                )}
            </div>
        </div>
    );
}

function QAFormDialog({
    open,
    onOpenChange,
    qa,
    onSave,
    isLoading,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    qa: Partial<GroundTruthQAPair> | null;
    onSave: (data: Omit<GroundTruthQAPair, 'id'>) => void;
    isLoading: boolean;
}) {
    const [formData, setFormData] = useState<Partial<GroundTruthQAPair>>({
        question: '',
        ideal_answer: '',
        context: '',
        intent: '',
        keywords: [],
        priority: 'medium',
    });
    const [keywordsInput, setKeywordsInput] = useState('');

    useEffect(() => {
        if (qa) {
            setFormData(qa);
            setKeywordsInput(qa.keywords?.join(', ') || '');
        } else {
            setFormData({
                question: '',
                ideal_answer: '',
                context: '',
                intent: '',
                keywords: [],
                priority: 'medium',
            });
            setKeywordsInput('');
        }
    }, [qa, open]);

    const handleSubmit = () => {
        const keywords = keywordsInput
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);

        onSave({
            question: formData.question || '',
            ideal_answer: formData.ideal_answer || '',
            context: formData.context || '',
            intent: formData.intent || '',
            keywords,
            priority: formData.priority || 'medium',
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{qa?.id ? 'Edit QA Pair' : 'Add QA Pair'}</DialogTitle>
                    <DialogDescription>
                        {qa?.id ? `Editing ${qa.id}` : 'Create a new question-answer pair'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="question">Question *</Label>
                        <Textarea
                            id="question"
                            placeholder="What customers might ask..."
                            value={formData.question || ''}
                            onChange={e => setFormData({ ...formData, question: e.target.value })}
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ideal_answer">Ideal Answer *</Label>
                        <Textarea
                            id="ideal_answer"
                            placeholder="The expected response from Smokey..."
                            value={formData.ideal_answer || ''}
                            onChange={e => setFormData({ ...formData, ideal_answer: e.target.value })}
                            rows={4}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="context">Context</Label>
                            <Input
                                id="context"
                                placeholder="e.g., Store location"
                                value={formData.context || ''}
                                onChange={e => setFormData({ ...formData, context: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="intent">Intent</Label>
                            <Input
                                id="intent"
                                placeholder="e.g., Find dispensary location"
                                value={formData.intent || ''}
                                onChange={e => setFormData({ ...formData, intent: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                        <Input
                            id="keywords"
                            placeholder="address, Syracuse, NY, Erie Blvd"
                            value={keywordsInput}
                            onChange={e => setKeywordsInput(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Keywords Smokey&apos;s response should contain for validation
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                            value={formData.priority || 'medium'}
                            onValueChange={(value: QAPriority) => setFormData({ ...formData, priority: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="critical">
                                    <span className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                        Critical (100% accuracy required)
                                    </span>
                                </SelectItem>
                                <SelectItem value="high">High (95% target)</SelectItem>
                                <SelectItem value="medium">Medium (85% target)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading || !formData.question || !formData.ideal_answer}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {qa?.id ? 'Update' : 'Add'} QA Pair
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CategoryAccordion({
    brandId,
    categories,
    onRefresh,
}: {
    brandId: string;
    categories: CategorySummary[];
    onRefresh: () => void;
}) {
    const { toast } = useToast();
    const [expandedCategory, setExpandedCategory] = useState<string | undefined>();
    const [qaPairs, setQAPairs] = useState<Record<string, GroundTruthQAPair[]>>({});
    const [loadingPairs, setLoadingPairs] = useState<Record<string, boolean>>({});
    const [editingQA, setEditingQA] = useState<{ categoryKey: string; qa: GroundTruthQAPair | null } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadQAPairs = async (categoryKey: string) => {
        if (qaPairs[categoryKey]) return; // Already loaded

        setLoadingPairs(prev => ({ ...prev, [categoryKey]: true }));
        const result = await getQAPairs(brandId, categoryKey);
        if (result.success && result.data) {
            setQAPairs(prev => ({ ...prev, [categoryKey]: result.data! }));
        }
        setLoadingPairs(prev => ({ ...prev, [categoryKey]: false }));
    };

    const handleAccordionChange = (value: string) => {
        setExpandedCategory(value);
        if (value) {
            loadQAPairs(value);
        }
    };

    const handleSaveQA = async (data: Omit<GroundTruthQAPair, 'id'>) => {
        if (!editingQA) return;

        setIsSubmitting(true);
        try {
            if (editingQA.qa?.id) {
                // Update existing
                const result = await updateQAPair(brandId, editingQA.categoryKey, editingQA.qa.id, data);
                if (result.success) {
                    toast({ title: 'QA pair updated' });
                    // Refresh the pairs for this category
                    setQAPairs(prev => ({ ...prev, [editingQA.categoryKey]: [] }));
                    loadQAPairs(editingQA.categoryKey);
                } else {
                    toast({ title: 'Error', description: result.message, variant: 'destructive' });
                }
            } else {
                // Add new
                const result = await addQAPair(brandId, editingQA.categoryKey, data);
                if (result.success) {
                    toast({ title: 'QA pair added' });
                    setQAPairs(prev => ({ ...prev, [editingQA.categoryKey]: [] }));
                    loadQAPairs(editingQA.categoryKey);
                    onRefresh();
                } else {
                    toast({ title: 'Error', description: result.message, variant: 'destructive' });
                }
            }
            setEditingQA(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteQA = async (categoryKey: string, qaId: string) => {
        const result = await deleteQAPair(brandId, categoryKey, qaId);
        if (result.success) {
            toast({ title: 'QA pair deleted' });
            setQAPairs(prev => ({
                ...prev,
                [categoryKey]: prev[categoryKey]?.filter(q => q.id !== qaId) || [],
            }));
            onRefresh();
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    };

    return (
        <>
            <Accordion type="single" collapsible value={expandedCategory} onValueChange={handleAccordionChange}>
                {categories.map(category => (
                    <AccordionItem key={category.key} value={category.key}>
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                                <span className="font-medium">{category.key.replace(/_/g, ' ')}</span>
                                <Badge variant="secondary">{category.qaPairCount}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-4 pt-2">
                                <p className="text-sm text-muted-foreground">{category.description}</p>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingQA({ categoryKey: category.key, qa: null })}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add QA Pair
                                </Button>

                                {loadingPairs[category.key] ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {qaPairs[category.key]?.map(qa => (
                                            <QAPairCard
                                                key={qa.id}
                                                qa={qa}
                                                onEdit={() => setEditingQA({ categoryKey: category.key, qa })}
                                                onDelete={() => handleDeleteQA(category.key, qa.id)}
                                            />
                                        ))}
                                        {qaPairs[category.key]?.length === 0 && (
                                            <p className="text-sm text-muted-foreground py-4 text-center">
                                                No QA pairs in this category yet.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>

            <QAFormDialog
                open={!!editingQA}
                onOpenChange={open => !open && setEditingQA(null)}
                qa={editingQA?.qa || null}
                onSave={handleSaveQA}
                isLoading={isSubmitting}
            />
        </>
    );
}

function LiveTester({ brandId }: { brandId: string }) {
    const { toast } = useToast();
    const [question, setQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<TestResult | null>(null);

    const handleTest = async () => {
        if (!question.trim()) return;

        setIsLoading(true);
        setResult(null);

        try {
            const response = await testQuestionLive(brandId, question);
            if (response.success && response.data) {
                setResult(response.data);
            } else {
                toast({ title: 'Test failed', description: response.message, variant: 'destructive' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FlaskConical className="h-5 w-5" />
                        Live Smokey Tester
                    </CardTitle>
                    <CardDescription>
                        Test how Smokey responds and compare against the ideal answer
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter a customer question..."
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleTest()}
                        />
                        <Button onClick={handleTest} disabled={isLoading || !question.trim()}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Test Result</CardTitle>
                            {result.passed ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200">
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Passed
                                </Badge>
                            ) : (
                                <Badge className="bg-red-100 text-red-700 border-red-200">
                                    <XCircle className="mr-1 h-3 w-3" />
                                    Failed
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Scores */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-muted rounded-lg">
                                <div className="text-2xl font-bold">{Math.round(result.score.overall * 100)}%</div>
                                <div className="text-xs text-muted-foreground">Overall Score</div>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                                <div className="text-2xl font-bold">{Math.round(result.score.keywordCoverage * 100)}%</div>
                                <div className="text-xs text-muted-foreground">Keyword Coverage</div>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                                <div className="text-2xl font-bold">{Math.round(result.score.intentMatch * 100)}%</div>
                                <div className="text-xs text-muted-foreground">Intent Match</div>
                            </div>
                        </div>

                        {/* Matched QA */}
                        {result.matchedQA && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Matched QA:</span>
                                    <Badge variant="secondary">{result.matchedQA.id}</Badge>
                                    <PriorityBadge priority={result.matchedQA.priority} />
                                </div>
                            </div>
                        )}

                        {/* Side by side comparison */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-green-600">Ideal Answer</Label>
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                                    {result.idealAnswer || 'No matching QA pair found'}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-blue-600">Smokey&apos;s Response</Label>
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                                    {result.smokeyResponse}
                                </div>
                            </div>
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

export default function GroundTruthTab() {
    const { toast } = useToast();

    // State
    const [brands, setBrands] = useState<GroundTruthBrandSummary[]>([]);
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');
    const [categories, setCategories] = useState<CategorySummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);

    // Dialogs
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [importJson, setImportJson] = useState('');

    // Create form
    const [createForm, setCreateForm] = useState({
        brandId: '',
        dispensary: '',
        address: '',
        author: '',
    });

    // New category form
    const [newCategory, setNewCategory] = useState({ key: '', description: '' });

    const selectedBrand = brands.find(b => b.brandId === selectedBrandId) || null;

    // Load brands on mount
    useEffect(() => {
        loadBrands();
    }, []);

    // Load categories when brand changes
    useEffect(() => {
        if (selectedBrandId) {
            loadCategories();
        }
    }, [selectedBrandId]);

    const loadBrands = async () => {
        setIsLoading(true);
        const result = await listAllGroundTruthBrands();
        if (result.success && result.data) {
            setBrands(result.data);
            if (result.data.length > 0 && !selectedBrandId) {
                setSelectedBrandId(result.data[0].brandId);
            }
        }
        setIsLoading(false);
    };

    const loadCategories = async () => {
        setIsLoadingCategories(true);
        const result = await getCategories(selectedBrandId);
        if (result.success && result.data) {
            setCategories(result.data);
        }
        setIsLoadingCategories(false);
    };

    const handleCreateGroundTruth = async () => {
        const result = await createGroundTruth({
            brandId: createForm.brandId,
            dispensary: createForm.dispensary,
            address: createForm.address,
            author: createForm.author,
        });

        if (result.success) {
            toast({ title: 'Ground truth created' });
            setShowCreateDialog(false);
            setCreateForm({ brandId: '', dispensary: '', address: '', author: '' });
            loadBrands();
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    };

    const handleAddCategory = async () => {
        if (!newCategory.key || !newCategory.description) return;

        const result = await addCategory(selectedBrandId, {
            key: newCategory.key.toLowerCase().replace(/\s+/g, '_'),
            description: newCategory.description,
        });

        if (result.success) {
            toast({ title: 'Category added' });
            setShowAddCategoryDialog(false);
            setNewCategory({ key: '', description: '' });
            loadCategories();
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    };

    const handleExport = async () => {
        const result = await exportGroundTruthJSON(selectedBrandId);
        if (result.success && result.data) {
            const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ground-truth-${selectedBrandId}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: 'Export successful' });
        } else {
            toast({ title: 'Export failed', description: result.message, variant: 'destructive' });
        }
    };

    const handleImport = async () => {
        try {
            const data = JSON.parse(importJson);
            const result = await importGroundTruthJSON(selectedBrandId, data);
            if (result.success) {
                toast({ title: 'Import successful', description: `Imported ${result.data?.imported} QA pairs` });
                setShowImportDialog(false);
                setImportJson('');
                loadBrands();
                loadCategories();
            } else {
                toast({ title: 'Import failed', description: result.message, variant: 'destructive' });
            }
        } catch (e) {
            toast({ title: 'Invalid JSON', description: 'Please check your JSON format', variant: 'destructive' });
        }
    };

    const handleMigrate = async () => {
        if (!selectedBrand || selectedBrand.source !== 'code') return;

        const result = await migrateFromCodeRegistry(selectedBrandId);
        if (result.success) {
            toast({ title: 'Migration successful', description: `Migrated ${result.data?.migrated} QA pairs to Firestore` });
            loadBrands();
        } else {
            toast({ title: 'Migration failed', description: result.message, variant: 'destructive' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Ground Truth Management</h2>
                    <p className="text-muted-foreground">
                        Manage QA sets that train Smokey for accurate, compliant responses
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                            {brands.map(brand => (
                                <SelectItem key={brand.brandId} value={brand.brandId}>
                                    <span className="flex items-center gap-2">
                                        {brand.source === 'firestore' ? (
                                            <Database className="h-3 w-3 text-green-600" />
                                        ) : (
                                            <Code className="h-3 w-3 text-blue-600" />
                                        )}
                                        {brand.dispensary}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                New Brand
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Ground Truth</DialogTitle>
                                <DialogDescription>
                                    Initialize ground truth for a new brand
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Brand ID</Label>
                                    <Input
                                        placeholder="e.g., thrivesyracuse"
                                        value={createForm.brandId}
                                        onChange={e => setCreateForm({ ...createForm, brandId: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Dispensary Name</Label>
                                    <Input
                                        placeholder="e.g., Thrive Syracuse"
                                        value={createForm.dispensary}
                                        onChange={e => setCreateForm({ ...createForm, dispensary: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Address</Label>
                                    <Input
                                        placeholder="e.g., 123 Main St, Syracuse, NY"
                                        value={createForm.address}
                                        onChange={e => setCreateForm({ ...createForm, address: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Author</Label>
                                    <Input
                                        placeholder="Your name"
                                        value={createForm.author}
                                        onChange={e => setCreateForm({ ...createForm, author: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                                <Button onClick={handleCreateGroundTruth}>Create</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats */}
            <StatsCards brand={selectedBrand} />

            {/* Main Content */}
            {selectedBrandId && (
                <Tabs defaultValue="editor" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="editor">Editor</TabsTrigger>
                        <TabsTrigger value="tester">Live Tester</TabsTrigger>
                        <TabsTrigger value="import-export">Import/Export</TabsTrigger>
                    </TabsList>

                    <TabsContent value="editor" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Category
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Add Category</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Category Key</Label>
                                                <Input
                                                    placeholder="e.g., store_hours"
                                                    value={newCategory.key}
                                                    onChange={e => setNewCategory({ ...newCategory, key: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Description</Label>
                                                <Input
                                                    placeholder="e.g., Store operating hours"
                                                    value={newCategory.description}
                                                    onChange={e => setNewCategory({ ...newCategory, description: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setShowAddCategoryDialog(false)}>Cancel</Button>
                                            <Button onClick={handleAddCategory}>Add</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                {selectedBrand?.source === 'code' && (
                                    <Button variant="outline" size="sm" onClick={handleMigrate}>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Migrate to Firestore
                                    </Button>
                                )}
                            </div>

                            <Button variant="ghost" size="sm" onClick={loadCategories}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Refresh
                            </Button>
                        </div>

                        {isLoadingCategories ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : categories.length > 0 ? (
                            <CategoryAccordion
                                brandId={selectedBrandId}
                                categories={categories}
                                onRefresh={() => {
                                    loadBrands();
                                    loadCategories();
                                }}
                            />
                        ) : (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <p className="text-muted-foreground">
                                        No categories yet. Add a category to get started.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="tester">
                        <LiveTester brandId={selectedBrandId} />
                    </TabsContent>

                    <TabsContent value="import-export" className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Download className="h-5 w-5" />
                                        Export
                                    </CardTitle>
                                    <CardDescription>
                                        Download the current ground truth as JSON
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button onClick={handleExport}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Export JSON
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Upload className="h-5 w-5" />
                                        Import
                                    </CardTitle>
                                    <CardDescription>
                                        Import ground truth from a JSON file
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline">
                                                <Upload className="mr-2 h-4 w-4" />
                                                Import JSON
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle>Import Ground Truth</DialogTitle>
                                                <DialogDescription>
                                                    Paste your ground truth JSON below
                                                </DialogDescription>
                                            </DialogHeader>
                                            <Textarea
                                                placeholder='{"metadata": {...}, "categories": {...}}'
                                                value={importJson}
                                                onChange={e => setImportJson(e.target.value)}
                                                rows={12}
                                                className="font-mono text-sm"
                                            />
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                                                    Cancel
                                                </Button>
                                                <Button onClick={handleImport}>Import</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            )}

            {!selectedBrandId && brands.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground mb-4">
                            No ground truth configured yet. Create one to get started.
                        </p>
                        <Button onClick={() => setShowCreateDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Ground Truth
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
