/**
 * BakedBot AI Chrome Extension - Background Service Worker
 *
 * Handles:
 * - Message passing between popup and content scripts
 * - API communication with BakedBot backend
 * - Session and recording state management
 * - Context menu creation
 * - Keyboard shortcuts
 */

import { api } from './api.js';
import {
  STORAGE_KEYS,
  MESSAGE_TYPES,
  RECORDING_STATES,
  BLOCKED_DOMAINS,
  DEFAULT_SETTINGS,
} from './constants.js';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let state = {
  isAuthenticated: false,
  sessionId: null,
  recordingState: RECORDING_STATES.IDLE,
  recordingId: null,
  recordedActions: [],
  currentTab: null,
  settings: DEFAULT_SETTINGS,
};

/**
 * Initialize extension state from storage
 */
async function initializeState() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.SESSION_ID,
    STORAGE_KEYS.RECORDING_STATE,
    STORAGE_KEYS.SETTINGS,
  ]);

  state.sessionId = stored[STORAGE_KEYS.SESSION_ID] || null;
  state.settings = { ...DEFAULT_SETTINGS, ...stored[STORAGE_KEYS.SETTINGS] };

  // Initialize API
  await api.init();
  state.isAuthenticated = api.isAuthenticated();

  // Verify auth is still valid
  if (state.isAuthenticated) {
    const isValid = await api.verifyAuth();
    if (!isValid) {
      await api.clearCredentials();
      state.isAuthenticated = false;
    }
  }

  // Restore recording state
  const recordingState = stored[STORAGE_KEYS.RECORDING_STATE];
  if (recordingState) {
    state.recordingState = recordingState.state || RECORDING_STATES.IDLE;
    state.recordingId = recordingState.recordingId || null;
    state.recordedActions = recordingState.actions || [];
  }

  console.log('[BakedBot] Background initialized', {
    authenticated: state.isAuthenticated,
    sessionId: state.sessionId,
    recordingState: state.recordingState,
  });
}

/**
 * Save recording state to storage
 */
async function saveRecordingState() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.RECORDING_STATE]: {
      state: state.recordingState,
      recordingId: state.recordingId,
      actions: state.recordedActions,
    },
  });
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error('[BakedBot] Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    });

  // Return true to indicate async response
  return true;
});

async function handleMessage(message, sender) {
  const { type, payload } = message;

  switch (type) {
    // Authentication
    case MESSAGE_TYPES.AUTH_CHECK:
      return { isAuthenticated: state.isAuthenticated };

    case MESSAGE_TYPES.AUTH_LOGIN:
      return handleLogin(payload);

    case MESSAGE_TYPES.AUTH_LOGOUT:
      return handleLogout();

    // Session Management
    case MESSAGE_TYPES.SESSION_START:
      return handleSessionStart(payload);

    case MESSAGE_TYPES.SESSION_END:
      return handleSessionEnd();

    case MESSAGE_TYPES.SESSION_STATUS:
      return { sessionId: state.sessionId, isActive: !!state.sessionId };

    // Recording
    case MESSAGE_TYPES.RECORDING_START:
      return handleRecordingStart(payload);

    case MESSAGE_TYPES.RECORDING_STOP:
      return handleRecordingStop();

    case MESSAGE_TYPES.RECORDING_PAUSE:
      return handleRecordingPause();

    case MESSAGE_TYPES.RECORDING_RESUME:
      return handleRecordingResume();

    case MESSAGE_TYPES.RECORDING_STATUS:
      return {
        state: state.recordingState,
        recordingId: state.recordingId,
        actionCount: state.recordedActions.length,
      };

    case MESSAGE_TYPES.RECORDING_ACTION:
      return handleRecordAction(payload, sender);

    // Browser Actions
    case MESSAGE_TYPES.ACTION_NAVIGATE:
    case MESSAGE_TYPES.ACTION_CLICK:
    case MESSAGE_TYPES.ACTION_TYPE:
    case MESSAGE_TYPES.ACTION_SCREENSHOT:
      return handleBrowserAction(type, payload);

    // Workflows
    case MESSAGE_TYPES.WORKFLOW_LIST:
      return handleWorkflowList();

    case MESSAGE_TYPES.WORKFLOW_RUN:
      return handleWorkflowRun(payload);

    // Permissions
    case MESSAGE_TYPES.PERMISSION_CHECK:
      return handlePermissionCheck(payload);

    default:
      console.warn('[BakedBot] Unknown message type:', type);
      return { success: false, error: 'Unknown message type' };
  }
}

