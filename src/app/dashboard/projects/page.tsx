import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FolderKanban, MessageSquare, FileText } from "lucide-react";
import { getProjects } from "@/server/actions/projects";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { NewProjectButton } from "./components/new-project-button";

export default async function ProjectsPage() {
    const projects = await getProjects();

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                    <p className="text-muted-foreground">
                        Organize your AI chats with dedicated context and instructions.
                    </p>
                </div>
                <NewProjectButton />
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search projects..." 
                    className="pl-10"
                />
            </div>

            {/* Projects Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* New Project Card */}
                <NewProjectButton asCard />

                {/* Project Cards */}
                {projects.map((project) => (
                    <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                        <Card 
                            className="hover:border-primary/50 transition-colors cursor-pointer h-full"
                            style={{ borderLeftColor: project.color, borderLeftWidth: '4px' }}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FolderKanban 
                                        className="h-4 w-4" 
                                        style={{ color: project.color }}
                                    />
                                    {project.name}
                                </CardTitle>
                                <CardDescription className="line-clamp-2 text-xs">
                                    {project.systemInstructions 
                                        ? project.systemInstructions.slice(0, 120) + (project.systemInstructions.length > 120 ? '...' : '')
                                        : project.description || 'No description'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" />
                                        {project.chatCount} chats
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        {project.documentCount} files
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Updated {formatDistanceToNow(project.updatedAt, { addSuffix: true })}
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}

                {projects.length === 0 && (
                    <div className="col-span-full py-10 text-center text-muted-foreground">
                        No projects yet. Create one to get started!
                    </div>
                )}
            </div>
        </div>
    );
}
