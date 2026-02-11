/**
 * WebContainer Service
 *
 * Manages WebContainer instances for running Next.js apps in the browser.
 * WebContainers provide a full Node.js environment with npm, filesystem, and dev servers.
 *
 * NOTE: This runs CLIENT-SIDE ONLY (not in Node.js)
 */

import { WebContainer } from '@webcontainer/api';
import type { VibeCodeProject } from '@/types/vibe-code';

let webcontainerInstance: WebContainer | null = null;

/**
 * Boot a WebContainer instance (singleton)
 */
export async function bootWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) {
    return webcontainerInstance;
  }

  try {
    webcontainerInstance = await WebContainer.boot();
    console.log('[WEBCONTAINER] Booted successfully');
    return webcontainerInstance;
  } catch (error) {
    console.error('[WEBCONTAINER] Failed to boot:', error);
    throw new Error('Failed to boot WebContainer');
  }
}

/**
 * Write project files to WebContainer filesystem
 */
export async function writeProjectFiles(
  container: WebContainer,
  project: VibeCodeProject
): Promise<void> {
  try {
    console.log('[WEBCONTAINER] Writing files:', project.files.length);

    // Write all files
    for (const file of project.files) {
      await container.fs.writeFile(file.path, file.content);
    }

    console.log('[WEBCONTAINER] Files written successfully');
  } catch (error) {
    console.error('[WEBCONTAINER] Failed to write files:', error);
    throw new Error('Failed to write project files');
  }
}

/**
 * Install npm dependencies
 */
export async function installDependencies(
  container: WebContainer,
  onOutput?: (output: string) => void
): Promise<void> {
  try {
    console.log('[WEBCONTAINER] Installing dependencies...');

    const installProcess = await container.spawn('npm', ['install']);

    // Stream output
    if (onOutput) {
      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            onOutput(data);
          },
        })
      );
    }

    const exitCode = await installProcess.exit;

    if (exitCode !== 0) {
      throw new Error(`npm install failed with exit code ${exitCode}`);
    }

    console.log('[WEBCONTAINER] Dependencies installed');
  } catch (error) {
    console.error('[WEBCONTAINER] Install failed:', error);
    throw new Error('Failed to install dependencies');
  }
}

/**
 * Start the Next.js dev server
 */
export async function startDevServer(
  container: WebContainer,
  onOutput?: (output: string) => void
): Promise<string> {
  try {
    console.log('[WEBCONTAINER] Starting dev server...');

    const devProcess = await container.spawn('npm', ['run', 'dev']);

    // Stream output
    if (onOutput) {
      devProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            onOutput(data);
            // Look for the "ready" message
            if (data.includes('Ready in')) {
              console.log('[WEBCONTAINER] Dev server ready');
            }
          },
        })
      );
    }

    // Wait for server to be ready
    container.on('server-ready', (port, url) => {
      console.log('[WEBCONTAINER] Server ready at:', url);
    });

    // Return preview URL
    // WebContainers expose the dev server on a unique URL
    const previewUrl = await waitForServerReady(container);

    console.log('[WEBCONTAINER] Preview URL:', previewUrl);
    return previewUrl;
  } catch (error) {
    console.error('[WEBCONTAINER] Failed to start dev server:', error);
    throw new Error('Failed to start dev server');
  }
}

/**
 * Wait for the dev server to be ready and return the URL
 */
async function waitForServerReady(container: WebContainer): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, 60000); // 60 second timeout

    container.on('server-ready', (port, url) => {
      clearTimeout(timeout);
      resolve(url);
    });
  });
}

/**
 * Update a single file in the WebContainer
 */
export async function updateFile(
  container: WebContainer,
  path: string,
  content: string
): Promise<void> {
  try {
    await container.fs.writeFile(path, content);
    console.log('[WEBCONTAINER] File updated:', path);
  } catch (error) {
    console.error('[WEBCONTAINER] Failed to update file:', error);
    throw new Error('Failed to update file');
  }
}

/**
 * Read a file from the WebContainer
 */
export async function readFile(
  container: WebContainer,
  path: string
): Promise<string> {
  try {
    const content = await container.fs.readFile(path, 'utf-8');
    return content;
  } catch (error) {
    console.error('[WEBCONTAINER] Failed to read file:', error);
    throw new Error('Failed to read file');
  }
}

/**
 * Teardown the WebContainer instance
 */
export async function teardownWebContainer(): Promise<void> {
  if (webcontainerInstance) {
    await webcontainerInstance.teardown();
    webcontainerInstance = null;
    console.log('[WEBCONTAINER] Torn down');
  }
}

/**
 * Full setup: Boot → Write Files → Install → Start Server
 */
export async function setupProject(
  project: VibeCodeProject,
  onStatus?: (status: string) => void,
  onOutput?: (output: string) => void
): Promise<{ container: WebContainer; previewUrl: string }> {
  try {
    onStatus?.('Booting WebContainer...');
    const container = await bootWebContainer();

    onStatus?.('Writing project files...');
    await writeProjectFiles(container, project);

    onStatus?.('Installing dependencies...');
    await installDependencies(container, onOutput);

    onStatus?.('Starting dev server...');
    const previewUrl = await startDevServer(container, onOutput);

    onStatus?.('Ready!');
    return { container, previewUrl };
  } catch (error) {
    onStatus?.('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    throw error;
  }
}
