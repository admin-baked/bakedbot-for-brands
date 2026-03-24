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
        let token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
        if (!token) {
            token = await getSecret('GITHUB_TOKEN');
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
