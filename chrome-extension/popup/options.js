/**
 * BakedBot AI Chrome Extension - Options Page Script
 */

const STORAGE_KEY = 'bakedbot_settings';

const DEFAULT_SETTINGS = {
  apiUrl: 'https://bakedbot.ai',
  recordClicks: true,
  recordTyping: true,
  recordNavigation: true,
  recordScrolls: false,
  showOverlay: true,
  confirmHighRisk: true,
  notificationsEnabled: true,
  keyboardShortcuts: true,
};

let settings = { ...DEFAULT_SETTINGS };

// Load settings
chrome.storage.local.get([STORAGE_KEY], (result) => {
  settings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
  updateUI();
});

// Update UI from settings
function updateUI() {
  document.getElementById('api-url').value = settings.apiUrl || '';

  document.querySelectorAll('.toggle').forEach((toggle) => {
    const key = toggle.dataset.setting;
    if (settings[key]) {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }
  });
}

// Toggle click handlers
document.querySelectorAll('.toggle').forEach((toggle) => {
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    const key = toggle.dataset.setting;
    settings[key] = toggle.classList.contains('active');
  });
});

// Save settings
document.getElementById('save-btn').addEventListener('click', () => {
  settings.apiUrl = document.getElementById('api-url').value.trim() || DEFAULT_SETTINGS.apiUrl;

  chrome.storage.local.set({ [STORAGE_KEY]: settings }, () => {
    const msg = document.getElementById('success-message');
    msg.classList.add('visible');
    setTimeout(() => msg.classList.remove('visible'), 3000);
  });
});

// Reset to defaults
document.getElementById('reset-btn').addEventListener('click', () => {
  if (confirm('Reset all settings to defaults?')) {
    settings = { ...DEFAULT_SETTINGS };
    updateUI();

    chrome.storage.local.set({ [STORAGE_KEY]: settings }, () => {
      const msg = document.getElementById('success-message');
      msg.textContent = 'Settings reset to defaults!';
      msg.classList.add('visible');
      setTimeout(() => {
        msg.classList.remove('visible');
        msg.textContent = 'Settings saved successfully!';
      }, 3000);
    });
  }
});

console.log('[BakedBot] Options page loaded');
