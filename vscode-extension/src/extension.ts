/**
 * BakedBot Vibe IDE - VS Code Extension
 *
 * Develop and deploy Vibe IDE projects locally with full IDE features.
 */

import * as vscode from 'vscode';
import { VibeProjectProvider } from './providers/projectProvider';
import { VibeTemplateProvider } from './providers/templateProvider';
import { VibeCollaborationProvider } from './providers/collaborationProvider';
import { VibeAPIClient } from './services/apiClient';
import { PreviewServer } from './services/previewServer';
import { DeploymentService } from './services/deploymentService';
import { CollaborationService } from './services/collaborationService';

let apiClient: VibeAPIClient;
let previewServer: PreviewServer;
let deploymentService: DeploymentService;
let collaborationService: CollaborationService;

export function activate(context: vscode.ExtensionContext) {
  console.log('BakedBot Vibe IDE extension is now active!');

  // Initialize services
  const config = vscode.workspace.getConfiguration('vibeIDE');
  const apiUrl = config.get<string>('apiUrl') || 'https://bakedbot.ai/api';

  apiClient = new VibeAPIClient(apiUrl, context);
  previewServer = new PreviewServer(context);
  deploymentService = new DeploymentService(apiClient);
  collaborationService = new CollaborationService(apiClient);

  // Register providers
  const projectProvider = new VibeProjectProvider(apiClient);
  const templateProvider = new VibeTemplateProvider(apiClient);
  const collaborationProvider = new VibeCollaborationProvider(collaborationService);

  vscode.window.registerTreeDataProvider('vibeProjects', projectProvider);
  vscode.window.registerTreeDataProvider('vibeTemplates', templateProvider);
  vscode.window.registerTreeDataProvider('vibeCollaboration', collaborationProvider);

  // Register commands
  context.subscriptions.push(
    // Project commands
    vscode.commands.registerCommand('vibeIDE.createProject', () => createProject(apiClient)),
    vscode.commands.registerCommand('vibeIDE.openProject', (project) => openProject(project)),
    vscode.commands.registerCommand('vibeIDE.deleteProject', (project) =>
      deleteProject(project, projectProvider)
    ),

    // Preview & deployment
    vscode.commands.registerCommand('vibeIDE.preview', () => preview(previewServer)),
    vscode.commands.registerCommand('vibeIDE.deploy', () => deploy(deploymentService)),
    vscode.commands.registerCommand('vibeIDE.syncFromCloud', () => syncFromCloud(apiClient)),

    // Configuration
    vscode.commands.registerCommand('vibeIDE.editVibeConfig', () => editVibeConfig()),

    // Templates
    vscode.commands.registerCommand('vibeIDE.browseTemplates', () =>
      browseTemplates(templateProvider)
    ),
    vscode.commands.registerCommand('vibeIDE.downloadTemplate', (template) =>
      downloadTemplate(template, apiClient)
    ),

    // Collaboration
    vscode.commands.registerCommand('vibeIDE.startCollaboration', () =>
      startCollaboration(collaborationService)
    ),
    vscode.commands.registerCommand('vibeIDE.joinSession', (sessionId) =>
      joinSession(sessionId, collaborationService)
    ),
    vscode.commands.registerCommand('vibeIDE.leaveSession', () =>
      leaveSession(collaborationService)
    )
  );

  // Status bar items
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.text = '$(zap) Vibe IDE';
  statusBarItem.tooltip = 'BakedBot Vibe IDE is active';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Auto-sync watcher
  if (config.get<boolean>('autoSync')) {
    const watcher = vscode.workspace.createFileSystemWatcher('**/vibe.config.json');
    watcher.onDidChange(() => syncToCloud(apiClient));
    context.subscriptions.push(watcher);
  }

  // Welcome message
  vscode.window.showInformationMessage(
    'BakedBot Vibe IDE is ready! Create a project or browse templates to get started.',
    'Create Project',
    'Browse Templates'
  ).then((selection) => {
    if (selection === 'Create Project') {
      vscode.commands.executeCommand('vibeIDE.createProject');
    } else if (selection === 'Browse Templates') {
      vscode.commands.executeCommand('vibeIDE.browseTemplates');
    }
  });
}

