
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
import { Loader2, Plus, Search, Book, Trash2, Link as LinkIcon, FileText, Database, Upload, Globe, RefreshCw, CheckCircle } from 'lucide-react';

import { createKnowledgeBaseAction, getKnowledgeBasesAction, addDocumentAction, getDocumentsAction, deleteDocumentAction, discoverUrlAction } from '@/server/actions/knowledge-base';
import { searchComplianceData, queueComplianceDiscovery } from '@/server/actions/compliance-discovery';
import { AGENT_CAPABILITIES } from '@/server/agents/agent-definitions';
import { KnowledgeBase, KnowledgeDocument } from '@/types/knowledge-base';
import React from 'react';

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
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    // Compliance Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const handleComplianceSearch = async (query: string, state?: string) => {
        setIsSearching(true);
        try {
            const result = await searchComplianceData(query, state);
            if (result.success && result.results) {
                setSearchResults(result.results);
                toast({ title: 'Search Complete', description: `Found ${result.results.length} relevant sources.` });
            } else {
                toast({ title: 'No Results', description: 'Try adjusting your search terms.', variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to search compliance data', variant: 'destructive' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddToQueue = async (result: any) => {
        if (!selectedKb) return;
        try {
            const queueResult = await queueComplianceDiscovery({
                title: result.title,
                content: result.snippet, // Initially just the snippet, full discovery would happen on approval or via button
                summary: result.snippet,
                source: result.source,
                sourceUrl: result.url,
                state: 'General' // Could be parsed
            });
            
            if (queueResult.success) {
                toast({ title: 'Queued', description: 'Added to review queue.' });
            }
        } catch (error) {
             toast({ title: 'Error', description: 'Failed to queue item', variant: 'destructive' });
        }
    };

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
                ownerType: 'system',
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

    // File upload handler - reads text from file
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        setUploadedFile(file);
        
        // Read file content
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setNewDocContent(text);
            setNewDocTitle(file.name.replace(/\.[^/.]+$/, '')); // Remove extension for title
        };
        
        if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
            reader.readAsText(file);
        } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
            reader.readAsText(file);
        } else {
            // For other files, just set the name
            setNewDocTitle(file.name);
            toast({ title: 'Note', description: 'Only text/JSON files auto-extract. For PDFs, paste the content.', variant: 'destructive' });
        }
    };

    // Discover URL handler for compliance websites
    const handleDiscoverUrl = async () => {
        if (!selectedKb || !newDocContent) return;
        
        setLoading(true);
        try {
            const result = await discoverUrlAction({
                knowledgeBaseId: selectedKb,
                url: newDocContent,
                title: newDocTitle || 'Discovered Content'
            });
            
            if (result.success) {
                toast({ title: 'Success', description: 'URL discovered and indexed.' });
                setIsAddDocOpen(false);
                setNewDocTitle('');
                setNewDocContent('');
                loadDocuments(selectedKb);
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to discover URL', variant: 'destructive' });
        } finally {
            setLoading(false);
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
                        <>
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
                                                Add text, upload files, or discover URLs. Content will be vectorized for semantic search.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <Tabs defaultValue="text" onValueChange={setNewDocType}>
                                                <TabsList className="grid w-full grid-cols-3">
                                                    <TabsTrigger value="text" className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4" /> Paste Text
                                                    </TabsTrigger>
                                                    <TabsTrigger value="file" className="flex items-center gap-2">
                                                        <Upload className="w-4 h-4" /> Upload File
                                                    </TabsTrigger>
                                                    <TabsTrigger value="link" className="flex items-center gap-2">
                                                        <Globe className="w-4 h-4" /> Discover URL
                                                    </TabsTrigger>
                                                </TabsList>

                                                <div className="space-y-4 pt-4">
                                                    <div className="space-y-2">
                                                        <Label>Title</Label>
                                                        <Input
                                                            value={newDocTitle}
                                                            onChange={e => setNewDocTitle(e.target.value)}
                                                            placeholder="e.g. Illinois Cannabis Compliance Guide"
                                                        />
                                                    </div>

                                                    <TabsContent value="text" className="mt-0">
                                                        <div className="space-y-2">
                                                            <Label>Content</Label>
                                                            <Textarea
                                                                value={newDocContent}
                                                                onChange={e => setNewDocContent(e.target.value)}
                                                                className="min-h-[200px]"
                                                                placeholder="Paste compliance rules, SOPs, regulations, or any training content here..."
                                                            />
                                                        </div>
                                                    </TabsContent>

                                                    <TabsContent value="file" className="mt-0">
                                                        <div className="space-y-4">
                                                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                                                                <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                                                <p className="text-sm text-slate-600 mb-2">
                                                                    {uploadedFile ? uploadedFile.name : 'Click to upload or drag & drop'}
                                                                </p>
                                                                <p className="text-xs text-slate-400">
                                                                    Supports .txt, .md, .json files
                                                                </p>
                                                                <input
                                                                    ref={fileInputRef}
                                                                    type="file"
                                                                    accept=".txt,.md,.json"
                                                                    onChange={handleFileUpload}
                                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                    style={{ position: 'absolute', left: 0, top: 0 }}
                                                                />
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    className="mt-3"
                                                                    onClick={() => fileInputRef.current?.click()}
                                                                >
                                                                    Select File
                                                                </Button>
                                                            </div>
                                                            {newDocContent && (
                                                                <div className="bg-slate-50 p-3 rounded-md">
                                                                    <Label className="text-xs text-slate-500">Preview ({newDocContent.length} chars)</Label>
                                                                    <p className="text-xs text-slate-600 truncate mt-1">{newDocContent.slice(0, 200)}...</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TabsContent>

                                                    <TabsContent value="link" className="mt-0">
                                                        <div className="space-y-4">
                                                            <div className="space-y-2">
                                                                <Label>URL to Discover</Label>
                                                                <Input
                                                                    value={newDocContent}
                                                                    onChange={e => setNewDocContent(e.target.value)}
                                                                    placeholder="https://www.idfpr.com/profs/cannabis.asp"
                                                                />
                                                                <p className="text-xs text-slate-500">
                                                                    Paste a state compliance website URL. The content will be extracted and indexed.
                                                                </p>
                                                            </div>
                                                            <div className="bg-blue-50 p-3 rounded-md">
                                                                <p className="text-xs text-blue-700 font-medium">💡 Recommended Compliance Sources:</p>
                                                                <ul className="text-xs text-blue-600 mt-2 space-y-1">
                                                                    <li>• State Cannabis Control Boards</li>
                                                                    <li>• Department of Health Cannabis Divisions</li>
                                                                    <li>• Official state cannabis licensing portals</li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </TabsContent>
                                                </div>
                                            </Tabs>
                                        </div>
                                        <DialogFooter className="flex gap-2">
                                            {newDocType === 'link' ? (
                                                <Button onClick={handleDiscoverUrl} disabled={loading || !newDocContent}>
                                                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                    <Globe className="w-4 h-4 mr-2" />
                                                    Discover & Index
                                                </Button>
                                            ) : (
                                                <Button onClick={handleAddDocument} disabled={loading || !newDocContent}>
                                                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                    Index Document
                                                </Button>
                                            )}
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
                                                    <TableCell className="text-xs text-muted-foreground" suppressHydrationWarning>
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

                        {/* Compliance Discovery - Proactive Agent Search */}
                        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-emerald-800">
                                            <RefreshCw className="w-5 h-5" />
                                            Compliance Discovery
                                        </CardTitle>
                                        <CardDescription className="text-emerald-600">
                                            Let Deebo proactively search for new compliance data
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Input 
                                        placeholder="e.g. Illinois cannabis advertising rules 2024"
                                        className="flex-1 bg-white"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleComplianceSearch(searchQuery)}
                                    />
                                    <Button 
                                        variant="outline" 
                                        className="bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-700"
                                        onClick={() => handleComplianceSearch(searchQuery)}
                                        disabled={isSearching || !searchQuery}
                                    >
                                        {isSearching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                                        Search
                                    </Button>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3">
                                    <Button variant="outline" size="sm" className="bg-white text-xs hover:bg-emerald-50" onClick={() => handleComplianceSearch("Illinois cannabis licensing rules", "IL")}>
                                        🌿 IL Licensing Rules
                                    </Button>
                                    <Button variant="outline" size="sm" className="bg-white text-xs hover:bg-emerald-50" onClick={() => handleComplianceSearch("California cannabis advertising guidelines", "CA")}>
                                        🌿 CA Ad Guidelines
                                    </Button>
                                    <Button variant="outline" size="sm" className="bg-white text-xs hover:bg-emerald-50" onClick={() => handleComplianceSearch("Michigan cannabis testing requirements", "MI")}>
                                        🌿 MI Lab Testing Reqs
                                    </Button>
                                </div>

                                {searchResults.length > 0 ? (
                                    <div className="space-y-3 mt-4">
                                        <h4 className="text-sm font-medium text-emerald-800">Search Results</h4>
                                        <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
                                            {searchResults.map((result, i) => (
                                                <div key={i} className="bg-white p-3 rounded-md border border-emerald-100 shadow-sm">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div>
                                                            <h5 className="font-medium text-sm text-slate-800">{result.title}</h5>
                                                            <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                                                                <Globe className="w-3 h-3" /> {result.source}
                                                            </a>
                                                            <p className="text-xs text-slate-600 mt-2 line-clamp-2">{result.snippet}</p>
                                                        </div>
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleAddToQueue(result)}>
                                                            <Plus className="w-4 h-4 text-emerald-600" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white/60 p-3 rounded-md border border-emerald-100">
                                        <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium mb-2">
                                            <CheckCircle className="w-4 h-4" />
                                            Agent Discovery Queue
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Deebo will periodically search for updated compliance information and surface it here for your approval before indexing.
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-2">
                                            Coming soon: Automatic weekly compliance scans across all operating states.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
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
