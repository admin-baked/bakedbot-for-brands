
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
import { Loader2, Plus, Search, Book, Trash2, Link as LinkIcon, FileText, Database } from 'lucide-react';

import { createKnowledgeBaseAction, getKnowledgeBasesAction, addDocumentAction, getDocumentsAction, deleteDocumentAction } from '@/server/actions/knowledge-base';
import { AGENT_CAPABILITIES } from '@/server/agents/agent-definitions';
import { KnowledgeBase, KnowledgeDocument } from '@/types/knowledge-base';

export default function AgentKnowledgePage() {
    const { toast } = useToast();
    const [selectedAgent, setSelectedAgent] = useState<string>('general');
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

    // Fetch KBs when agent changes
    useEffect(() => {
        loadKbs();
    }, [selectedAgent]);

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
            const kbs = await getKnowledgeBasesAction(selectedAgent);
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
                ownerId: selectedAgent,
                ownerType: 'agent',
                name: newKbName,
                description: `Knowledge Base for ${selectedAgent}`
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

        setLoading(true); // Embedding takes a moment
        try {
            const result = await addDocumentAction({
                knowledgeBaseId: selectedKb,
                title: newDocTitle,
                content: newDocContent,
                type: newDocType as any,
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Agent Knowledge</h1>
                    <p className="text-muted-foreground">Train agents with specialized knowledge bases.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* SIDEBAR: AGENT SELECTOR */}
                <div className="md:col-span-1 space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Select Agent</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {AGENT_CAPABILITIES.map(agent => (
                                <button
                                    key={agent.id}
                                    onClick={() => setSelectedAgent(agent.id)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedAgent === agent.id
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-slate-100 text-slate-600'
                                        }`}
                                >
                                    {agent.name}
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{documents.length}</div>
                            <p className="text-xs text-muted-foreground">Documents Indexed</p>
                        </CardContent>
                    </Card>
                </div>

                {/* MAIN CONTENT */}
                <div className="md:col-span-3 space-y-6">

                    {/* KB SELECTOR / CREATOR */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Label>Knowledge Base:</Label>
                            {knowledgeBases.length > 0 ? (
                                <Select value={selectedKb || ''} onValueChange={setSelectedKb}>
                                    <SelectTrigger className="w-[250px]">
                                        <SelectValue placeholder="Select a KB" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {knowledgeBases.map(kb => (
                                            <SelectItem key={kb.id} value={kb.id}>{kb.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <span className="text-sm text-muted-foreground italic">No KBs found for {selectedAgent}</span>
                            )}
                        </div>

                        <Dialog open={isCreateKbOpen} onOpenChange={setIsCreateKbOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2" /> New Knowledge Base</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create Knowledge Base</DialogTitle>
                                    <DialogDescription>Create a container for {selectedAgent}'s training data.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input value={newKbName} onChange={e => setNewKbName(e.target.value)} placeholder="e.g. Sales Playbook 2025" />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCreateKb}>Create Knowledge Base</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* DOCUMENTS LIST */}
                    {selectedKb ? (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Training Documents</CardTitle>
                                    <CardDescription>
                                        Files and links indexed for {knowledgeBases.find(k => k.id === selectedKb)?.name}
                                    </CardDescription>
                                </div>
                                <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
                                    <DialogTrigger asChild>
                                        <Button><Plus className="w-4 h-4 mr-2" /> Add Data</Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>Add Training Data</DialogTitle>
                                            <DialogDescription>
                                                Add text or links. The content will be vectorized for semantic search.
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
                                                        <Label>Title</Label>
                                                        <Input
                                                            value={newDocTitle}
                                                            onChange={e => setNewDocTitle(e.target.value)}
                                                            placeholder="e.g. Q4 Competitor Analysis"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>{newDocType === 'link' ? 'URL' : 'Content'}</Label>
                                                        {newDocType === 'link' ? (
                                                            <Input
                                                                value={newDocContent}
                                                                onChange={e => setNewDocContent(e.target.value)}
                                                                placeholder="https://..."
                                                            />
                                                        ) : (
                                                            <Textarea
                                                                value={newDocContent}
                                                                onChange={e => setNewDocContent(e.target.value)}
                                                                className="min-h-[200px]"
                                                                placeholder="Paste relevant context, SOPs, or documentation here..."
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </Tabs>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handleAddDocument} disabled={loading}>
                                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                Index Document
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
                                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                        <Database className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-slate-500 font-medium">No documents yet.</p>
                                        <p className="text-xs text-slate-400">Add data to enable semantic search for this agent.</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Title</TableHead>
                                                <TableHead>Snippet</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {documents.map(doc => (
                                                <TableRow key={doc.id}>
                                                    <TableCell>
                                                        {doc.type === 'link' ? <LinkIcon className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-slate-500" />}
                                                    </TableCell>
                                                    <TableCell className="font-medium">{doc.title}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                        {doc.content.substring(0, 50)}...
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {new Date(doc.createdAt as any).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc.id)}>
                                                            <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <h3 className="text-lg font-medium text-slate-900">Select or Create a Knowledge Base</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mt-2">
                                Select an agent on the left, then create a knowledge base to start organizing training data.
                            </p>
                            <Button onClick={() => setIsCreateKbOpen(true)} className="mt-6" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Create First Knowledge Base
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
