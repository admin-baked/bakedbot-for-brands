/**
 * GitHub API Tools for Agents (specifically Linus)
 * 
 * Allows agents to commit and push code directly from the Firebase App Hosting
 * environment where the `git` binary is not available.
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getSecret } from '@/server/utils/secrets';
import * as fs from 'fs/promises';
import * as path from 'path';

export const githubPushObjectSchema = z.object({
    files: z.array(z.string()).describe('Array of relative file paths from project root that have been modified or created'),
    commitMessage: z.string().describe('The git commit message'),
    branch: z.string().optional().describe('The branch to push to. Defaults to "main"')
});

export type GithubPushParams = z.infer<typeof githubPushObjectSchema>;

export const githubPushToolDef = {
    name: 'github_push_api',
    description: 'Commit and push code changes directly to GitHub via REST API. Use this specifically when you cannot use the `git` CLI (e.g., inside the App Hosting container).',
    schema: githubPushObjectSchema
};

/**
 * Main execution function for the github_push_api tool.
 * Reads local file contents, connects to GitHub, creates a commit with the new contents, and updates the branch.
 */
export async function executeGithubPush(params: GithubPushParams): Promise<string> {
    try {
        const { files, commitMessage, branch = 'main' } = params;
        
        if (!files || files.length === 0) {
            return 'Error: No files specified to commit.';
        }

        // 1. Resolve Token
        let token: string | undefined | null = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
        if (!token) {
            token = await getSecret('GITHUB_TOKEN') ?? undefined;
        }

        if (!token) {
            return 'Error: GITHUB_TOKEN is not configured in environment variables or Secret Manager. Cannot perform push operation.';
        }

        logger.info('[GithubPushTool] Initializing Octokit', { filesCount: files.length, branch });
        
        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({ auth: token });
        
        // Ensure authentication works and get username
        const { data: user } = await octokit.users.getAuthenticated();
        
        // Extract owner/repo from package.json or hardcoded bakedbot-for-brands
        // In the context of the prompt, the remote is `admin-baked/bakedbot-for-brands`
        let owner = 'admin-baked';
        let repo = 'bakedbot-for-brands';
        
        // 2. Read Local Files
        const fileBlobsParams: { path: string, content: string }[] = [];
        const projectRoot = process.cwd();
        
        for (const filePath of files) {
            try {
                const absolutePath = path.resolve(projectRoot, filePath);
                const content = await fs.readFile(absolutePath, 'utf8');
                fileBlobsParams.push({ path: filePath, content });
            } catch (err) {
                logger.error(`[GithubPushTool] Error reading file ${filePath}`, { error: err });
                return `Error: Failed to read local file ${filePath}. Ensure the file exists and the path is correct relative to the project root.`;
            }
        }

        // 3. Get latest commit SHA & Tree
        const { data: ref } = await octokit.git.getRef({
            owner,
            repo,
            ref: `heads/${branch}`,
        });
        const latestCommitSha = ref.object.sha;

        const { data: commit } = await octokit.git.getCommit({
            owner,
            repo,
            commit_sha: latestCommitSha,
        });
        const baseTreeSha = commit.tree.sha;

        // 4. Create blobs
        const treeItems = await Promise.all(
            fileBlobsParams.map(async (file) => {
                const { data: blob } = await octokit.git.createBlob({
                    owner,
                    repo,
                    content: Buffer.from(file.content).toString('base64'),
                    encoding: 'base64',
                });
                return {
                    path: file.path,
                    mode: '100644' as const,
                    type: 'blob' as const,
                    sha: blob.sha,
                };
            })
        );

        // 5. Create new tree
        const { data: newTree } = await octokit.git.createTree({
            owner,
            repo,
            base_tree: baseTreeSha,
            tree: treeItems,
        });

        // 6. Create commit
        const { data: newCommit } = await octokit.git.createCommit({
            owner,
            repo,
            message: commitMessage,
            tree: newTree.sha,
            parents: [latestCommitSha],
        });

        // 7. Update Ref
        await octokit.git.updateRef({
            owner,
            repo,
            ref: `heads/${branch}`,
            sha: newCommit.sha,
        });

        const successMessage = `Successfully pushed ${files.length} files to branch '${branch}'. Commit SHA: ${newCommit.sha}`;
        logger.info('[GithubPushTool] Push Successful', { sha: newCommit.sha });
        return successMessage;

    } catch (error: any) {
        logger.error('[GithubPushTool] Execution failed', { error: error.message });
        return `Failed to execute GitHub API push: ${error.message}`;
    }
}

// ============================================================================
// GITHUB PR CREATION
// ============================================================================

