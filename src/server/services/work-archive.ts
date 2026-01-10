/**
 * Work Archive Service
 * 
 * Archives work artifacts so agents understand historical context before making changes.
 * Stores in dev/work_archive/ and indexes to Letta archival memory.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '@/lib/logger';

const execAsync = promisify(exec);
const PROJECT_ROOT = process.cwd();
const ARCHIVE_DIR = path.join(PROJECT_ROOT, 'dev/work_archive');

// ============================================================================
// TYPES
// ============================================================================

export interface WorkArtifact {
    id: string;
    timestamp: string;
    agentId: string;
    type: 'feature' | 'bugfix' | 'refactor' | 'docs' | 'test' | 'chore';
    
    // What changed
    filesChanged: string[];
    summary: string;
    commitHash?: string;
    
    // Why it changed
    reasoning: string;
    relatedIssue?: string;
    
    // Dependencies
    dependenciesAdded?: string[];
    dependenciesRemoved?: string[];
    dependenciesAffected?: string[];
    
    // Testing
    testsAdded?: string[];
    testsModified?: string[];
    testsPassing?: boolean;
    
    // Context
    decisions: string[];
    warnings?: string[];
    
    // References
    progressLogEntry?: string;
}

export interface WorkArchiveIndex {
    lastUpdated: string;
    artifactCount: number;
    artifacts: {
        id: string;
        timestamp: string;
        summary: string;
        files: string[];
    }[];
}

// ============================================================================
// ARCHIVE OPERATIONS
// ============================================================================

/**
 * Ensure the work archive directory exists.
 */
async function ensureArchiveDir(): Promise<void> {
    try {
        await fs.access(ARCHIVE_DIR);
    } catch {
        await fs.mkdir(ARCHIVE_DIR, { recursive: true });
        logger.info('[WorkArchive] Created work archive directory');
    }
}

/**
 * Generate a unique artifact ID based on date and summary.
 */
function generateArtifactId(summary: string): string {
    const date = new Date().toISOString().split('T')[0];
    const slug = summary
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .substring(0, 50)
        .replace(/-+$/, '');
    return `${date}_${slug}`;
}

/**
 * Archive a work artifact.
 */
export async function archiveWork(artifact: Omit<WorkArtifact, 'id' | 'timestamp'>): Promise<WorkArtifact> {
    await ensureArchiveDir();
    
    const fullArtifact: WorkArtifact = {
        ...artifact,
        id: generateArtifactId(artifact.summary),
        timestamp: new Date().toISOString(),
    };
    
    // Write artifact file
    const artifactPath = path.join(ARCHIVE_DIR, `${fullArtifact.id}.json`);
    await fs.writeFile(artifactPath, JSON.stringify(fullArtifact, null, 2));
    
    // Update index
    await updateIndex(fullArtifact);
    
    // Optionally save to Letta archival memory for semantic search
    try {
        const { commonMemoryTools } = await import('@/app/dashboard/ceo/agents/default-tools');
        await commonMemoryTools.lettaSaveFact(
            `Work artifact: ${fullArtifact.summary}. Files: ${fullArtifact.filesChanged.join(', ')}. Decisions: ${fullArtifact.decisions.join('; ')}`,
            'work_artifact'
        );
    } catch (e) {
        logger.warn(`[WorkArchive] Could not save to Letta memory: ${(e as Error).message}`);
    }
    
    logger.info(`[WorkArchive] Archived: ${fullArtifact.id}`);
    return fullArtifact;
}

/**
 * Update the index file.
 */
