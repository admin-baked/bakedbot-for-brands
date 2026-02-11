/**
 * Template Tree Provider
 *
 * Shows available templates in the sidebar.
 */

import * as vscode from 'vscode';
import { VibeAPIClient } from '../services/apiClient';

export class VibeTemplateProvider implements vscode.TreeDataProvider<TemplateTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TemplateTreeItem | undefined | null | void> =
    new vscode.EventEmitter<TemplateTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TemplateTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private apiClient: VibeAPIClient;

  constructor(apiClient: VibeAPIClient) {
    this.apiClient = apiClient;
  }

  async refresh(): Promise<void> {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TemplateTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TemplateTreeItem): Promise<TemplateTreeItem[]> {
    if (element) {
      return [];
    }

    try {
      const templates = await this.apiClient.listTemplates();
      return templates.map(
        (template) =>
          new TemplateTreeItem(
            template.name,
            template.id,
            vscode.TreeItemCollapsibleState.None
          )
      );
    } catch (error) {
      vscode.window.showErrorMessage('Failed to load templates');
      return [];
    }
  }
}

class TemplateTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly templateId: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}`;
    this.contextValue = 'template';
    this.command = {
      command: 'vibeIDE.downloadTemplate',
      title: 'Download Template',
      arguments: [this],
    };
  }
}
