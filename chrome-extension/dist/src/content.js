/**
 * BakedBot AI Chrome Extension - Content Script
 *
 * Injected into all pages to:
 * - Record user interactions (clicks, typing, navigation)
 * - Display recording overlay
 * - Highlight elements during playback
 * - Execute browser actions
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const MESSAGE_TYPES = {
  RECORDING_ACTION: 'RECORDING_ACTION',
  RECORDING_STATUS: 'RECORDING_STATUS',
  HIGHLIGHT_ELEMENT: 'HIGHLIGHT_ELEMENT',
  SHOW_OVERLAY: 'SHOW_OVERLAY',
  HIDE_OVERLAY: 'HIDE_OVERLAY',
  SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',
};

const HIGH_RISK_PATTERNS = {
  PURCHASE: /buy|purchase|checkout|order|pay|cart|add.to.cart/i,
  PAYMENT: /payment|credit.card|billing|invoice/i,
  DELETE: /delete|remove|trash|destroy|clear/i,
  PUBLISH: /publish|post|share|send|submit/i,
  LOGIN: /login|sign.in|authenticate|password/i,
};

// ============================================================================
// STATE
// ============================================================================

let state = {
  isRecording: false,
  overlayVisible: false,
  highlightedElement: null,
  elementSelector: null,
};

// ============================================================================
// ELEMENT SELECTOR GENERATION
// ============================================================================

/**
 * Generate a unique CSS selector for an element
 */
function generateSelector(element) {
  // Try ID first
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  // Try data attributes
  const dataTestId = element.getAttribute('data-testid');
  if (dataTestId) {
    return `[data-testid="${CSS.escape(dataTestId)}"]`;
  }

  const dataId = element.getAttribute('data-id');
  if (dataId) {
    return `[data-id="${CSS.escape(dataId)}"]`;
  }

  // Try name attribute for form elements
  if (element.name && ['input', 'select', 'textarea', 'button'].includes(element.tagName.toLowerCase())) {
    return `${element.tagName.toLowerCase()}[name="${CSS.escape(element.name)}"]`;
  }

  // Try aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return `[aria-label="${CSS.escape(ariaLabel)}"]`;
  }

  // Build path-based selector
  const path = [];
  let current = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(/\s+/).filter((c) => c && !c.startsWith('hover') && !c.startsWith('active'));
      if (classes.length > 0) {
        selector += '.' + classes.slice(0, 2).map((c) => CSS.escape(c)).join('.');
      }
    }

    // Add nth-child if needed for uniqueness
    const siblings = current.parentElement?.children;
    if (siblings && siblings.length > 1) {
      const sameTagSiblings = Array.from(siblings).filter((s) => s.tagName === current.tagName);
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;

    // Limit depth
    if (path.length > 5) break;
  }

  return path.join(' > ');
}

/**
 * Get element text content for labeling
 */
function getElementLabel(element) {
  // Button/link text
  const text = element.textContent?.trim();
  if (text && text.length < 50) {
    return text;
  }

  // Placeholder
  const placeholder = element.getAttribute('placeholder');
  if (placeholder) {
    return placeholder;
  }

  // aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return ariaLabel;
  }

  // Input name
  const name = element.getAttribute('name');
  if (name) {
    return name;
  }

  return element.tagName.toLowerCase();
}

/**
 * Check if action appears high-risk
 */
function isHighRiskAction(element, actionType) {
  const text = (element.textContent || '').toLowerCase();
  const className = (element.className || '').toLowerCase();
  const id = (element.id || '').toLowerCase();
  const combined = `${text} ${className} ${id}`;

  for (const [riskType, pattern] of Object.entries(HIGH_RISK_PATTERNS)) {
    if (pattern.test(combined)) {
      return { isHighRisk: true, riskType };
    }
  }

  return { isHighRisk: false };
}

// ============================================================================
// EVENT RECORDING
// ============================================================================

/**
 * Record a click event
 */
function recordClick(event) {
  if (!state.isRecording) return;

  const element = event.target;
  const selector = generateSelector(element);
  const label = getElementLabel(element);
  const { isHighRisk, riskType } = isHighRiskAction(element, 'click');

  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.RECORDING_ACTION,
    payload: {
      type: 'click',
      selector,
      label,
      url: window.location.href,
      isHighRisk,
      riskType,
      coordinates: {
        x: event.clientX,
        y: event.clientY,
      },
    },
  });

  // Show visual feedback
  showClickFeedback(event.clientX, event.clientY);
}