export const githubCreatePrToolDef = {
    name: 'github_create_pr',
    description: 'Commit code changes to a new branch and automatically open a Pull Request.',
    schema: z.object({
        branchName: z.string().describe('Name of the new branch to create (e.g. feature/auth-fix)'),
        files: z.array(z.string()).describe('Array of relative file paths from project root to commit'),
        commitMessage: z.string().describe('The git commit message'),
        prTitle: z.string().describe('The title of the Pull Request'),
        prBody: z.string().describe('Markdown description of the Pull Request proposed changes')
    })
};

export async function executeGithubCreatePr(params: z.infer<typeof githubCreatePrToolDef.schema>): Promise<string> {
    try {
        const { branchName, files, commitMessage, prTitle, prBody } = params;
        
        let token: string | undefined | null = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
        if (!token) token = await getSecret('GITHUB_TOKEN');
        if (!token) return 'Error: GITHUB_TOKEN is not configured.';

        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({ auth: token });
        
        let owner = 'admin-baked';
        let repo = 'bakedbot-for-brands';
        
        // 1. Get main SHA
        const { data: mainRef } = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
        const mainSha = mainRef.object.sha;

        // 2. Create new branch
        try {
            await octokit.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: mainSha });
        } catch (e: any) {
            // If branch exists, just use it 
            if (e.status !== 422) throw e;
        }

        // 3. Read Files & Create Blobs
        const projectRoot = process.cwd();
        const treeItems = await Promise.all(
            files.map(async (filePath) => {
                const content = await fs.readFile(path.resolve(projectRoot, filePath), 'utf8');
                const { data: blob } = await octokit.git.createBlob({
                    owner, repo, content: Buffer.from(content).toString('base64'), encoding: 'base64'
                });
                return { path: filePath, mode: '100644' as const, type: 'blob' as const, sha: blob.sha };
            })
        );

        // 4. Create Tree & Commit
        const { data: commit } = await octokit.git.getCommit({ owner, repo, commit_sha: mainSha });
        const { data: newTree } = await octokit.git.createTree({ owner, repo, base_tree: commit.tree.sha, tree: treeItems });
        
        const { data: newCommit } = await octokit.git.createCommit({
            owner, repo, message: commitMessage, tree: newTree.sha, parents: [mainSha]
        });

        // 5. Update Branch Ref
        await octokit.git.updateRef({ owner, repo, ref: `heads/${branchName}`, sha: newCommit.sha });

        // 6. Create PR
        const { data: pr } = await octokit.pulls.create({
            owner, repo, title: prTitle, body: prBody, head: branchName, base: 'main'
        });

        logger.info('[GithubCreatePrTool] Created PR', { prUrl: pr.html_url });
        return `Successfully created Pull Request #${pr.number}: ${pr.html_url}`;

    } catch (error: any) {
        logger.error('[GithubCreatePrTool] Execution failed', { error: error.message });
        return `Failed to create PR: ${error.message}`;
    }
}

// ============================================================================
// GITHUB PR REVIEW
// ============================================================================

export const githubReviewPrToolDef = {
    name: 'github_review_pr',
    description: 'Fetch the diff of an open Pull Request or submit a formal review (Approve, Request Changes, Comment).',
    schema: z.object({
        action: z.enum(['get_diff', 'submit_review']).describe('Whether to fetch the diff or submit a review.'),
        prNumber: z.number().describe('The GitHub Pull Request number'),
        reviewBody: z.string().optional().describe('Markdown review body. Required if submit_review.'),
        reviewEvent: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']).optional().describe('Type of review. Required if submit_review.')
    })
};

export async function executeGithubReviewPr(params: z.infer<typeof githubReviewPrToolDef.schema>): Promise<string> {
    try {
        const { action, prNumber, reviewBody, reviewEvent } = params;
        
        let token: string | undefined | null = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
        if (!token) token = await getSecret('GITHUB_TOKEN');
        if (!token) return 'Error: GITHUB_TOKEN is not configured.';

        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({ auth: token });
        
        let owner = 'admin-baked';
        let repo = 'bakedbot-for-brands';

        if (action === 'get_diff') {
            const { data: diff } = await octokit.pulls.get({
                owner, repo, pull_number: prNumber, mediaType: { format: 'diff' }
            }) as { data: any };
            return typeof diff === 'string' ? (diff as string).slice(0, 15000) : JSON.stringify(diff).slice(0, 15000); // Caps diff output to preserve context
        } 
        
        if (action === 'submit_review') {
            if (!reviewBody || !reviewEvent) return 'Error: reviewBody and reviewEvent are required for submit_review';
            
            const { data: review } = await octokit.pulls.createReview({
                owner, repo, pull_number: prNumber, body: reviewBody, event: reviewEvent
            });
            
            logger.info('[GithubReviewPrTool] Submitted Review', { reviewUrl: review.html_url });
            return `Successfully submitted ${reviewEvent} review: ${review.html_url}`;
        }
        
        return 'Error: Invalid action';

    } catch (error: any) {
        logger.error('[GithubReviewPrTool] Execution failed', { error: error.message });
        return `Failed to review PR: ${error.message}`;
    }
}
