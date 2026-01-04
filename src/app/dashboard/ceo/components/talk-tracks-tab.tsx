'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { MessageSquare, Plus, Search, Edit2, Play, Loader2 } from 'lucide-react';
import { TalkTrack } from '@/types/talk-track';
import { getTalkTracksAction, saveTalkTrackAction } from '@/server/actions/talk-tracks';
import { useToast } from '@/hooks/use-toast';

export default function TalkTracksTab() {
    const [tracks, setTracks] = useState<TalkTrack[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTrack, setSelectedTrack] = useState<TalkTrack | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    // Fetch tracks on mount
    useEffect(() => {
        loadTracks();
    }, []);

    const loadTracks = async () => {
        setIsLoading(true);
        const res = await getTalkTracksAction();
        if (res.success && res.data) {
            setTracks(res.data);
        }
        setIsLoading(false);
    };

    const handleSave = async () => {
        if (!selectedTrack) return;
        setIsSaving(true);
        
        // Ensure steps exist
        const trackToSave = {
            ...selectedTrack,
            steps: selectedTrack.steps.length > 0 ? selectedTrack.steps : [{
                id: 'step-1',
                order: 1,
                type: 'response',
                message: 'Hello!',
                thought: 'Thinking...'
            }]
        };

        const res = await saveTalkTrackAction(trackToSave as TalkTrack);
        
        setIsSaving(false);
        if (res.success) {
            toast({ title: 'Saved successfully' });
            setSelectedTrack(null);
            loadTracks();
        } else {
            toast({ title: 'Failed to save', variant: 'destructive' });
        }
    };

    const filteredTracks = tracks.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.triggerKeywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const openNewTrack = () => {
        setSelectedTrack({
            id: '',
            name: 'New Talk Track',
            role: 'dispensary',
            triggerKeywords: [],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'admin',
            steps: [{
                id: 'step-1',
                order: 1,
                type: 'question',
                thought: "I noticed you're asking about...",
                message: "How can I help you today?"
            }]
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Talk Tracks (Live Scripts)</h2>
                    <p className="text-muted-foreground">Manage the conversational scripts used in the Agent Playground.</p>
                </div>
                <Button onClick={openNewTrack}>
                    <Plus className="mr-2 h-4 w-4" /> New Track
                </Button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 max-w-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search tracks or keywords..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Grid */}
            {isLoading ? (
                 <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                 </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTracks.map(track => (
                        <Card key={track.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedTrack(track)}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <Badge variant="outline" className="mb-2 uppercase text-xs">{track.role}</Badge>
                                    {track.isActive && <div className="h-2 w-2 rounded-full bg-green-500" />}
                                </div>
                                <CardTitle className="text-lg">{track.name}</CardTitle>
                                <CardDescription className="line-clamp-2">
                                    Triggers: {track.triggerKeywords.join(', ')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm border rounded-md p-2 bg-muted/30 italic text-muted-foreground line-clamp-3">
                                    "{track.steps[0]?.message}"
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!selectedTrack} onOpenChange={(open) => !open && setSelectedTrack(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedTrack?.id ? 'Edit Talk Track' : 'Create Talk Track'}</DialogTitle>
                        <DialogDescription>
                            Define the triggers and the scripted response for the agent.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTrack && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Name</label>
                                    <Input 
                                        value={selectedTrack.name} 
                                        onChange={e => setSelectedTrack({...selectedTrack, name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Role Target</label>
                                    <select 
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={selectedTrack.role}
                                        onChange={e => setSelectedTrack({...selectedTrack, role: e.target.value as any})}
                                    >
                                        <option value="dispensary">Dispensary</option>
                                        <option value="brand">Brand</option>
                                        <option value="customer">Customer</option>
                                        <option value="all">All Roles</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Trigger Keywords (Comma separated)</label>
                                <Input 
                                    value={selectedTrack.triggerKeywords.join(', ')} 
                                    onChange={e => setSelectedTrack({
                                        ...selectedTrack, 
                                        triggerKeywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                    })}
                                    placeholder="e.g. scrape menu, find competitor"
                                />
                            </div>
                            
                             <div className="flex items-center space-x-2">
                                <Switch 
                                    checked={selectedTrack.isActive} 
                                    onCheckedChange={checked => setSelectedTrack({...selectedTrack, isActive: checked})}
                                />
                                <label className="text-sm font-medium">Active</label>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" /> Script Content (Step 1)
                                </h3>
                                
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium uppercase text-muted-foreground">Episodic Thought (Internal Monologue)</label>
                                        <Textarea 
                                            className="min-h-[80px] font-mono text-sm bg-slate-50"
                                            value={selectedTrack.steps[0]?.thought || ''}
                                            onChange={e => {
                                                const newSteps = [...selectedTrack.steps];
                                                if (!newSteps[0]) newSteps[0] = { id: '1', order: 1, type: 'response', message: '' };
                                                newSteps[0].thought = e.target.value;
                                                setSelectedTrack({...selectedTrack, steps: newSteps});
                                            }}
                                            placeholder="Example: I see the user wants X. I should verify Y first..."
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium uppercase text-muted-foreground">Agent Response (Markdown Supported)</label>
                                        <Textarea 
                                            className="min-h-[150px] text-base"
                                            value={selectedTrack.steps[0]?.message || ''}
                                            onChange={e => {
                                                const newSteps = [...selectedTrack.steps];
                                                if (!newSteps[0]) newSteps[0] = { id: '1', order: 1, type: 'response', message: '' };
                                                newSteps[0].message = e.target.value;
                                                setSelectedTrack({...selectedTrack, steps: newSteps});
                                            }}
                                            placeholder="Hello! How can I help you?"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedTrack(null)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