export function deactivate() {
  // Cleanup
  if (previewServer) {
    previewServer.stop();
  }
  if (collaborationService) {
    collaborationService.disconnect();
  }
}

/**
 * Create new Vibe project
 */
async function createProject(apiClient: VibeAPIClient) {
  const name = await vscode.window.showInputBox({
    prompt: 'Project Name',
    placeHolder: 'my-dispensary-site',
    validateInput: (value) => {
      if (!value) return 'Project name is required';
      if (!/^[a-z0-9-]+$/.test(value)) return 'Only lowercase letters, numbers, and hyphens';
      return null;
    },
  });

  if (!name) return;

  const description = await vscode.window.showInputBox({
    prompt: 'Project Description (optional)',
    placeHolder: 'Modern dispensary website',
  });

  const category = await vscode.window.showQuickPick(
    ['Dispensary', 'Menu', 'Landing Page', 'E-commerce', 'Blog'],
    { placeHolder: 'Select project category' }
  );

  if (!category) return;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Creating Vibe project...',
      cancellable: false,
    },
    async (progress) => {
      try {
        progress.report({ increment: 30, message: 'Generating project...' });

        const project = await apiClient.createProject({
          name,
          description: description || '',
          category: category.toLowerCase().replace(' ', '-'),
        });

        progress.report({ increment: 40, message: 'Setting up workspace...' });

        // Create workspace folder
        const folderUri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(`${name}`),
          saveLabel: 'Create Project',
        });

        if (folderUri) {
          await vscode.workspace.fs.createDirectory(folderUri);

          // Write project files
          for (const file of project.files) {
            const fileUri = vscode.Uri.joinPath(folderUri, file.path);
            const dirUri = vscode.Uri.joinPath(fileUri, '..');
            await vscode.workspace.fs.createDirectory(dirUri);
            await vscode.workspace.fs.writeFile(
              fileUri,
              Buffer.from(file.content, 'utf-8')
            );
          }

          progress.report({ increment: 30, message: 'Opening project...' });

          // Open project
          await vscode.commands.executeCommand('vscode.openFolder', folderUri);

          vscode.window.showInformationMessage(`Project "${name}" created successfully!`);
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );
}

/**
 * Open existing project
 */
async function openProject(_project: any) {
  const folderUri = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: 'Open Project',
  });

  if (folderUri && folderUri[0]) {
    await vscode.commands.executeCommand('vscode.openFolder', folderUri[0]);
  }
}

/**
 * Delete project
 */
async function deleteProject(project: any, provider: VibeProjectProvider) {
  const confirm = await vscode.window.showWarningMessage(
    `Delete project "${project.name}"? This cannot be undone.`,
    'Delete',
    'Cancel'
  );

  if (confirm === 'Delete') {
    // Delete from cloud
    await apiClient.deleteProject(project.id);
    provider.refresh();
    vscode.window.showInformationMessage(`Project "${project.name}" deleted.`);
  }
}

/**
 * Preview project locally
 */
