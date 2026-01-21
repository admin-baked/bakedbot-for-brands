/**
 * BakedBot AI Chrome Extension - Popup Script
 *
 * Handles popup UI interactions and communication with background script.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const MESSAGE_TYPES = {
  AUTH_CHECK: 'AUTH_CHECK',
  AUTH_LOGIN: 'AUTH_LOGIN',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  SESSION_START: 'SESSION_START',
  SESSION_STATUS: 'SESSION_STATUS',
  RECORDING_START: 'RECORDING_START',
  RECORDING_STOP: 'RECORDING_STOP',
  RECORDING_PAUSE: 'RECORDING_PAUSE',
  RECORDING_RESUME: 'RECORDING_RESUME',
  RECORDING_STATUS: 'RECORDING_STATUS',
  WORKFLOW_LIST: 'WORKFLOW_LIST',
  WORKFLOW_RUN: 'WORKFLOW_RUN',
  ACTION_SCREENSHOT: 'ACTION_SCREENSHOT',
  HIGHLIGHT_ELEMENT: 'HIGHLIGHT_ELEMENT',
};

const STORAGE_KEYS = {
  SETTINGS: 'bakedbot_settings',
};

// ============================================================================
// STATE
// ============================================================================

let state = {
  isAuthenticated: false,
  isRecording: false,
  isPaused: false,
  actionCount: 0,
  workflows: [],
};

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const elements = {
  authSection: document.getElementById('auth-section'),
  mainSection: document.getElementById('main-section'),
  apiUrl: document.getElementById('api-url'),
  connectionToken: document.getElementById('connection-token'),
  loginBtn: document.getElementById('login-btn'),
  connectTokenBtn: document.getElementById('connect-token-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  statusBar: document.getElementById('status-bar'),
  statusText: document.getElementById('status-text'),
  recordingIdle: document.getElementById('recording-idle'),
  recordingActive: document.getElementById('recording-active'),
  recordingName: document.getElementById('recording-name'),
  recordingLabel: document.getElementById('recording-label'),
  actionCount: document.getElementById('action-count'),
  startRecordingBtn: document.getElementById('start-recording-btn'),
  pauseRecordingBtn: document.getElementById('pause-recording-btn'),
  stopRecordingBtn: document.getElementById('stop-recording-btn'),
  screenshotBtn: document.getElementById('screenshot-btn'),
  pickElementBtn: document.getElementById('pick-element-btn'),
  openDashboardBtn: document.getElementById('open-dashboard-btn'),
  helpBtn: document.getElementById('help-btn'),
  settingsBtn: document.getElementById('settings-btn'),
  refreshWorkflowsBtn: document.getElementById('refresh-workflows-btn'),
  workflowsList: document.getElementById('workflows-list'),
  helpModal: document.getElementById('help-modal'),
  closeHelpBtn: document.getElementById('close-help-btn'),
};

// ============================================================================
// MESSAGING
// ============================================================================

/**
 * Send message to background script
 */
function sendMessage(type, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, resolve);
  });
}

/**
 * Send message to current tab's content script
 */
async function sendToTab(type, payload = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    return chrome.tabs.sendMessage(tab.id, { type, payload });
  }
  return null;
}

// ============================================================================
// UI UPDATES
// ============================================================================

/**
 * Update UI based on auth state
 */
function updateAuthUI() {
  if (state.isAuthenticated) {
    elements.authSection.classList.add('hidden');
    elements.mainSection.classList.remove('hidden');
  } else {
    elements.authSection.classList.remove('hidden');
    elements.mainSection.classList.add('hidden');
  }
}

/**
 * Update recording UI state
 */
function updateRecordingUI() {
  if (state.isRecording) {
    elements.recordingIdle.classList.add('hidden');
    elements.recordingActive.classList.remove('hidden');
    elements.actionCount.textContent = `${state.actionCount} action${state.actionCount !== 1 ? 's' : ''}`;

    if (state.isPaused) {
      elements.recordingLabel.textContent = 'Paused';
      elements.statusBar.className = 'status-bar';
      elements.statusBar.querySelector('.status-indicator').className = 'status-indicator status-paused';
      elements.statusText.textContent = 'Paused';
      elements.pauseRecordingBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      `;
    } else {
      elements.recordingLabel.textContent = 'Recording';
      elements.statusBar.className = 'status-bar';
      elements.statusBar.querySelector('.status-indicator').className = 'status-indicator status-recording';
      elements.statusText.textContent = 'Recording';
      elements.pauseRecordingBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
      `;
    }
  } else {
    elements.recordingIdle.classList.remove('hidden');
    elements.recordingActive.classList.add('hidden');
    elements.statusBar.querySelector('.status-indicator').className = 'status-indicator status-idle';
    elements.statusText.textContent = 'Ready';
  }
}

