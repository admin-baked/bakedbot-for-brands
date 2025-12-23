
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Search, Book, Trash2, Link as LinkIcon, FileText, Database, ShieldCheck } from 'lucide-react';

import { createKnowledgeBaseAction, getKnowledgeBasesAction, addDocumentAction, getDocumentsAction, deleteDocumentAction } from '@/server/actions/knowledge-base';
import { KnowledgeBase, KnowledgeDocument } from '@/types/knowledge-base';

interface BrandKnowledgeBaseProps {
    brandId: string;
}

export function BrandKnowledgeBase({ brandId }: BrandKnowledgeBaseProps) {
    const { toast } = useToast();
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
    const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
    const [selectedKb, setSelectedKb] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Dialog States
    const [isCreateKbOpen, setIsCreateKbOpen] = useState(false);
    const [isAddDocOpen, setIsAddDocOpen] = useState(false);
    const [newKbName, setNewKbName] = useState('');
    const [newDocTitle, setNewDocTitle] = useState('');
    const [newDocContent, setNewDocContent] = useState('');
    const [newDocType, setNewDocType] = useState('text');

    // Fetch KBs on mount
    useEffect(() => {
        loadKbs();
    }, [brandId]);

    // Fetch Docs when KB selection changes
    useEffect(() => {
        if (selectedKb) {
            loadDocuments(selectedKb);
        } else {
            setDocuments([]);
        }
    }, [selectedKb]);

    const loadKbs = async () => {
        setLoading(true);
        try {
            const kbs = await getKnowledgeBasesAction(brandId);
            setKnowledgeBases(kbs);
            if (kbs.length > 0 && !selectedKb) {
                setSelectedKb(kbs[0].id); // Auto-select first
            } else if (kbs.length === 0) {
                setSelectedKb(null);
            }
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to load Knowledge Bases', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const loadDocuments = async (kbId: string) => {
        setLoading(true);
        try {
            const docs = await getDocumentsAction(kbId);
            setDocuments(docs);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load documents', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKb = async () => {
        if (!newKbName.trim()) return;

        try {
            const result = await createKnowledgeBaseAction({
                ownerId: brandId,
                ownerType: 'brand',
                name: newKbName,
                description: `Brand Knowledge Base`
            });

            if (result.success) {
                toast({ title: 'Success', description: 'Knowledge Base created.' });
                setIsCreateKbOpen(false);
                setNewKbName('');
                loadKbs();
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to create KB', variant: 'destructive' });
        }
    };

    const handleAddDocument = async () => {
        if (!selectedKb || !newDocTitle || !newDocContent) return;

        setLoading(true);
        try {
            const result = await addDocumentAction({
                knowledgeBaseId: selectedKb,
                title: newDocTitle,
                content: newDocContent,
                type: newDocType as any,
                source: 'paste',
                sourceUrl: newDocType === 'link' ? newDocContent : undefined
            });

            if (result.success) {
                toast({ title: 'Success', description: 'Document added and indexed.' });
                setIsAddDocOpen(false);
                setNewDocTitle('');
                setNewDocContent('');
                loadDocuments(selectedKb);
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to add document', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!selectedKb) return;
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            const result = await deleteDocumentAction(selectedKb, docId);
            if (result.success) {
                toast({ title: 'Deleted', description: 'Document removed.' });
                loadDocuments(selectedKb);
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Brand Context</h2>
                    <p className="text-slate-500">Train BakedBot on your SOPs, menus, and brand guidelines.</p>
                </div>

                <Dialog open={isCreateKbOpen} onOpenChange={setIsCreateKbOpen}>
                    <DialogTrigger asChild>
                        <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                            <Plus className="w-4 h-4 mr-2" /> New Context Group
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Context Group</DialogTitle>
                            <DialogDescription>Group related documents (e.g. "SOPs", "Product Data").</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input value={newKbName} onChange={e => setNewKbName(e.target.value)} placeholder="e.g. Sales Playbook" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreateKb}>Create Group</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* KB SELECTOR TABS */}
            {knowledgeBases.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {knowledgeBases.map(kb => (
                        <button
                            key={kb.id}
                            onClick={() => setSelectedKb(kb.id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedKb === kb.id
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border'
                                }`}
                        >
                            {kb.name}
                        </button>
                    ))}
                </div>
            )}

            {/* MAIN CONTENT */}
            {selectedKb ? (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            <div>
                                <CardTitle className="text-base">Secure Documents</CardTitle>
                                <CardDescription>
                                    Only available to your brand agents.
                                </CardDescription>
                            </div>
                        </div>
                        <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2" /> Add Document</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Add Training Document</DialogTitle>
                                    <DialogDescription>
                                        BakedBot will use this context to answer your questions accurately.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <Tabs defaultValue="text" onValueChange={setNewDocType}>
                                        <TabsList>
                                            <TabsTrigger value="text">Text / Paste</TabsTrigger>
                                            <TabsTrigger value="link">URL Link</TabsTrigger>
                                        </TabsList>

                                        <div className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                                <Label>Document Title</Label>
                                                <Input
                                                    value={newDocTitle}
                                                    onChange={e => setNewDocTitle(e.target.value)}
                                                    placeholder="e.g. Return Policy 2024"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>{newDocType === 'link' ? 'Document URL' : 'Content / Text'}</Label>
                                                {newDocType === 'link' ? (
                                                    <Input
                                                        value={newDocContent}
                                                        onChange={e => setNewDocContent(e.target.value)}
                                                        placeholder="https://docs.google.com/..."
                                                    />
                                                ) : (
                                                    <Textarea
                                                        value={newDocContent}
                                                        onChange={e => setNewDocContent(e.target.value)}
                                                        className="min-h-[200px] font-mono text-xs"
                                                        placeholder="Paste your SOP, guidelines, or data here..."
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </Tabs>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleAddDocument} disabled={loading}>
                                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Add to Knowledge Base
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        {loading && documents.length === 0 ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50/50">
                                <Database className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-500 font-medium">This context group is empty.</p>
                                <Button onClick={() => setIsAddDocOpen(true)} variant="link" className="text-emerald-600">
                                    Add your first document
                                </Button>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead>Type</TableHead>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Content Snippet</TableHead>
                                            <TableHead>Added</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {documents.map(doc => (
                                            <TableRow key={doc.id}>
                                                <TableCell>
                                                    {doc.type === 'link' ? <LinkIcon className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-slate-500" />}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-900">{doc.title}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                    {doc.content.substring(0, 60)}...
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {new Date(doc.createdAt as any).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc.id)} className="h-8 w-8 p-0">
                                                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Book className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">Start Training Your Agents</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">
                        Create a Context Group to organize your documents, then upload text or links.
                    </p>
                    <Button onClick={() => setIsCreateKbOpen(true)} size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                        Create Context Group
                    </Button>
                </div>
            )}
        </div>
    );
}
