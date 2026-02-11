"use strict";
/**
 * Collaboration Tree Provider
 *
 * Shows active collaboration sessions in the sidebar.
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
exports.VibeCollaborationProvider = void 0;
const vscode = __importStar(require("vscode"));
class VibeCollaborationProvider {
    constructor(collaborationService) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.collaborationService = collaborationService;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (element) {
            return [];
        }
        // TODO: Fetch active sessions from API
        if (this.collaborationService.isConnected()) {
            return [
                new CollaborationTreeItem('Active Session', 'active', vscode.TreeItemCollapsibleState.None),
            ];
        }
        return [];
    }
}
exports.VibeCollaborationProvider = VibeCollaborationProvider;
class CollaborationTreeItem extends vscode.TreeItem {
    constructor(label, sessionId, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.sessionId = sessionId;
        this.collapsibleState = collapsibleState;
        this.tooltip = `Session: ${this.sessionId}`;
        this.contextValue = 'session';
    }
}
//# sourceMappingURL=collaborationProvider.js.map