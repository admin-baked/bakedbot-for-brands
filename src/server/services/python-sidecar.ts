
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export interface SidecarResult {
    status: 'success' | 'error';
    message?: string;
    [key: string]: any;
}

export class PythonSidecar {
    private pythonPath: string;
    private scriptPath: string;
    private cachedPath: string | null = null;

    constructor() {
        this.pythonPath = 'python'; // Default to PATH
        this.scriptPath = path.join(process.cwd(), 'python', 'sidecar.py');
    }

    private async resolvePythonPath(): Promise<string> {
        if (this.cachedPath) return this.cachedPath;

        // 1. Try PATH (simplest check is just returning 'python' and letting spawn fail, but we can verify)
        // For efficiency we assume 'python' is first choice. 
        
        // 2. Check Windows Specific Paths if we suspect PATH is missing it
        if (process.platform === 'win32') {
            const localAppData = process.env.LOCALAPPDATA;
            if (localAppData) {
                const shimPath = path.join(localAppData, 'Microsoft', 'WindowsApps', 'python.exe');
                if (fs.existsSync(shimPath)) {
                     // Verify it's not a 0-byte dummy (execution alias not installed)
                     // Actually 0-byte might be the reparse point, so we just try to use it.
                     // But we prefer explicit path if found.
                     // Let's stick with 'python' first, but if that fails we use this.
                }
                
                // We'll return this explicit path if we can't run 'python'
                // For now, let's keep it simple: we try to run 'python' in execute, if it fails, we try shim.
                // But to make this method useful, let's return a list or just use logic in execute.
            }
        }
        
        return 'python';
    }

    async execute(action: string, data: any = {}): Promise<SidecarResult> {
        // Try default 'python' first
        let result = await this.trySpawn('python', action, data);
        
        // Use fallback if default failed with ENOENT or similar
        if (result.status === 'error' && (result.message?.includes('ENOENT') || result.message?.includes('not found'))) {
             if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
                  const fallbackPath = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WindowsApps', 'python.exe');
                  if (fs.existsSync(fallbackPath)) {
                       console.log(`[PythonSidecar] Falling back to: ${fallbackPath}`);
                       result = await this.trySpawn(fallbackPath, action, data);
                  }
             }
        }
        
        return result;
    }

    private async trySpawn(command: string, action: string, data: any): Promise<SidecarResult> {
        return new Promise((resolve, reject) => {
            const process = spawn(command, [
                this.scriptPath,
                '--action', action,
                '--data', JSON.stringify(data)
            ]);

            let stdoutData = '';
            let stderrData = '';

            process.stdout.on('data', (data) => {
                stdoutData += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderrData += data.toString();
            });

            process.on('close', (code) => {
                if (code !== 0) {
                    // console.error(`Python (${command}) Error:`, stderrData); 
                    // Don't log error yet, allow fallback
                    resolve({
                        status: 'error',
                        message: `Process exited with code ${code}: ${stderrData || 'Exit code ' + code}`
                    });
                    return;
                }

                try {
                    const result = JSON.parse(stdoutData.trim());
                    resolve(result);
                } catch (e) {
                    resolve({
                        status: 'error',
                        message: `Failed to parse JSON: ${stdoutData}`
                    });
                }
            });

            process.on('error', (err: any) => {
                 let msg = err.message;
                 if (err.code === 'ENOENT') {
                     msg = `Executable not found: ${command}`;
                 }
                resolve({
                    status: 'error',
                    message: msg
                });
            });
        });
    }
}

export const sidecar = new PythonSidecar();
