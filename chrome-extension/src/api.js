/**
 * BakedBot AI Chrome Extension - API Client
 *
 * Handles communication with the BakedBot backend.
 */

import { STORAGE_KEYS, DEFAULT_SETTINGS } from './constants.js';

class BakedBotAPI {
  constructor() {
    this.baseUrl = null;
    this.authToken = null;
    this.userId = null;
  }

  /**
   * Initialize the API client with stored credentials
   */
  async init() {
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.SETTINGS,
    ]);

    this.authToken = stored[STORAGE_KEYS.AUTH_TOKEN] || null;
    this.userId = stored[STORAGE_KEYS.USER_ID] || null;

    const settings = stored[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
    this.baseUrl = settings.apiUrl || DEFAULT_SETTINGS.apiUrl;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.authToken && !!this.userId;
  }

  /**
   * Get authorization headers
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Make an API request
   */
  async request(endpoint, options = {}) {
    if (!this.baseUrl) {
      await this.init();
    }

    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[BakedBot API] Request failed:', error);
      throw error;
    }
  }

  /**
   * Set authentication credentials
   */
  async setCredentials(token, userId) {
    this.authToken = token;
    this.userId = userId;

    await chrome.storage.local.set({
      [STORAGE_KEYS.AUTH_TOKEN]: token,
      [STORAGE_KEYS.USER_ID]: userId,
    });
  }

  /**
   * Clear authentication credentials
   */
  async clearCredentials() {
    this.authToken = null;
    this.userId = null;

    await chrome.storage.local.remove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.SESSION_ID,
    ]);
  }

  // =========================================================================
  // Session Management
  // =========================================================================

  /**
   * Create a new browser session
   */
  async createSession(options = {}) {
    return this.request('/api/browser/session', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * Get active session
   */
  async getActiveSession() {
    return this.request('/api/browser/session/active');
  }

  /**
   * End a session
   */
  async endSession(sessionId) {
    return this.request(`/api/browser/session/${sessionId}/end`, {
      method: 'POST',
    });
  }

  // =========================================================================
  // Browser Actions
  // =========================================================================

  /**
   * Execute a browser action
   */
  async executeAction(sessionId, action) {
    return this.request(`/api/browser/session/${sessionId}/action`, {
      method: 'POST',
      body: JSON.stringify(action),
    });
  }

  /**
   * Navigate to URL
   */
  async navigate(sessionId, url) {
    return this.executeAction(sessionId, { type: 'navigate', url });
  }

  /**
   * Click element
   */
  async click(sessionId, selector) {
    return this.executeAction(sessionId, { type: 'click', selector });
  }

  /**
   * Type text
   */
  async type(sessionId, selector, value) {
    return this.executeAction(sessionId, { type: 'type', selector, value });
  }

  /**
   * Take screenshot
   */
  async screenshot(sessionId) {
    return this.executeAction(sessionId, { type: 'screenshot' });
  }

  // =========================================================================
  // Permissions
  // =========================================================================

  /**
   * Check permission for domain
   */
  async checkPermission(domain, action) {
    return this.request(`/api/browser/permission/check?domain=${encodeURIComponent(domain)}&action=${action}`);
  }

  /**
   * List all permissions
   */
  async listPermissions() {
    return this.request('/api/browser/permissions');
  }

  /**
   * Grant permission
   */
  async grantPermission(domain, permissions) {
    return this.request('/api/browser/permission', {
      method: 'POST',
      body: JSON.stringify({ domain, ...permissions }),
    });
  }

  // =========================================================================
  // Workflow Recording
  // =========================================================================

  /**
   * Start recording
   */
  async startRecording(name, description) {
    return this.request('/api/browser/recording/start', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  /**
   * Stop recording
   */
  async stopRecording(recordingId) {
    return this.request(`/api/browser/recording/${recordingId}/stop`, {
      method: 'POST',
    });
  }

  /**
   * Record an action
   */
  async recordAction(recordingId, action) {
    return this.request(`/api/browser/recording/${recordingId}/action`, {
      method: 'POST',
      body: JSON.stringify(action),
    });
  }

  /**
   * Get active recording
   */
  async getActiveRecording() {
    return this.request('/api/browser/recording/active');
  }

  // =========================================================================
  // Workflows
  // =========================================================================

  /**
   * List workflows
   */
  async listWorkflows() {
    return this.request('/api/browser/workflows');
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId) {
    return this.request(`/api/browser/workflow/${workflowId}`);
  }

  /**
   * Run a workflow
   */
  async runWorkflow(workflowId, variables = {}) {
    return this.request(`/api/browser/workflow/${workflowId}/run`, {
      method: 'POST',
      body: JSON.stringify({ variables }),
    });
  }

  // =========================================================================
  // Auth Verification
  // =========================================================================

  /**
   * Verify token is valid
   */
  async verifyAuth() {
    try {
      const result = await this.request('/api/auth/verify');
      return result.success && result.isSuperUser;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const api = new BakedBotAPI();
export default api;