/**
 * Render workflows list
 */
function renderWorkflows() {
  if (state.workflows.length === 0) {
    elements.workflowsList.innerHTML = `
      <div class="empty-state">
        <p>No workflows yet</p>
        <p class="text-xs">Record your first workflow above</p>
      </div>
    `;
    return;
  }

  elements.workflowsList.innerHTML = state.workflows
    .map((workflow) => `
      <div class="workflow-item" data-id="${workflow.id}">
        <div class="workflow-info">
          <div class="workflow-name">${escapeHtml(workflow.name)}</div>
          <div class="workflow-meta">${workflow.steps?.length || 0} steps</div>
        </div>
        <div class="workflow-actions">
          <button class="icon-btn small run-workflow-btn" title="Run Workflow" data-id="${workflow.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
        </div>
      </div>
    `)
    .join('');

  // Add click handlers for run buttons
  elements.workflowsList.querySelectorAll('.run-workflow-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      runWorkflow(btn.dataset.id);
    });
  });
}

/**
 * Escape HTML for safe rendering
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show loading state in workflows list
 */
function showWorkflowsLoading() {
  elements.workflowsList.innerHTML = `
    <div class="loading-spinner">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner">
        <line x1="12" y1="2" x2="12" y2="6"></line>
        <line x1="12" y1="18" x2="12" y2="22"></line>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
        <line x1="2" y1="12" x2="6" y2="12"></line>
        <line x1="18" y1="12" x2="22" y2="12"></line>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
      </svg>
    </div>
  `;
}

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Check authentication status
 */
async function checkAuth() {
  const result = await sendMessage(MESSAGE_TYPES.AUTH_CHECK);
  state.isAuthenticated = result?.isAuthenticated || false;
  updateAuthUI();

  if (state.isAuthenticated) {
    await checkRecordingStatus();
    await loadWorkflows();
  }
}

/**
 * Handle login
 */
async function handleLogin() {
  const apiUrl = elements.apiUrl.value.trim();

  if (!apiUrl) {
    alert('Please enter the API URL');
    return;
  }

  // Save settings
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: { apiUrl },
  });

  // Open BakedBot login page
  const loginUrl = `${apiUrl}/dashboard/ceo?tab=browser&action=connect-extension`;
  chrome.tabs.create({ url: loginUrl });

  // Close popup - user will complete login in new tab
  window.close();
}

/**
 * Handle token connection
 */
