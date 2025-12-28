import { notFound } from "next/navigation";
import { getProject, getProjectChats } from "@/server/actions/projects";
import { ProjectDetailView } from "./components/project-detail-view";

interface ProjectPageProps {
    params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
    const { projectId } = await params;
    
    const [project, chats] = await Promise.all([
        getProject(projectId),
        getProjectChats(projectId),
    ]);

    if (!project) {
        notFound();
    }

    return <ProjectDetailView project={project} chats={chats} />;
}
