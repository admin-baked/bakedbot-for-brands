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
    CreateProjectInput,
    UpdateProjectInput,
    CreateProjectSchema,
    UpdateProjectSchema,
    PROJECT_LIMITS,
    PROJECT_COLORS,
} from '@/types/project';
import { requireUser } from '@/server/auth/auth';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

// --- Firestore Helpers ---

function getDb() {
    return getAdminFirestore();
}

const PROJECTS_COLLECTION = 'projects';
const PROJECT_CHATS_COLLECTION = 'project_chats';
const PROJECT_DOCUMENTS_COLLECTION = 'project_documents';

// --- Type Converters ---

function toProjectDate(value: unknown): Date {
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
        const date = value.toDate();
        return date instanceof Date && Number.isFinite(date.getTime()) ? date : new Date();
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return Number.isFinite(date.getTime()) ? date : new Date();
    }
    return new Date();
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function isMissingIndexError(error: unknown): boolean {
    const err = error as { code?: unknown; message?: unknown };
    return err.code === 9 || String(err.message ?? '').toLowerCase().includes('index');
}

function projectFromFirestore(doc: FirebaseFirestore.DocumentSnapshot): Project | null {
    if (!doc.exists) return null;
    const data = doc.data()!;
    const archivedAt = data.archivedAt ? toProjectDate(data.archivedAt) : undefined;

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
        createdAt: toProjectDate(data.createdAt),
        updatedAt: toProjectDate(data.updatedAt),
        lastChatAt: data.lastChatAt ? toProjectDate(data.lastChatAt) : undefined,
        isShared: data.isShared || false,
        sharedWith: data.sharedWith || [],
        isArchived: data.isArchived === true || data.status === 'archived' || Boolean(archivedAt),
        archivedAt,
    };
}

function chatFromFirestore(doc: FirebaseFirestore.DocumentSnapshot): ProjectChat | null {
    if (!doc.exists) return null;
    const data = doc.data()!;
    
    return {
        id: doc.id,
        projectId: data.projectId,
        userId: data.userId,
        title: data.title || 'Untitled Chat',
        messageCount: data.messageCount || 0,
        createdAt: toProjectDate(data.createdAt),
        updatedAt: toProjectDate(data.updatedAt),
    };
}

function canReadProject(project: Project, userId: string): boolean {
    return project.ownerId === userId
        || project.isShared === true
        || (Array.isArray(project.sharedWith) && project.sharedWith.includes(userId));
}

function canWriteProject(project: Project, userId: string): boolean {
    return project.ownerId === userId && project.isArchived !== true;
}