/**
 * Record input/change events
 */
function recordInput(event) {
  if (!state.isRecording) return;

  const element = event.target;
  if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) return;

  const selector = generateSelector(element);
  const label = getElementLabel(element);
  const value = element.value;

  // Detect if this might be sensitive data
  const inputType = element.getAttribute('type') || '';
  const isSensitive = ['password', 'email', 'tel', 'credit-card'].includes(inputType) ||
    /password|email|phone|card|ssn|social/i.test(element.name || '');

  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.RECORDING_ACTION,
    payload: {
      type: 'type',
      selector,
      label,
      value: isSensitive ? '{{REDACTED}}' : value,
      url: window.location.href,
      isSensitive,
      inputType: element.tagName === 'SELECT' ? 'select' : inputType || 'text',
    },
  });
}

/**
 * Record form submission
 */
function recordSubmit(event) {
  if (!state.isRecording) return;

  const form = event.target;
  const selector = generateSelector(form);

  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.RECORDING_ACTION,
    payload: {
      type: 'submit',
      selector,
      url: window.location.href,
      formAction: form.action,
    },
  });
}

/**
 * Record scroll events (debounced)
 */
let scrollTimeout;
function recordScroll() {
  if (!state.isRecording) return;

  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.RECORDING_ACTION,
      payload: {
        type: 'scroll',
        url: window.location.href,
        position: {
          x: window.scrollX,
          y: window.scrollY,
        },
      },
    });
  }, 500);
}

// ============================================================================
// VISUAL FEEDBACK
// ============================================================================

/**
 * Show click feedback animation
 */
