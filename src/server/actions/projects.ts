'use server';

/**
 * Project Server Actions
 * 
 * CRUD operations for Projects - enhanced knowledge bases with
 * system instructions and chat history.
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { 
    Project, 
    ProjectChat,
    ProjectDocument,
    CreateProjectInput, 
    UpdateProjectInput,
    CreateProjectSchema,
    UpdateProjectSchema,
    PROJECT_LIMITS,
    PROJECT_COLORS,
} from '@/types/project';
import { requireUser } from '@/server/auth/auth';
import { revalidatePath } from 'next/cache';

// --- Firestore Helpers ---

function getDb() {
    return getAdminFirestore();
}

const PROJECTS_COLLECTION = 'projects';
const PROJECT_CHATS_COLLECTION = 'project_chats';
const PROJECT_DOCUMENTS_COLLECTION = 'project_documents';

// --- Type Converters ---

function projectFromFirestore(doc: FirebaseFirestore.DocumentSnapshot): Project | null {
    if (!doc.exists) return null;
    const data = doc.data()!;
    
    // Safety check for timestamps
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
    const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date();
    const lastChatAt = data.lastChatAt instanceof Timestamp ? data.lastChatAt.toDate() : undefined;

    return {
        id: doc.id,
        ownerId: data.ownerId,
        name: data.name || 'Untitled Project',
        description: data.description || '',
        systemInstructions: data.systemInstructions,
        color: data.color || PROJECT_COLORS[0],
        icon: data.icon || 'Briefcase',
        defaultModel: data.defaultModel || 'lite',
        documentCount: data.documentCount || 0,
        totalBytes: data.totalBytes || 0,
        chatCount: data.chatCount || 0,
        createdAt,
        updatedAt,
        lastChatAt,
        isShared: data.isShared || false,
        sharedWith: data.sharedWith || [],
    };
}

function chatFromFirestore(doc: FirebaseFirestore.DocumentSnapshot): ProjectChat | null {
    if (!doc.exists) return null;
    const data = doc.data()!;
    
    // Safety check for timestamps
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
    const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date();

    return {
        id: doc.id,
        projectId: data.projectId,
        userId: data.userId,
        title: data.title || 'Untitled Chat',
        messageCount: data.messageCount || 0,
        createdAt,
        updatedAt,
    };
}

// --- CRUD Operations ---

/**
 * Create a new project
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
    const user = await requireUser();
    const validated = CreateProjectSchema.parse(input);
    
    const db = getDb();
    const projectRef = db.collection(PROJECTS_COLLECTION).doc();
    
    // Assign a random color if not provided
    const color = validated.color || PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
    
    const projectData = {
        ownerId: user.uid,
        name: validated.name,
        description: validated.description || '',
        systemInstructions: validated.systemInstructions || '',
        color,
        icon: validated.icon || 'Briefcase',
        defaultModel: validated.defaultModel || 'lite',
        documentCount: 0,
        totalBytes: 0,
        chatCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };
    
    await projectRef.set(projectData);
    
    revalidatePath('/dashboard/projects');
    
    return {
        id: projectRef.id,
        ...projectData,
        createdAt: projectData.createdAt.toDate(),
        updatedAt: projectData.updatedAt.toDate(),
    };
}

/**
 * Get all projects for the current user
 */
export async function getProjects(): Promise<Project[]> {
    try {
        const user = await requireUser();
        const db = getDb();

        const snapshot = await db.collection(PROJECTS_COLLECTION)
            .where('ownerId', '==', user.uid)
            .orderBy('updatedAt', 'desc')
            .get();

        return snapshot.docs
            .map(doc => projectFromFirestore(doc))
            .filter((p): p is Project => p !== null);
    } catch (error: any) {
        // Handle auth errors gracefully - return empty array
        if (error?.message?.includes('Unauthorized') || error?.message?.includes('No session')) {
            console.log('[projects] User not authenticated, returning empty projects');
            return [];
        }
        // Handle missing composite index by falling back to unordered query
        if (error?.code === 9 || error?.message?.includes('index')) {
            console.error('Projects index missing, falling back to unordered query:', error.message);
            try {
                const user = await requireUser();
                const db = getDb();
                const snapshot = await db.collection(PROJECTS_COLLECTION)
                    .where('ownerId', '==', user.uid)
                    .get();

                const projects = snapshot.docs
                    .map(doc => projectFromFirestore(doc))
                    .filter((p): p is Project => p !== null);

                // Sort in memory
                return projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
            } catch {
                return [];
            }
        }
        console.error('Failed to get projects:', error);
        return [];
    }
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
    try {
        const user = await requireUser();
        const db = getDb();

        const doc = await db.collection(PROJECTS_COLLECTION).doc(projectId).get();
        const project = projectFromFirestore(doc);

        // Verify ownership
        if (project && project.ownerId !== user.uid) {
            return null;
        }

        return project;
    } catch (error: any) {
        console.error('Failed to get project:', error);
        return null;
    }
}

/**
 * Update a project
 */
