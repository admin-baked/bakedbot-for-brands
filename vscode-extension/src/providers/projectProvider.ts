/**
 * Project Tree Provider
 *
 * Shows user's Vibe projects in the sidebar.
 */

import * as vscode from 'vscode';
import { VibeAPIClient } from '../services/apiClient';

export class VibeProjectProvider implements vscode.TreeDataProvider<ProjectTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectTreeItem | undefined | null | void> =
    new vscode.EventEmitter<ProjectTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ProjectTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private apiClient: VibeAPIClient;

  constructor(apiClient: VibeAPIClient) {
    this.apiClient = apiClient;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ProjectTreeItem): Promise<ProjectTreeItem[]> {
    if (element) {
      return [];
    }

    try {
      const projects = await this.apiClient.listProjects();
      return projects.map(
        (project) =>
          new ProjectTreeItem(
            project.name,
            project.id,
            vscode.TreeItemCollapsibleState.None
          )
      );
    } catch (error) {
      vscode.window.showErrorMessage('Failed to load projects');
      return [];
    }
  }
}

class ProjectTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly projectId: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label} - ${this.projectId}`;
    this.contextValue = 'project';
  }
}