function showClickFeedback(x, y) {
  const ripple = document.createElement('div');
  ripple.className = 'bakedbot-click-ripple';
  ripple.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    width: 20px;
    height: 20px;
    background: rgba(34, 197, 94, 0.5);
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    animation: bakedbot-ripple 0.4s ease-out forwards;
    pointer-events: none;
    z-index: 2147483647;
  `;

  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 400);
}

/**
 * Show/hide recording overlay
 */
function showRecordingOverlay() {
  if (document.getElementById('bakedbot-recording-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'bakedbot-recording-overlay';
  overlay.innerHTML = `
    <div class="bakedbot-recording-indicator">
      <div class="bakedbot-recording-dot"></div>
      <span>Recording</span>
    </div>
  `;
  document.body.appendChild(overlay);
  state.overlayVisible = true;
}

function hideRecordingOverlay() {
  const overlay = document.getElementById('bakedbot-recording-overlay');
  if (overlay) {
    overlay.remove();
  }
  state.overlayVisible = false;
}

/**
 * Highlight an element
 */
function highlightElement(selector) {
  // Remove previous highlight
  removeHighlight();

  try {
    const element = document.querySelector(selector);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.id = 'bakedbot-highlight';
    highlight.style.cssText = `
      position: fixed;
      left: ${rect.left - 2}px;
      top: ${rect.top - 2}px;
      width: ${rect.width + 4}px;
      height: ${rect.height + 4}px;
      border: 2px solid #22c55e;
      background: rgba(34, 197, 94, 0.1);
      border-radius: 4px;
      pointer-events: none;
      z-index: 2147483646;
      transition: all 0.2s ease;
    `;

    document.body.appendChild(highlight);
    state.highlightedElement = element;
    state.elementSelector = selector;
  } catch (error) {
    console.error('[BakedBot] Failed to highlight element:', error);
  }
}

function removeHighlight() {
  const highlight = document.getElementById('bakedbot-highlight');
  if (highlight) {
    highlight.remove();
  }
  state.highlightedElement = null;
  state.elementSelector = null;
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `bakedbot-toast bakedbot-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('bakedbot-toast-visible');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('bakedbot-toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload, recording } = message;

  switch (type) {
    case MESSAGE_TYPES.RECORDING_STATUS:
      if (recording !== undefined) {
        state.isRecording = recording;
        if (recording) {
          showRecordingOverlay();
          enableRecording();
        } else {
          hideRecordingOverlay();
          disableRecording();
        }
      }
      sendResponse({ success: true });
      break;

    case MESSAGE_TYPES.HIGHLIGHT_ELEMENT:
      if (payload?.selector) {
        highlightElement(payload.selector);
      } else if (payload?.mode === 'record-click') {
        enableElementPicker();
      }
      sendResponse({ success: true });
      break;

    case MESSAGE_TYPES.SHOW_OVERLAY:
      showRecordingOverlay();
      sendResponse({ success: true });
      break;

    case MESSAGE_TYPES.HIDE_OVERLAY:
      hideRecordingOverlay();
      sendResponse({ success: true });
      break;

    case MESSAGE_TYPES.SHOW_NOTIFICATION:
      showNotification(payload?.message, payload?.type);
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true;
});

// ============================================================================
// ELEMENT PICKER MODE
// ============================================================================

let pickerActive = false;
let pickerHighlight = null;

function enableElementPicker() {
  pickerActive = true;
  document.body.style.cursor = 'crosshair';

  document.addEventListener('mouseover', handlePickerHover);
  document.addEventListener('click', handlePickerClick, true);
  document.addEventListener('keydown', handlePickerCancel);

  showNotification('Click an element to record', 'info');
}

function disableElementPicker() {
  pickerActive = false;
  document.body.style.cursor = '';

  document.removeEventListener('mouseover', handlePickerHover);
  document.removeEventListener('click', handlePickerClick, true);
  document.removeEventListener('keydown', handlePickerCancel);

  if (pickerHighlight) {
    pickerHighlight.remove();
    pickerHighlight = null;
  }
}

function handlePickerHover(event) {
  if (!pickerActive) return;

  const element = event.target;
  if (element.id?.startsWith('bakedbot-')) return;

  const rect = element.getBoundingClientRect();

  if (!pickerHighlight) {
    pickerHighlight = document.createElement('div');
    pickerHighlight.id = 'bakedbot-picker-highlight';
    document.body.appendChild(pickerHighlight);
  }

  pickerHighlight.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    border: 2px dashed #22c55e;
    background: rgba(34, 197, 94, 0.1);
    pointer-events: none;
    z-index: 2147483647;
  `;
}

function handlePickerClick(event) {
  if (!pickerActive) return;

  const element = event.target;
  if (element.id?.startsWith('bakedbot-')) return;

  event.preventDefault();
  event.stopPropagation();

  const selector = generateSelector(element);
  const label = getElementLabel(element);

  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.RECORDING_ACTION,
    payload: {
      type: 'click',
      selector,
      label,
      url: window.location.href,
      manual: true,
    },
  });

  showNotification(`Recorded click: ${label}`, 'success');
  disableElementPicker();
}

function handlePickerCancel(event) {
  if (event.key === 'Escape') {
    disableElementPicker();
    showNotification('Element picker cancelled', 'info');
  }
}

// ============================================================================
// RECORDING CONTROL
// ============================================================================

function enableRecording() {
  document.addEventListener('click', recordClick, true);
  document.addEventListener('change', recordInput, true);
  document.addEventListener('submit', recordSubmit, true);
  // Scroll recording is optional and can be intensive
  // document.addEventListener('scroll', recordScroll, { passive: true });
}

function disableRecording() {
  document.removeEventListener('click', recordClick, true);
  document.removeEventListener('change', recordInput, true);
  document.removeEventListener('submit', recordSubmit, true);
  document.removeEventListener('scroll', recordScroll);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Check initial recording state
chrome.runtime.sendMessage({ type: 'RECORDING_STATUS' }, (response) => {
  if (response?.state === 'recording') {
    state.isRecording = true;
    showRecordingOverlay();
    enableRecording();
  }
});

// Inject styles
const style = document.createElement('style');
style.textContent = `
  @keyframes bakedbot-ripple {
    to {
      transform: translate(-50%, -50%) scale(3);
      opacity: 0;
    }
  }

  @keyframes bakedbot-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  #bakedbot-recording-overlay {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .bakedbot-recording-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid #22c55e;
    border-radius: 24px;
    color: white;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .bakedbot-recording-dot {
    width: 10px;
    height: 10px;
    background: #ef4444;
    border-radius: 50%;
    animation: bakedbot-pulse 1.5s ease-in-out infinite;
  }

  .bakedbot-toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    padding: 12px 24px;
    background: #1a1a2e;
    color: white;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 2147483647;
    transition: transform 0.3s ease;
    border-left: 4px solid #3b82f6;
  }

  .bakedbot-toast-visible {
    transform: translateX(-50%) translateY(0);
  }

  .bakedbot-toast-success {
    border-left-color: #22c55e;
  }

  .bakedbot-toast-error {
    border-left-color: #ef4444;
  }

  .bakedbot-toast-warning {
    border-left-color: #f59e0b;
  }
`;
document.head.appendChild(style);

console.log('[BakedBot] Content script loaded');