async function handleTokenConnect() {
  const token = elements.connectionToken.value.trim();
  const apiUrl = elements.apiUrl.value.trim() || 'https://bakedbot.ai';

  if (!token) {
    alert('Please paste your connection token from the dashboard');
    return;
  }

  // Save API URL
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: { apiUrl },
  });

  // Validate token with the server
  try {
    const response = await fetch(`${apiUrl}/api/browser/extension/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (data.success && data.userId) {
      // Send credentials to background script
      const result = await sendMessage(MESSAGE_TYPES.AUTH_LOGIN, {
        token: token,
        userId: data.userId,
      });

      if (result?.success) {
        state.isAuthenticated = true;
        updateAuthUI();
        await checkRecordingStatus();
        await loadWorkflows();
        elements.connectionToken.value = '';
      } else {
        alert(result?.error || 'Failed to authenticate');
      }
    } else {
      alert(data.error || 'Invalid or expired token');
    }
  } catch (error) {
    console.error('[BakedBot] Token validation error:', error);
    alert('Failed to connect. Please check your API URL and try again.');
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  await sendMessage(MESSAGE_TYPES.AUTH_LOGOUT);
  state.isAuthenticated = false;
  state.isRecording = false;
  state.workflows = [];
  updateAuthUI();
}

/**
 * Check recording status
 */
async function checkRecordingStatus() {
  const result = await sendMessage(MESSAGE_TYPES.RECORDING_STATUS);
  state.isRecording = result?.state === 'recording' || result?.state === 'paused';
  state.isPaused = result?.state === 'paused';
  state.actionCount = result?.actionCount || 0;
  updateRecordingUI();
}

/**
 * Start recording
 */
async function startRecording() {
  const name = elements.recordingName.value.trim() || `Recording ${new Date().toLocaleString()}`;

  const result = await sendMessage(MESSAGE_TYPES.RECORDING_START, { name });

  if (result?.success) {
    state.isRecording = true;
    state.isPaused = false;
    state.actionCount = 0;
    updateRecordingUI();
    elements.recordingName.value = '';
  } else {
    alert(result?.error || 'Failed to start recording');
  }
}

/**
 * Stop recording
 */
async function stopRecording() {
  const result = await sendMessage(MESSAGE_TYPES.RECORDING_STOP);

  if (result?.success) {
    state.isRecording = false;
    state.isPaused = false;
    state.actionCount = 0;
    updateRecordingUI();
    await loadWorkflows();
  } else {
    alert(result?.error || 'Failed to stop recording');
  }
}

/**
 * Pause/resume recording
 */
async function togglePauseRecording() {
  if (state.isPaused) {
    const result = await sendMessage(MESSAGE_TYPES.RECORDING_RESUME);
    if (result?.success) {
      state.isPaused = false;
      updateRecordingUI();
    }
  } else {
    const result = await sendMessage(MESSAGE_TYPES.RECORDING_PAUSE);
    if (result?.success) {
      state.isPaused = true;
      updateRecordingUI();
    }
  }
}

/**
 * Load workflows
 */
async function loadWorkflows() {
  showWorkflowsLoading();

  const result = await sendMessage(MESSAGE_TYPES.WORKFLOW_LIST);

  if (result?.success && result?.data) {
    state.workflows = result.data;
  } else {
    state.workflows = [];
  }

  renderWorkflows();
}

/**
 * Run a workflow
 */
async function runWorkflow(workflowId) {
  const result = await sendMessage(MESSAGE_TYPES.WORKFLOW_RUN, { workflowId });

  if (result?.success) {
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon48.png',
      title: 'BakedBot AI',
      message: 'Workflow started!',
    });
    window.close();
  } else {
    alert(result?.error || 'Failed to run workflow');
  }
}

/**
 * Take screenshot
 */
async function takeScreenshot() {
  const result = await sendMessage(MESSAGE_TYPES.ACTION_SCREENSHOT);

  if (result?.success) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon48.png',
      title: 'BakedBot AI',
      message: 'Screenshot captured!',
    });
  } else {
    alert(result?.error || 'Failed to take screenshot');
  }
}

/**
 * Pick element on page
 */
async function pickElement() {
  await sendToTab(MESSAGE_TYPES.HIGHLIGHT_ELEMENT, { mode: 'record-click' });
  window.close();
}

/**
 * Open dashboard
 */
async function openDashboard() {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
  const settings = stored[STORAGE_KEYS.SETTINGS] || {};
  const apiUrl = settings.apiUrl || 'https://bakedbot.ai';

  chrome.tabs.create({ url: `${apiUrl}/dashboard/ceo?tab=browser` });
  window.close();
}

/**
 * Show help modal
 */
function showHelpModal() {
  elements.helpModal.classList.remove('hidden');
}

/**
 * Hide help modal
 */
function hideHelpModal() {
  elements.helpModal.classList.add('hidden');
}

/**
 * Open settings/options page
 */
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Auth
elements.loginBtn.addEventListener('click', handleLogin);
elements.connectTokenBtn.addEventListener('click', handleTokenConnect);
elements.logoutBtn.addEventListener('click', handleLogout);

// Enter key on connection token input
elements.connectionToken.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    handleTokenConnect();
  }
});

// Recording
elements.startRecordingBtn.addEventListener('click', startRecording);
elements.stopRecordingBtn.addEventListener('click', stopRecording);
elements.pauseRecordingBtn.addEventListener('click', togglePauseRecording);

// Quick actions
elements.screenshotBtn.addEventListener('click', takeScreenshot);
elements.pickElementBtn.addEventListener('click', pickElement);
elements.openDashboardBtn.addEventListener('click', openDashboard);
elements.helpBtn.addEventListener('click', showHelpModal);
elements.settingsBtn.addEventListener('click', openSettings);
elements.refreshWorkflowsBtn.addEventListener('click', loadWorkflows);

// Modal
elements.closeHelpBtn.addEventListener('click', hideHelpModal);
elements.helpModal.addEventListener('click', (e) => {
  if (e.target === elements.helpModal) {
    hideHelpModal();
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideHelpModal();
  }
});

// Enter key on recording name input
elements.recordingName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    startRecording();
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

// Load saved API URL
chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (result) => {
  const settings = result[STORAGE_KEYS.SETTINGS] || {};
  if (settings.apiUrl) {
    elements.apiUrl.value = settings.apiUrl;
  }
});

// Check auth status on popup open
checkAuth();

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MESSAGE_TYPES.RECORDING_STATUS) {
    state.isRecording = message.recording;
    state.isPaused = false;
    updateRecordingUI();
  }
});

console.log('[BakedBot] Popup loaded');
