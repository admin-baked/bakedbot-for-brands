/**
 * BakedBot AI Chrome Extension - Constants
 */

// API Configuration
export const API_BASE_URL = 'https://bakedbot.ai';
export const API_DEV_URL = 'http://localhost:3000';

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'bakedbot_auth_token',
  USER_ID: 'bakedbot_user_id',
  SESSION_ID: 'bakedbot_session_id',
  RECORDING_STATE: 'bakedbot_recording_state',
  PERMISSIONS_CACHE: 'bakedbot_permissions_cache',
  SETTINGS: 'bakedbot_settings',
};

// Message Types (background <-> content script communication)
export const MESSAGE_TYPES = {
  // Authentication
  AUTH_CHECK: 'AUTH_CHECK',
  AUTH_LOGIN: 'AUTH_LOGIN',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_STATUS: 'AUTH_STATUS',

  // Session Management
  SESSION_START: 'SESSION_START',
  SESSION_END: 'SESSION_END',
  SESSION_STATUS: 'SESSION_STATUS',

  // Recording
  RECORDING_START: 'RECORDING_START',
  RECORDING_STOP: 'RECORDING_STOP',
  RECORDING_PAUSE: 'RECORDING_PAUSE',
  RECORDING_RESUME: 'RECORDING_RESUME',
  RECORDING_STATUS: 'RECORDING_STATUS',
  RECORDING_ACTION: 'RECORDING_ACTION',

  // Browser Actions
  ACTION_NAVIGATE: 'ACTION_NAVIGATE',
  ACTION_CLICK: 'ACTION_CLICK',
  ACTION_TYPE: 'ACTION_TYPE',
  ACTION_SCROLL: 'ACTION_SCROLL',
  ACTION_SCREENSHOT: 'ACTION_SCREENSHOT',
  ACTION_RESULT: 'ACTION_RESULT',

  // Workflows
  WORKFLOW_LIST: 'WORKFLOW_LIST',
  WORKFLOW_RUN: 'WORKFLOW_RUN',
  WORKFLOW_STATUS: 'WORKFLOW_STATUS',

  // Permissions
  PERMISSION_CHECK: 'PERMISSION_CHECK',
  PERMISSION_REQUEST: 'PERMISSION_REQUEST',
  PERMISSION_RESULT: 'PERMISSION_RESULT',

  // UI
  SHOW_OVERLAY: 'SHOW_OVERLAY',
  HIDE_OVERLAY: 'HIDE_OVERLAY',
  SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',
  HIGHLIGHT_ELEMENT: 'HIGHLIGHT_ELEMENT',

  // Errors
  ERROR: 'ERROR',
};

// Recording States
export const RECORDING_STATES = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PAUSED: 'paused',
};

// Action Types for recording
export const ACTION_TYPES = {
  NAVIGATE: 'navigate',
  CLICK: 'click',
  TYPE: 'type',
  SCROLL: 'scroll',
  SELECT: 'select',
  SUBMIT: 'submit',
  WAIT: 'wait',
  SCREENSHOT: 'screenshot',
};

// High-risk action patterns (require confirmation)
export const HIGH_RISK_PATTERNS = {
  PURCHASE: /buy|purchase|checkout|order|pay|cart|add.to.cart/i,
  PAYMENT: /payment|credit.card|billing|invoice/i,
  DELETE: /delete|remove|trash|destroy|clear/i,
  PUBLISH: /publish|post|share|send|submit/i,
  LOGIN: /login|sign.in|authenticate|password/i,
  SENSITIVE: /account|profile|settings|admin|dashboard/i,
};

// Blocked domains (financial, sensitive)
export const BLOCKED_DOMAINS = [
  'chase.com',
  'bankofamerica.com',
  'wellsfargo.com',
  'paypal.com',
  'venmo.com',
  'coinbase.com',
  'robinhood.com',
  'schwab.com',
  'fidelity.com',
  'vanguard.com',
  'mint.com',
  'irs.gov',
  'ssa.gov',
  'healthcare.gov',
];

// Default settings
export const DEFAULT_SETTINGS = {
  apiUrl: API_BASE_URL,
  recordClicks: true,
  recordTyping: true,
  recordNavigation: true,
  recordScrolls: false,
  showOverlay: true,
  confirmHighRisk: true,
  notificationsEnabled: true,
  keyboardShortcuts: true,
};