export async function updateProject(input: UpdateProjectInput): Promise<Project | null> {
    const user = await requireUser();
    const validated = UpdateProjectSchema.parse(input);
    
    const db = getDb();
    const projectRef = db.collection(PROJECTS_COLLECTION).doc(validated.projectId);
    
    // Verify ownership
    const existing = await projectRef.get();
    if (!existing.exists || existing.data()?.ownerId !== user.uid) {
        return null;
    }
    
    const updates: Record<string, any> = {
        updatedAt: Timestamp.now(),
    };
    
    if (validated.name !== undefined) updates.name = validated.name;
    if (validated.description !== undefined) updates.description = validated.description;
    if (validated.systemInstructions !== undefined) updates.systemInstructions = validated.systemInstructions;
    if (validated.color !== undefined) updates.color = validated.color;
    if (validated.icon !== undefined) updates.icon = validated.icon;
    if (validated.defaultModel !== undefined) updates.defaultModel = validated.defaultModel;
    
    await projectRef.update(updates);
    
    revalidatePath('/dashboard/projects');
    revalidatePath(`/dashboard/projects/${validated.projectId}`);
    
    return getProject(validated.projectId);
}

/**
 * Delete a project and all associated data
 */
export async function deleteProject(projectId: string): Promise<boolean> {
    const user = await requireUser();
    const db = getDb();
    
    const projectRef = db.collection(PROJECTS_COLLECTION).doc(projectId);
    const existing = await projectRef.get();
    
    if (!existing.exists || existing.data()?.ownerId !== user.uid) {
        return false;
    }
    
    // Delete associated chats
    const chatsSnapshot = await db.collection(PROJECT_CHATS_COLLECTION)
        .where('projectId', '==', projectId)
        .get();
    
    const batch = db.batch();
    chatsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete associated documents
    const docsSnapshot = await db.collection(PROJECT_DOCUMENTS_COLLECTION)
        .where('projectId', '==', projectId)
        .get();
    
    docsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete the project
    batch.delete(projectRef);
    
    await batch.commit();
    
    revalidatePath('/dashboard/projects');
    
    return true;
}

// --- Chat Operations ---

/**
 * Create a new chat in a project
 */
export async function createProjectChat(projectId: string, title?: string): Promise<ProjectChat> {
    const user = await requireUser();
    const db = getDb();
    
    // Verify project ownership
    const project = await getProject(projectId);
    if (!project) {
        throw new Error('Project not found');
    }
    
    const chatRef = db.collection(PROJECT_CHATS_COLLECTION).doc();
    
    const chatData = {
        projectId,
        userId: user.uid,
        title: title || 'New Chat',
        messageCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };
    
    await chatRef.set(chatData);
    
    // Update project chat count and lastChatAt
    await db.collection(PROJECTS_COLLECTION).doc(projectId).update({
        chatCount: FieldValue.increment(1),
        lastChatAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });
    
    return {
        id: chatRef.id,
        ...chatData,
        createdAt: chatData.createdAt.toDate(),
        updatedAt: chatData.updatedAt.toDate(),
    };
}

/**
 * Get all chats for a project
 */
export async function getProjectChats(projectId: string): Promise<ProjectChat[]> {
    const user = await requireUser();
    const db = getDb();
    
    // Verify project ownership
    const project = await getProject(projectId);
    if (!project) {
        return [];
    }
    
    const snapshot = await db.collection(PROJECT_CHATS_COLLECTION)
        .where('projectId', '==', projectId)
        .where('userId', '==', user.uid)
        .orderBy('updatedAt', 'desc')
        .get();
    
    return snapshot.docs
        .map(doc => chatFromFirestore(doc))
        .filter((c): c is ProjectChat => c !== null);
}

/**
 * Update chat title
 */
export async function updateProjectChatTitle(chatId: string, title: string): Promise<void> {
    const user = await requireUser();
    const db = getDb();
    
    const chatRef = db.collection(PROJECT_CHATS_COLLECTION).doc(chatId);
    const chat = await chatRef.get();
    
    if (!chat.exists || chat.data()?.userId !== user.uid) {
        throw new Error('Chat not found');
    }
    
    await chatRef.update({
        title,
        updatedAt: Timestamp.now(),
    });
}

// --- Usage Helpers ---

/**
 * Check if user can create more projects based on their plan
 */
export async function canCreateProject(userPlan: string = 'free'): Promise<boolean> {
    const user = await requireUser();
    const db = getDb();
    
    const limits = PROJECT_LIMITS[userPlan] || PROJECT_LIMITS.free;
    
    const snapshot = await db.collection(PROJECTS_COLLECTION)
        .where('ownerId', '==', user.uid)
        .get();
    
    return snapshot.size < limits.maxProjects;
}

/**
 * Get project count for user
 */
export async function getProjectCount(): Promise<number> {
    const user = await requireUser();
    const db = getDb();
    
    const snapshot = await db.collection(PROJECTS_COLLECTION)
        .where('ownerId', '==', user.uid)
        .get();
    
    return snapshot.size;
}