async function preview(previewServer: PreviewServer) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Starting preview server...',
      cancellable: false,
    },
    async () => {
      try {
        const url = await previewServer.start(workspaceFolder.uri.fsPath);

        const openBrowser = await vscode.window.showInformationMessage(
          `Preview server running at ${url}`,
          'Open Browser',
          'Copy URL'
        );

        if (openBrowser === 'Open Browser') {
          vscode.env.openExternal(vscode.Uri.parse(url));
        } else if (openBrowser === 'Copy URL') {
          vscode.env.clipboard.writeText(url);
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to start preview: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );
}

/**
 * Deploy project
 */
async function deploy(deploymentService: DeploymentService) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const subdomain = await vscode.window.showInputBox({
    prompt: 'Subdomain (e.g., my-dispensary)',
    placeHolder: 'my-dispensary',
    validateInput: (value) => {
      if (!value) return 'Subdomain is required';
      if (!/^[a-z0-9-]+$/.test(value)) return 'Only lowercase letters, numbers, and hyphens';
      return null;
    },
  });

  if (!subdomain) return;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Deploying to production...',
      cancellable: false,
    },
    async (progress) => {
      try {
        progress.report({ increment: 20, message: 'Building project...' });

        const result = await deploymentService.deploy(workspaceFolder.uri.fsPath, subdomain);

        progress.report({ increment: 80, message: 'Deployment complete!' });

        const openSite = await vscode.window.showInformationMessage(
          `Deployed to ${result.url}`,
          'Open Site',
          'Copy URL'
        );

        if (openSite === 'Open Site') {
          vscode.env.openExternal(vscode.Uri.parse(result.url));
        } else if (openSite === 'Copy URL') {
          vscode.env.clipboard.writeText(result.url);
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );
}

/**
 * Sync from cloud
 */
async function syncFromCloud(apiClient: VibeAPIClient) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Syncing from cloud...',
      cancellable: false,
    },
    async () => {
      try {
        // Read vibe.config.json to get project ID
        const configUri = vscode.Uri.joinPath(workspaceFolder.uri, 'vibe.config.json');
        const configData = await vscode.workspace.fs.readFile(configUri);
        const config = JSON.parse(Buffer.from(configData).toString('utf-8'));

        const project = await apiClient.getProject(config.projectId);

        // Update files
        for (const file of project.files) {
          const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, file.path);
          await vscode.workspace.fs.writeFile(
            fileUri,
            Buffer.from(file.content, 'utf-8')
          );
        }

        vscode.window.showInformationMessage('Synced from cloud successfully!');
      } catch (error) {
        vscode.window.showErrorMessage(
          `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );
}

/**
 * Sync to cloud
 */
async function syncToCloud(_apiClient: VibeAPIClient) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return;

  try {
    // TODO: Implement auto-sync logic
    console.log('Auto-syncing to cloud...');
  } catch (error) {
    console.error('Auto-sync failed:', error);
  }
}

/**
 * Edit vibe config
 */
async function editVibeConfig() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const configUri = vscode.Uri.joinPath(workspaceFolder.uri, 'vibe.config.json');
  const doc = await vscode.workspace.openTextDocument(configUri);
  await vscode.window.showTextDocument(doc);
}

/**
 * Browse templates
 */
async function browseTemplates(provider: VibeTemplateProvider) {
  await provider.refresh();
  await vscode.commands.executeCommand('vibeTemplates.focus');
}

/**
 * Download template
 */
async function downloadTemplate(template: any, apiClient: VibeAPIClient) {
  const folderUri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(`${template.name}`),
    saveLabel: 'Download Template',
  });

  if (folderUri) {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Downloading template...',
        cancellable: false,
      },
      async () => {
        const project = await apiClient.downloadTemplate(template.id);

        await vscode.workspace.fs.createDirectory(folderUri);

        for (const file of project.files) {
          const fileUri = vscode.Uri.joinPath(folderUri, file.path);
          const dirUri = vscode.Uri.joinPath(fileUri, '..');
          await vscode.workspace.fs.createDirectory(dirUri);
          await vscode.workspace.fs.writeFile(
            fileUri,
            Buffer.from(file.content, 'utf-8')
          );
        }

        await vscode.commands.executeCommand('vscode.openFolder', folderUri);
      }
    );
  }
}

/**
 * Start collaboration session
 */
async function startCollaboration(collaborationService: CollaborationService) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const sessionId = await collaborationService.startSession(workspaceFolder.uri.fsPath);
  const link = `https://bakedbot.ai/vibe/beta/collaborate/${sessionId}`;

  const action = await vscode.window.showInformationMessage(
    `Collaboration session started!`,
    'Copy Link',
    'Share'
  );

  if (action === 'Copy Link') {
    vscode.env.clipboard.writeText(link);
    vscode.window.showInformationMessage('Link copied to clipboard!');
  }
}

/**
 * Join collaboration session
 */
async function joinSession(sessionId: string, collaborationService: CollaborationService) {
  await collaborationService.joinSession(sessionId);
  vscode.window.showInformationMessage('Joined collaboration session!');
}

/**
 * Leave collaboration session
 */
async function leaveSession(collaborationService: CollaborationService) {
  await collaborationService.leaveSession();
  vscode.window.showInformationMessage('Left collaboration session.');
}
