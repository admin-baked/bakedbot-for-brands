'use client';

import { useState, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { createProject } from "@/server/actions/projects";
import { PROJECT_COLORS } from "@/types/project";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface NewProjectButtonProps {
    asCard?: boolean;
    baseUrl?: string;
}

export function NewProjectButton({ asCard = false, baseUrl = "/dashboard/projects" }: NewProjectButtonProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [systemInstructions, setSystemInstructions] = useState('');
    const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);
    const router = useRouter();
    const { toast } = useToast();

    const handleCreate = () => {
        if (!name.trim()) return;

        startTransition(async () => {
            try {
                const project = await createProject({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    systemInstructions: systemInstructions.trim() || undefined,
                    color: selectedColor,
                });

                toast({
                    title: "Project created",
                    description: `"${project.name}" is ready to use.`,
                });

                setOpen(false);
                setName('');
                setDescription('');
                setSystemInstructions('');
                
                router.push(`${baseUrl}/${project.id}`);
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Failed to create project",
                    description: error instanceof Error ? error.message : "Please try again.",
                });
            }
        });
    };

    const trigger = asCard ? (
        <Card className="border-dashed border-2 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer group h-full min-h-[160px]">
            <CardContent className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Plus className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">New Project</h3>
                <p className="text-xs text-muted-foreground">
                    Create a focused workspace with custom instructions
                </p>
            </CardContent>
        </Card>
    ) : (
        <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New project
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Create New Project
                    </DialogTitle>
                    <DialogDescription>
                        Projects let you organize chats with dedicated context and custom AI instructions.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Project Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g., Marketing Strategy, Product Launch"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (optional)</Label>
                        <Input
                            id="description"
                            placeholder="Brief description of this project"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="instructions">System Instructions (optional)</Label>
                        <Textarea
                            id="instructions"
                            placeholder="Custom instructions for the AI when working in this project..."
                            value={systemInstructions}
                            onChange={(e) => setSystemInstructions(e.target.value)}
                            rows={4}
                        />
                        <p className="text-xs text-muted-foreground">
                            These instructions will be included in every chat within this project.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex gap-2 flex-wrap">
                            {PROJECT_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setSelectedColor(color)}
                                    className={`h-6 w-6 rounded-full transition-all ${
                                        selectedColor === color 
                                            ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                                            : 'hover:scale-110'
                                    }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={!name.trim() || isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Project'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
