"use strict";
/**
 * Preview Server
 *
 * Local development server for previewing Vibe projects.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewServer = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
class PreviewServer {
    constructor(context) {
        this.serverProcess = null;
        this._context = context;
        const config = vscode.workspace.getConfiguration('vibeIDE');
        this.port = config.get('previewPort') || 3000;
    }
    async start(projectPath) {
        if (this.serverProcess) {
            this.stop();
        }
        return new Promise((resolve, reject) => {
            // Start Next.js dev server
            this.serverProcess = (0, child_process_1.spawn)('npm', ['run', 'dev'], {
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
                }
                else {
                    reject(new Error('Server failed to start'));
                }
            }, 30000);
        });
    }
    stop() {
        if (this.serverProcess) {
            this.serverProcess.kill();
            this.serverProcess = null;
        }
    }
    isRunning() {
        return this.serverProcess !== null;
    }
}
exports.PreviewServer = PreviewServer;
//# sourceMappingURL=previewServer.js.map