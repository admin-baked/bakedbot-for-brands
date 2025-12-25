'use client';

/**
 * System Knowledge Base - Super Admin Training Interface
 * Allows Super Admins to train all agents globally via system-level knowledge bases
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
    Brain,
    Plus,
    Trash2,
    FileText,
    Link,
    Upload,
    Globe,
    Loader2,
    BookOpen,
    Search,
    Sparkles,
    RefreshCw,
    Database,
    Shield,
    Bot,
} from 'lucide-react';

import {
    createKnowledgeBaseAction,
    getKnowledgeBasesAction,
    addDocumentAction,
    getDocumentsAction,
    deleteDocumentAction,
    scrapeUrlAction,
    updateKnowledgeBaseAction,
    deleteKnowledgeBaseAction,
} from '@/server/actions/knowledge-base';
import type { KnowledgeBase, KnowledgeDocument } from '@/types/knowledge-base';

export function SystemKnowledgeBase() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
    const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
    const [documents, setDocuments] = useState<Omit<KnowledgeDocument, 'embedding'>[]>([]);

    // Create KB Dialog
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newKbName, setNewKbName] = useState('');
    const [newKbDesc, setNewKbDesc] = useState('');

    // Add Document Dialog
    const [isAddDocOpen, setIsAddDocOpen] = useState(false);
    const [inputMethod, setInputMethod] = useState<'paste' | 'scrape'>('paste');
    const [docTitle, setDocTitle] = useState('');
    const [docContent, setDocContent] = useState('');
    const [scrapeUrl, setScrapeUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Load KBs
    const loadKnowledgeBases = useCallback(async () => {
        setIsLoading(true);
        try {
            const kbs = await getKnowledgeBasesAction('system');
            setKnowledgeBases(kbs);
            if (kbs.length > 0 && !selectedKb) {
                setSelectedKb(kbs[0]);
            }
        } catch (error) {
            console.error('Failed to load knowledge bases:', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedKb]);

    // Load Documents for selected KB
    const loadDocuments = useCallback(async () => {
        if (!selectedKb) return;
        try {
            const docs = await getDocumentsAction(selectedKb.id);
            setDocuments(docs);
        } catch (error) {
            console.error('Failed to load documents:', error);
        }
    }, [selectedKb]);

    useEffect(() => {
        loadKnowledgeBases();
    }, [loadKnowledgeBases]);

    useEffect(() => {
        if (selectedKb) {
            loadDocuments();
        }
    }, [selectedKb, loadDocuments]);

    // Create KB
    const handleCreateKb = async () => {
        if (!newKbName.trim()) {
            toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        try {
            const result = await createKnowledgeBaseAction({
                ownerId: 'system',
                ownerType: 'system',
                name: newKbName.trim(),
                description: newKbDesc.trim() || undefined,
            });
            if (result.success) {
                toast({ title: 'Success', description: 'Knowledge Base created' });
                setIsCreateOpen(false);
                setNewKbName('');
                setNewKbDesc('');
                loadKnowledgeBases();
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    // Add Document
    const handleAddDocument = async () => {
        console.log('[SystemKB] Adding document...');
        if (!selectedKb) {
             console.error('[SystemKB] No KB selected');
             return;
        }

        setIsSaving(true);
        try {
            let result;

            if (inputMethod === 'scrape') {
                if (!scrapeUrl.trim()) {
                    toast({ title: 'Error', description: 'URL is required', variant: 'destructive' });
                    setIsSaving(false);
                    return;
                }
                result = await scrapeUrlAction({
                    knowledgeBaseId: selectedKb.id,
                    url: scrapeUrl.trim(),
                    title: docTitle.trim() || undefined,
                });
            } else {
                if (!docTitle.trim() || !docContent.trim()) {
                    toast({ title: 'Error', description: 'Title and content are required', variant: 'destructive' });
                    setIsSaving(false);
                    return;
                }
                console.log('[SystemKB] Calling addDocumentAction with title:', docTitle);
                result = await addDocumentAction({
                    knowledgeBaseId: selectedKb.id,
                    type: 'text',
                    source: 'paste',
                    title: docTitle.trim(),
                    content: docContent.trim(),
                });
            }
            
            console.log('[SystemKB] Action Result:', result);

            if (result.success) {
                toast({ title: 'Success', description: 'Document added and indexed' });
                setIsAddDocOpen(false);
                setDocTitle('');
                setDocContent('');
                setScrapeUrl('');
                loadDocuments();
                loadKnowledgeBases(); // Refresh counts
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            console.error('[SystemKB] Error adding document:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    // Delete Document
    const handleDeleteDocument = async (docId: string) => {
        if (!selectedKb || !confirm('Delete this document?')) return;
        try {
            const result = await deleteDocumentAction(selectedKb.id, docId);
            if (result.success) {
                toast({ title: 'Deleted', description: 'Document removed' });
                loadDocuments();
                loadKnowledgeBases();
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };


    // Delete KB
    const handleDeleteKb = async () => {
        if (!selectedKb) return;
        if (!confirm(`Are you sure you want to delete "${selectedKb.name}"? This will delete ${selectedKb.documentCount} documents. This cannot be undone.`)) return;

        setIsSaving(true);
        try {
            const result = await deleteKnowledgeBaseAction(selectedKb.id);
            if (result.success) {
                toast({ title: 'Deleted', description: 'Knowledge Base deleted.' });
                setSelectedKb(null);
                loadKnowledgeBases();
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Brain className="h-6 w-6 text-primary" />
                        System Knowledge Base
                    </h2>
                    <p className="text-muted-foreground">
                        Train all agents globally with shared knowledge
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        <Shield className="h-3 w-3 mr-1" />
                        Super Admin Only
                    </Badge>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left: KB List */}
                <Card className="lg:col-span-1">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Knowledge Bases</CardTitle>
                            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                <Button size="sm" variant="outline" onClick={() => setIsCreateOpen(true)}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    New
                                </Button>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create System Knowledge Base</DialogTitle>
                                        <DialogDescription>
                                            This knowledge base will be available to all agents.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Name</Label>
                                            <Input
                                                placeholder="e.g., Compliance Rules"
                                                value={newKbName}
                                                onChange={(e) => setNewKbName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Description (optional)</Label>
                                            <Textarea
                                                placeholder="What kind of knowledge will this contain?"
                                                value={newKbDesc}
                                                onChange={(e) => setNewKbDesc(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleCreateKb} disabled={isSaving}>
                                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                            Create
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : knowledgeBases.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Database className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p>No knowledge bases yet</p>
                                <Button variant="link" onClick={() => setIsCreateOpen(true)}>
                                    Create your first
                                </Button>
                            </div>
                        ) : (
                            <ScrollArea className="h-[400px]">
                                <div className="space-y-2">
                                    {knowledgeBases.map((kb) => (
                                        <div
                                            key={kb.id}
                                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                                selectedKb?.id === kb.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'hover:bg-muted/50'
                                            }`}
                                            onClick={() => setSelectedKb(kb)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-medium">{kb.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {kb.documentCount} docs • {formatBytes(kb.totalBytes || 0)}
                                                    </p>
                                                </div>
                                                <Badge variant={kb.enabled ? 'default' : 'secondary'} className="text-xs">
                                                    {kb.enabled ? 'Active' : 'Disabled'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>

                {/* Right: Documents */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">
                                    {selectedKb ? selectedKb.name : 'Select a Knowledge Base'}
                                </CardTitle>
                                {selectedKb?.description && (
                                    <CardDescription>{selectedKb.description}</CardDescription>
                                )}
                            </div>
                            {selectedKb && (
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={loadDocuments}>
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                    <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
                                        <Button size="sm" onClick={() => setIsAddDocOpen(true)}>
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add Document
                                        </Button>
                                        <DialogContent className="max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle>Add Training Document</DialogTitle>
                                                <DialogDescription>
                                                    Add knowledge that all agents will learn from
                                                </DialogDescription>
                                            </DialogHeader>
                                            <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as any)}>
                                                <TabsList className="grid w-full grid-cols-2">
                                                    <TabsTrigger value="paste">
                                                        <FileText className="h-4 w-4 mr-2" />
                                                        Copy/Paste
                                                    </TabsTrigger>
                                                    <TabsTrigger value="scrape">
                                                        <Globe className="h-4 w-4 mr-2" />
                                                        From URL
                                                    </TabsTrigger>
                                                </TabsList>

                                                <TabsContent value="paste" className="space-y-4 mt-4">
                                                    <div className="space-y-2">
                                                        <Label>Title</Label>
                                                        <Input
                                                            placeholder="e.g., Illinois Compliance Rules"
                                                            value={docTitle}
                                                            onChange={(e) => setDocTitle(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Content</Label>
                                                        <Textarea
                                                            placeholder="Paste your content here..."
                                                            className="min-h-[200px]"
                                                            value={docContent}
                                                            onChange={(e) => setDocContent(e.target.value)}
                                                        />
                                                        <p className="text-xs text-muted-foreground">
                                                            {docContent.length} characters
                                                        </p>
                                                    </div>
                                                </TabsContent>

                                                <TabsContent value="scrape" className="space-y-4 mt-4">
                                                    <div className="space-y-2">
                                                        <Label>URL to Scrape</Label>
                                                        <Input
                                                            placeholder="https://example.com/article"
                                                            value={scrapeUrl}
                                                            onChange={(e) => setScrapeUrl(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Title (optional, auto-detected)</Label>
                                                        <Input
                                                            placeholder="Auto-detected from page"
                                                            value={docTitle}
                                                            onChange={(e) => setDocTitle(e.target.value)}
                                                        />
                                                    </div>
                                                </TabsContent>
                                            </Tabs>
                                            <DialogFooter>
                                                <Button onClick={handleAddDocument} disabled={isSaving}>
                                                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                                    <Sparkles className="h-4 w-4 mr-2" />
                                                    Add & Embed
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent>
                        {!selectedKb ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p>Select a knowledge base to view documents</p>
                            </div>
                        ) : (
                            <Tabs defaultValue="documents">
                                <TabsList className="mb-4">
                                    <TabsTrigger value="documents">
                                        <FileText className="h-4 w-4 mr-2" />
                                        Documents
                                    </TabsTrigger>
                                    <TabsTrigger value="settings">
                                        <Bot className="h-4 w-4 mr-2" />
                                        System Instructions
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="documents">
                                    {documents.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                            <p>No documents yet</p>
                                            <Button variant="link" onClick={() => setIsAddDocOpen(true)}>
                                                Add your first document
                                            </Button>
                                        </div>
                                    ) : (
                                        <ScrollArea className="h-[400px]">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Title</TableHead>
                                                        <TableHead>Source</TableHead>
                                                        <TableHead>Size</TableHead>
                                                        <TableHead>Added</TableHead>
                                                        <TableHead></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {documents.map((doc) => (
                                                        <TableRow key={doc.id}>
                                                            <TableCell className="font-medium">{doc.title}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {doc.source === 'paste' && <FileText className="h-3 w-3 mr-1" />}
                                                                    {doc.source === 'scrape' && <Globe className="h-3 w-3 mr-1" />}
                                                                    {doc.source === 'upload' && <Upload className="h-3 w-3 mr-1" />}
                                                                    {doc.source}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground">
                                                                {formatBytes(doc.byteSize)}
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground" suppressHydrationWarning>
                                                                {new Date(doc.createdAt).toLocaleDateString()}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-destructive hover:text-destructive"
                                                                    onClick={() => handleDeleteDocument(doc.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    )}
                                </TabsContent>

                                <TabsContent value="settings">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Core Persona & Instructions</Label>
                                            <p className="text-sm text-muted-foreground">
                                                These instructions serve as the "System Prompt" when an agent references this knowledge base.
                                                Define how the agent should interpret the data (e.g., "Act as a compliance officer...").
                                            </p>
                                            <Textarea
                                                className="min-h-[300px] font-mono text-sm"
                                                placeholder="e.g. You are an expert in Nevada Cannabis Compliance..."
                                                defaultValue={selectedKb.systemInstructions}
                                                onChange={async (e) => {
                                                    // Debounce auto-save or use a save button
                                                }}
                                                // Using a simple save button pattern below instead of auto-save for safety
                                                id="sys-instructions"
                                            />
                                        </div>
                                        <div className="flex justify-between items-center pt-8 border-t">
                                            <Button 
                                                variant="destructive"
                                                onClick={handleDeleteKb}
                                                disabled={isSaving}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Knowledge Base
                                            </Button>
                                            
                                            <Button 
                                                onClick={async () => {
                                                    const val = (document.getElementById('sys-instructions') as HTMLTextAreaElement).value;
                                                    setIsSaving(true);
                                                    try {
                                                        const res = await updateKnowledgeBaseAction({
                                                            knowledgeBaseId: selectedKb.id,
                                                            systemInstructions: val
                                                        });
                                                        if (res.success) {
                                                            toast({ title: 'Saved', description: 'System instructions updated.' });
                                                            // update local state
                                                            setSelectedKb({ ...selectedKb, systemInstructions: val });
                                                            // update list
                                                            setKnowledgeBases(prev => prev.map(k => k.id === selectedKb.id ? { ...k, systemInstructions: val } : k));
                                                        } else {
                                                            toast({ title: 'Error', description: res.message, variant: 'destructive' });
                                                        }
                                                    } catch (e: any) {
                                                        toast({ title: 'Error', description: e.message, variant: 'destructive' });
                                                    } finally {
                                                        setIsSaving(false);
                                                    }
                                                }}
                                                disabled={isSaving}
                                            >
                                                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                                Save Instructions
                                            </Button>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
