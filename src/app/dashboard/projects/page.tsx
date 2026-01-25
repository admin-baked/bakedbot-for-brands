export const dynamic = 'force-dynamic';

import { getProjects } from "@/server/actions/projects";
import { requireUser } from "@/server/auth/auth";
import { ProjectsPageClient } from "./page-client";

export default async function ProjectsPage() {
    const [projects, user] = await Promise.all([
        getProjects(),
        requireUser(),
    ]);

    return (
        <ProjectsPageClient
            projects={projects}
            currentUserId={user.uid}
        />
    );
}
