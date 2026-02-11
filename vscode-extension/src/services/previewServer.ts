/**
 * Preview Server
 *
 * Local development server for previewing Vibe projects.
 */

import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';

export class PreviewServer {
  private _context: vscode.ExtensionContext;
  private serverProcess: ChildProcess | null = null;
  private port: number;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    const config = vscode.workspace.getConfiguration('vibeIDE');
    this.port = config.get<number>('previewPort') || 3000;
  }

  async start(projectPath: string): Promise<string> {
    if (this.serverProcess) {
      this.stop();
    }

    return new Promise((resolve, reject) => {
      // Start Next.js dev server
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: projectPath,
        shell: true,
      });

      let output = '';

      this.serverProcess.stdout?.on('data', (data) => {
        output += data.toString();
        console.log(data.toString());

        // Check if server is ready
        if (output.includes(`localhost:${this.port}`)) {
          resolve(`http://localhost:${this.port}`);
        }
      });

      this.serverProcess.stderr?.on('data', (data) => {
        console.error(data.toString());
      });

      this.serverProcess.on('error', (error) => {
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (output.includes('localhost')) {
          resolve(`http://localhost:${this.port}`);
        } else {
          reject(new Error('Server failed to start'));
        }
      }, 30000);
    });
  }

  stop(): void {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  isRunning(): boolean {
    return this.serverProcess !== null;
  }
}