function sortProjects(projects: Project[]): Project[] {
    return [...projects].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

function uniqueActiveProjects(projectGroups: Project[][]): Project[] {
    const byId = new Map<string, Project>();

    projectGroups.flat().forEach((project) => {
        if (!project.isArchived) {
            byId.set(project.id, project);
        }
    });

    return sortProjects(Array.from(byId.values()));
}

async function runProjectsQuery(
    baseQuery: FirebaseFirestore.Query,
    label: string,
): Promise<Project[]> {
    try {
        const snapshot = await baseQuery.orderBy('updatedAt', 'desc').get();
        return snapshot.docs
            .map(doc => projectFromFirestore(doc))
            .filter((p): p is Project => p !== null);
    } catch (error) {
        if (!isMissingIndexError(error)) {
            throw error;
        }

        logger.warn('[projects] Missing index, falling back to in-memory sort', {
            label,
            error: getErrorMessage(error),
        });

        const snapshot = await baseQuery.get();
        const projects = snapshot.docs
            .map(doc => projectFromFirestore(doc))
            .filter((p): p is Project => p !== null);

        return sortProjects(projects);
    }
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
        isShared: false,
        sharedWith: [],
        isArchived: false,
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
        const collection = db.collection(PROJECTS_COLLECTION);

        const [ownedProjects, sharedProjects, directlySharedProjects] = await Promise.all([
            runProjectsQuery(collection.where('ownerId', '==', user.uid), 'owned'),
            runProjectsQuery(collection.where('isShared', '==', true), 'shared'),
            runProjectsQuery(collection.where('sharedWith', 'array-contains', user.uid), 'sharedWith'),
        ]);

        return uniqueActiveProjects([ownedProjects, sharedProjects, directlySharedProjects]);
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        if (message.includes('Unauthorized') || message.includes('No session')) {
            logger.info('[projects] User not authenticated, returning empty projects');
            return [];
        }

        logger.error('[projects] Failed to get projects', { error: message });
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

        if (project && (!canReadProject(project, user.uid) || project.isArchived)) {
            return null;
        }

        return project;
    } catch (error: unknown) {
        logger.error('[projects] Failed to get project', {
            projectId,
            error: getErrorMessage(error),
        });
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
    
    const existing = await projectRef.get();
    const existingProject = projectFromFirestore(existing);
    if (!existingProject || !canWriteProject(existingProject, user.uid)) {
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
 * Duplicate a readable project into the current user's workspace.
 * Copies configuration only; documents and chat history stay with the source project.
 */
export async function duplicateProject(projectId: string): Promise<Project | null> {
    const user = await requireUser();
    const db = getDb();

    const sourceRef = db.collection(PROJECTS_COLLECTION).doc(projectId);
    const sourceDoc = await sourceRef.get();
    const source = projectFromFirestore(sourceDoc);

    if (!source || !canReadProject(source, user.uid) || source.isArchived) {
        return null;
    }

    const copyRef = db.collection(PROJECTS_COLLECTION).doc();
    const now = Timestamp.now();
    const copyData = {
        ownerId: user.uid,
        name: `${source.name} Copy`.slice(0, 100),
        description: source.description || '',
        systemInstructions: source.systemInstructions || '',
        color: source.color || PROJECT_COLORS[0],
        icon: source.icon || 'Briefcase',
        defaultModel: source.defaultModel || 'lite',
        documentCount: 0,
        totalBytes: 0,
        chatCount: 0,
        isShared: false,
        sharedWith: [],
        isArchived: false,
        sourceProjectId: source.id,
        createdAt: now,
        updatedAt: now,
    };

    await copyRef.set(copyData);

    logger.info('[projects] Project duplicated', {
        sourceProjectId: source.id,
        projectId: copyRef.id,
        uid: user.uid,
    });

    revalidatePath('/dashboard/projects');

    return {
        id: copyRef.id,
        ...copyData,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
    };
}

/**
 * Soft archive a project owned by the current user.
 */
export async function archiveProject(projectId: string): Promise<boolean> {
    const user = await requireUser();
    const db = getDb();

    const projectRef = db.collection(PROJECTS_COLLECTION).doc(projectId);
    const existing = await projectRef.get();
    const project = projectFromFirestore(existing);

    if (!project || !canWriteProject(project, user.uid)) {
        return false;
    }

    await projectRef.update({
        isArchived: true,
        status: 'archived',
        archivedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });

    logger.info('[projects] Project archived', {
        projectId,
        uid: user.uid,
    });

    revalidatePath('/dashboard/projects');
    revalidatePath(`/dashboard/projects/${projectId}`);

    return true;
}

/**
 * Delete a project and all associated data
 */
export async function deleteProject(projectId: string): Promise<boolean> {
    const user = await requireUser();
    const db = getDb();
    
    const projectRef = db.collection(PROJECTS_COLLECTION).doc(projectId);
    const existing = await projectRef.get();
    
    const existingProject = projectFromFirestore(existing);
    if (!existingProject || !canWriteProject(existingProject, user.uid)) {
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
    
    const activeCount = snapshot.docs
        .map(doc => projectFromFirestore(doc))
        .filter((p): p is Project => p !== null && !p.isArchived)
        .length;

    return activeCount < limits.maxProjects;
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
    
    return snapshot.docs
        .map(doc => projectFromFirestore(doc))
        .filter((p): p is Project => p !== null && !p.isArchived)
        .length;
}
