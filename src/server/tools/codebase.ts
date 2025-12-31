import * as fs from 'fs/promises';
import * as path from 'path';

export interface CodebaseToolInputs {
    path: string;
}

export async function readCodebase(inputs: CodebaseToolInputs): Promise<any> {
    const rootDir = process.cwd();
    // Use path.resolve but ensure we don't break out of root
    const targetPath = path.resolve(rootDir, inputs.path);

    // Security check: Only allow reading within project root
    if (!targetPath.startsWith(rootDir)) {
        throw new Error('Access denied: Cannot read outside of project root.');
    }

    try {
        const stats = await fs.stat(targetPath);
        if (stats.isDirectory()) {
            const files = await fs.readdir(targetPath);
            return {
                status: 'success',
                data: {
                    path: inputs.path,
                    type: 'directory',
                    files
                }
            };
        } else {
            const content = await fs.readFile(targetPath, 'utf-8');
            return {
                status: 'success',
                data: {
                    path: inputs.path,
                    type: 'file',
                    content: content.length > 10000 ? content.substring(0, 10000) + '\n\n... (truncated)' : content
                }
            };
        }
    } catch (error: any) {
        // If access denied was thrown above, rethrow it? No, catch block catches it.
        // Wait, if !startsWith throws, it goes to catch.
        
        // Preserve "Access denied" message specifically if we can, or just rethrow if it's our error.
        if (error.message.startsWith('Access denied')) {
             throw error; 
             // Wait, the router usually catches and returns { status: 'failed' }. 
             // The function should probably return the result object or throw.
             // Let's make this function return the DATA or throw.
        }

        throw new Error(`Failed to read codebase: ${error.message}`);
    }
}
