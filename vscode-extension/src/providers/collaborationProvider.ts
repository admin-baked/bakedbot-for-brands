/**
 * Collaboration Tree Provider
 *
 * Shows active collaboration sessions in the sidebar.
 */

import * as vscode from 'vscode';
import { CollaborationService } from '../services/collaborationService';

export class VibeCollaborationProvider
  implements vscode.TreeDataProvider<CollaborationTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    CollaborationTreeItem | undefined | null | void
  > = new vscode.EventEmitter<CollaborationTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<CollaborationTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private collaborationService: CollaborationService;

  constructor(collaborationService: CollaborationService) {
    this.collaborationService = collaborationService;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: CollaborationTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: CollaborationTreeItem): Promise<CollaborationTreeItem[]> {
    if (element) {
      return [];
    }

    // TODO: Fetch active sessions from API
    if (this.collaborationService.isConnected()) {
      return [
        new CollaborationTreeItem(
          'Active Session',
          'active',
          vscode.TreeItemCollapsibleState.None
        ),
      ];
    }

    return [];
  }
}

class CollaborationTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly sessionId: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.tooltip = `Session: ${this.sessionId}`;
    this.contextValue = 'session';
  }
}