async function updateIndex(artifact: WorkArtifact): Promise<void> {
    const indexPath = path.join(ARCHIVE_DIR, 'index.json');
    let index: WorkArchiveIndex;
    
    try {
        const content = await fs.readFile(indexPath, 'utf-8');
        index = JSON.parse(content);
    } catch {
        index = { lastUpdated: '', artifactCount: 0, artifacts: [] };
    }
    
    // Add new artifact to index (at start for recency)
    index.artifacts.unshift({
        id: artifact.id,
        timestamp: artifact.timestamp,
        summary: artifact.summary,
        files: artifact.filesChanged,
    });
    
    // Keep last 100 artifacts in index
    index.artifacts = index.artifacts.slice(0, 100);
    index.artifactCount = index.artifacts.length;
    index.lastUpdated = new Date().toISOString();
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Query work history for a file or topic.
 */
export async function queryWorkHistory(query: string, lookbackDays: number = 30): Promise<WorkArtifact[]> {
    await ensureArchiveDir();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
    
    const files = await fs.readdir(ARCHIVE_DIR);
    const artifacts: WorkArtifact[] = [];
    
    for (const file of files) {
        if (!file.endsWith('.json') || file === 'index.json') continue;
        
        try {
            const content = await fs.readFile(path.join(ARCHIVE_DIR, file), 'utf-8');
            const artifact: WorkArtifact = JSON.parse(content);
            
            // Check if within lookback period
            if (new Date(artifact.timestamp) < cutoffDate) continue;
            
            // Check if matches query (file path or summary)
            const queryLower = query.toLowerCase();
            const matches = 
                artifact.filesChanged.some(f => f.toLowerCase().includes(queryLower)) ||
                artifact.summary.toLowerCase().includes(queryLower) ||
                artifact.reasoning.toLowerCase().includes(queryLower) ||
                artifact.decisions.some(d => d.toLowerCase().includes(queryLower));
            
            if (matches) {
                artifacts.push(artifact);
            }
        } catch (e) {
            logger.warn(`[WorkArchive] Could not read ${file}: ${(e as Error).message}`);
        }
    }
    
    // Sort by timestamp descending (most recent first)
    return artifacts.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

/**
 * Get recent work artifacts.
 */
export async function getRecentArtifacts(limit: number = 10): Promise<WorkArtifact[]> {
    await ensureArchiveDir();
    
    const indexPath = path.join(ARCHIVE_DIR, 'index.json');
    
    try {
        const content = await fs.readFile(indexPath, 'utf-8');
        const index: WorkArchiveIndex = JSON.parse(content);
        
        const artifacts: WorkArtifact[] = [];
        for (const entry of index.artifacts.slice(0, limit)) {
            try {
                const artifactPath = path.join(ARCHIVE_DIR, `${entry.id}.json`);
                const artifactContent = await fs.readFile(artifactPath, 'utf-8');
                artifacts.push(JSON.parse(artifactContent));
            } catch {
                // Artifact file may be missing
            }
        }
        
        return artifacts;
    } catch {
        return [];
    }
}

/**
 * Archive from a git commit.
 */
export async function archiveFromCommit(commitHash?: string): Promise<WorkArtifact | null> {
    try {
        const hash = commitHash || 'HEAD';
        
        // Get commit info
        const { stdout: message } = await execAsync(
            `git log -1 --format="%s" ${hash}`,
            { cwd: PROJECT_ROOT }
        );
        
        const { stdout: body } = await execAsync(
            `git log -1 --format="%b" ${hash}`,
            { cwd: PROJECT_ROOT }
        );
        
        const { stdout: files } = await execAsync(
            `git diff-tree --no-commit-id --name-only -r ${hash}`,
            { cwd: PROJECT_ROOT }
        );
        
        const { stdout: author } = await execAsync(
            `git log -1 --format="%an" ${hash}`,
            { cwd: PROJECT_ROOT }
        );
        
        const { stdout: fullHash } = await execAsync(
            `git log -1 --format="%H" ${hash}`,
            { cwd: PROJECT_ROOT }
        );
        
        // Infer type from commit message
        const messageTrimmed = message.trim();
        let type: WorkArtifact['type'] = 'chore';
        if (messageTrimmed.startsWith('feat')) type = 'feature';
        else if (messageTrimmed.startsWith('fix')) type = 'bugfix';
        else if (messageTrimmed.startsWith('refactor')) type = 'refactor';
        else if (messageTrimmed.startsWith('docs')) type = 'docs';
        else if (messageTrimmed.startsWith('test')) type = 'test';
        
        // Infer agent from author
        const agentId = author.toLowerCase().includes('bot') ? 'linus' : 'human';
        
        return await archiveWork({
            agentId,
            type,
            filesChanged: files.trim().split('\n').filter(Boolean),
            summary: messageTrimmed,
            commitHash: fullHash.trim(),
            reasoning: body.trim() || 'No additional context provided.',
            decisions: [],
        });
    } catch (e) {
        logger.error(`[WorkArchive] Failed to archive from commit: ${(e as Error).message}`);
        return null;
    }
}

/**
 * Archive recent commits (for backfilling).
 */
export async function archiveRecentCommits(days: number = 7): Promise<number> {
    try {
        const { stdout } = await execAsync(
            `git log --since="${days} days ago" --format="%H" --no-merges`,
            { cwd: PROJECT_ROOT }
        );
        
        const hashes = stdout.trim().split('\n').filter(Boolean);
        let archived = 0;
        
        for (const hash of hashes) {
            const result = await archiveFromCommit(hash);
            if (result) archived++;
        }
        
        logger.info(`[WorkArchive] Archived ${archived} commits from last ${days} days`);
        return archived;
    } catch (e) {
        logger.error(`[WorkArchive] Failed to archive recent commits: ${(e as Error).message}`);
        return 0;
    }
}