// ============================================================================
// AUTH HANDLERS
// ============================================================================

async function handleLogin(payload) {
  const { token, userId } = payload;

  try {
    await api.setCredentials(token, userId);

    // Verify the credentials work
    const isValid = await api.verifyAuth();
    if (!isValid) {
      await api.clearCredentials();
      return { success: false, error: 'Invalid credentials or not a Super User' };
    }

    state.isAuthenticated = true;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleLogout() {
  await api.clearCredentials();
  state.isAuthenticated = false;
  state.sessionId = null;
  state.recordingState = RECORDING_STATES.IDLE;
  state.recordingId = null;
  state.recordedActions = [];

  await chrome.storage.local.remove([
    STORAGE_KEYS.SESSION_ID,
    STORAGE_KEYS.RECORDING_STATE,
  ]);

  return { success: true };
}

// ============================================================================
// SESSION HANDLERS
// ============================================================================

async function handleSessionStart(payload) {
  if (!state.isAuthenticated) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const result = await api.createSession(payload);

    if (result.success && result.data) {
      state.sessionId = result.data.id;
      await chrome.storage.local.set({
        [STORAGE_KEYS.SESSION_ID]: state.sessionId,
      });
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleSessionEnd() {
  if (!state.sessionId) {
    return { success: false, error: 'No active session' };
  }

  try {
    const result = await api.endSession(state.sessionId);

    state.sessionId = null;
    await chrome.storage.local.remove([STORAGE_KEYS.SESSION_ID]);

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// RECORDING HANDLERS
// ============================================================================

async function handleRecordingStart(payload) {
  if (!state.isAuthenticated) {
    return { success: false, error: 'Not authenticated' };
  }

  if (state.recordingState === RECORDING_STATES.RECORDING) {
    return { success: false, error: 'Already recording' };
  }

  try {
    const { name, description } = payload;
    const result = await api.startRecording(name, description);

    if (result.success && result.data) {
      state.recordingState = RECORDING_STATES.RECORDING;
      state.recordingId = result.data.id;
      state.recordedActions = [];

      await saveRecordingState();

      // Notify all tabs that recording started
      notifyAllTabs({ type: MESSAGE_TYPES.RECORDING_STATUS, recording: true });

      // Update badge
      updateBadge('REC', '#ef4444');
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleRecordingStop() {
  if (state.recordingState === RECORDING_STATES.IDLE) {
    return { success: false, error: 'Not recording' };
  }

  try {
    let result = { success: true };

    if (state.recordingId) {
      result = await api.stopRecording(state.recordingId);
    }

    state.recordingState = RECORDING_STATES.IDLE;
    state.recordingId = null;
    state.recordedActions = [];

    await saveRecordingState();

    // Notify all tabs
    notifyAllTabs({ type: MESSAGE_TYPES.RECORDING_STATUS, recording: false });

    // Clear badge
    updateBadge('', '');

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleRecordingPause() {
  if (state.recordingState !== RECORDING_STATES.RECORDING) {
    return { success: false, error: 'Not recording' };
  }

  state.recordingState = RECORDING_STATES.PAUSED;
  await saveRecordingState();

  updateBadge('||', '#f59e0b');

  return { success: true };
}

async function handleRecordingResume() {
  if (state.recordingState !== RECORDING_STATES.PAUSED) {
    return { success: false, error: 'Not paused' };
  }

  state.recordingState = RECORDING_STATES.RECORDING;
  await saveRecordingState();

  updateBadge('REC', '#ef4444');

  return { success: true };
}

async function handleRecordAction(payload, sender) {
  if (state.recordingState !== RECORDING_STATES.RECORDING) {
    return { success: false, error: 'Not recording' };
  }

  const action = {
    ...payload,
    timestamp: Date.now(),
    url: sender.tab?.url || payload.url,
    tabId: sender.tab?.id,
  };

  state.recordedActions.push(action);
  await saveRecordingState();

  // Send to API if we have a recording ID
  if (state.recordingId) {
    try {
      await api.recordAction(state.recordingId, action);
    } catch (error) {
      console.error('[BakedBot] Failed to sync action:', error);
    }
  }

  return { success: true, actionIndex: state.recordedActions.length - 1 };
}

// ============================================================================
// BROWSER ACTION HANDLERS
// ============================================================================

async function handleBrowserAction(type, payload) {
  if (!state.sessionId) {
    return { success: false, error: 'No active session' };
  }

  const actionMap = {
    [MESSAGE_TYPES.ACTION_NAVIGATE]: 'navigate',
    [MESSAGE_TYPES.ACTION_CLICK]: 'click',
    [MESSAGE_TYPES.ACTION_TYPE]: 'type',
    [MESSAGE_TYPES.ACTION_SCREENSHOT]: 'screenshot',
  };

  const actionType = actionMap[type];
  if (!actionType) {
    return { success: false, error: 'Unknown action type' };
  }

  try {
    const action = { type: actionType, ...payload };
    return await api.executeAction(state.sessionId, action);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// WORKFLOW HANDLERS
// ============================================================================

async function handleWorkflowList() {
  if (!state.isAuthenticated) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    return await api.listWorkflows();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleWorkflowRun(payload) {
  if (!state.isAuthenticated) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const { workflowId, variables } = payload;
    return await api.runWorkflow(workflowId, variables);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// PERMISSION HANDLERS
// ============================================================================

async function handlePermissionCheck(payload) {
  const { url, action } = payload;

  // Check if domain is blocked
  try {
    const domain = new URL(url).hostname;

    if (BLOCKED_DOMAINS.some((blocked) => domain.includes(blocked))) {
      return {
        allowed: false,
        reason: 'Domain is blocked for security reasons',
      };
    }

    if (state.isAuthenticated) {
      return await api.checkPermission(domain, action);
    }

    return { allowed: false, reason: 'Not authenticated' };
  } catch (error) {
    return { allowed: false, reason: error.message };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Update extension badge
 */
function updateBadge(text, color) {
  chrome.action.setBadgeText({ text });
  if (color) {
    chrome.action.setBadgeBackgroundColor({ color });
  }
}

/**
 * Send message to all tabs
 */
async function notifyAllTabs(message) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // Tab might not have content script loaded
      });
    }
  }
}

// ============================================================================
// CONTEXT MENU
// ============================================================================

/**
 * Create context menu items
 */
function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'bakedbot-record-click',
      title: 'Record Click on Element',
      contexts: ['all'],
    });

    chrome.contextMenus.create({
      id: 'bakedbot-screenshot',
      title: 'Take Screenshot',
      contexts: ['page'],
    });

    chrome.contextMenus.create({
      id: 'separator-1',
      type: 'separator',
      contexts: ['all'],
    });

    chrome.contextMenus.create({
      id: 'bakedbot-start-recording',
      title: 'Start Recording',
      contexts: ['page'],
    });

    chrome.contextMenus.create({
      id: 'bakedbot-stop-recording',
      title: 'Stop Recording',
      contexts: ['page'],
    });
  });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'bakedbot-record-click':
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: MESSAGE_TYPES.HIGHLIGHT_ELEMENT,
          payload: { mode: 'record-click' },
        });
      }
      break;

    case 'bakedbot-screenshot':
      if (state.sessionId) {
        await api.screenshot(state.sessionId);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'BakedBot AI',
          message: 'Screenshot captured!',
        });
      }
      break;

    case 'bakedbot-start-recording':
      if (state.recordingState === RECORDING_STATES.IDLE) {
        await handleRecordingStart({
          name: `Recording ${new Date().toLocaleString()}`,
        });
      }
      break;

    case 'bakedbot-stop-recording':
      if (state.recordingState !== RECORDING_STATES.IDLE) {
        await handleRecordingStop();
      }
      break;
  }
});

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'toggle_recording':
      if (state.recordingState === RECORDING_STATES.IDLE) {
        await handleRecordingStart({
          name: `Recording ${new Date().toLocaleString()}`,
        });
      } else {
        await handleRecordingStop();
      }
      break;

    case 'take_screenshot':
      if (state.sessionId) {
        await api.screenshot(state.sessionId);
      }
      break;
  }
});

// ============================================================================
// TAB EVENTS
// ============================================================================

/**
 * Track active tab changes
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  state.currentTab = activeInfo.tabId;
});

/**
 * Track navigation for recording
 */
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return; // Main frame only

  if (state.recordingState === RECORDING_STATES.RECORDING) {
    await handleRecordAction(
      {
        type: 'navigate',
        url: details.url,
      },
      { tab: { id: details.tabId, url: details.url } }
    );
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize on install/update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[BakedBot] Extension installed/updated:', details.reason);

  await initializeState();
  createContextMenu();

  if (details.reason === 'install') {
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  }
});

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('[BakedBot] Extension started');
  await initializeState();
  createContextMenu();
});

// Initialize immediately for dev reloads
initializeState().then(() => {
  createContextMenu();
});
