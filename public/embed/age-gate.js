/**
 * BakedBot Age Gate Embed Widget
 * Version: 1.0.0
 *
 * Standalone embeddable age verification with email/phone capture
 *
 * Usage:
 * <link rel="stylesheet" href="https://bakedbot.ai/embed/age-gate.css">
 * <script>
 *   window.BakedBotAgeGateConfig = {
 *     brandId: 'your-brand-id',
 *     dispensaryId: 'your-dispensary-id', // Optional
 *     state: 'IL',
 *     source: 'external-website',
 *     primaryColor: '#4ade80' // Optional
 *   };
 * </script>
 * <script src="https://bakedbot.ai/embed/age-gate.js"></script>
 */

(function () {
    'use strict';

    // Check if already initialized
    if (window.BakedBotAgeGate) {
        console.warn('[BakedBot AgeGate] Already initialized');
        return;
    }

    // Configuration
    const config = window.BakedBotAgeGateConfig || {};
    const API_BASE_URL = config.apiUrl || 'https://bakedbot.ai';
    const brandId = config.brandId;
    const dispensaryId = config.dispensaryId;
    const state = config.state || 'IL';
    const source = config.source || 'external-website';
    const primaryColor = config.primaryColor || '#4ade80';

    // LocalStorage keys
    const STORAGE_KEY = 'bakedbot_age_verified';
    const EXPIRY_HOURS = 24;

    /**
     * Check if user has valid age verification
     */
    function isAgeVerified() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return false;

            const verification = JSON.parse(stored);
            const now = Date.now();

            return verification.verified && now < verification.expiresAt;
        } catch (err) {
            console.error('[BakedBot AgeGate] Error checking verification:', err);
            return false;
        }
    }

    /**
     * Store age verification in localStorage
     */
    function storeVerification(dateOfBirth) {
        const verification = {
            verified: true,
            dateOfBirth: dateOfBirth,
            state: state,
            timestamp: Date.now(),
            expiresAt: Date.now() + (EXPIRY_HOURS * 60 * 60 * 1000)
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(verification));
        } catch (err) {
            console.error('[BakedBot AgeGate] Error storing verification:', err);
        }
    }

    /**
     * Format phone number
     */
    function formatPhoneNumber(value) {
        const cleaned = value.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
        if (match) {
            return [match[1], match[2], match[3]].filter(Boolean).join('-');
        }
        return value;
    }

    /**
     * Validate email
     */
    function validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Create age gate UI
     */
    function createAgeGateUI() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'bakedbot-age-gate-overlay';

        // Create card
        const card = document.createElement('div');
        card.id = 'bakedbot-age-gate-card';

        // Header
        const header = document.createElement('div');
        header.id = 'bakedbot-age-gate-header';
        header.innerHTML = `
            <div id="bakedbot-age-gate-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <h2 id="bakedbot-age-gate-title">Age Verification Required</h2>
            <p id="bakedbot-age-gate-subtitle">You must be 21 or older to access this site</p>
        `;

        // Content
        const content = document.createElement('div');
        content.id = 'bakedbot-age-gate-content';

        // Form
        const form = document.createElement('form');
        form.id = 'bakedbot-age-gate-form';
        form.innerHTML = `
            <div>
                <label class="bakedbot-label">
                    Date of Birth <span class="bakedbot-label-required">*</span>
                </label>
                <div class="bakedbot-date-grid">
                    <input type="number" id="bakedbot-month" class="bakedbot-input" placeholder="MM" min="1" max="12" required />
                    <input type="number" id="bakedbot-day" class="bakedbot-input" placeholder="DD" min="1" max="31" required />
                    <input type="number" id="bakedbot-year" class="bakedbot-input" placeholder="YYYY" min="1900" max="${new Date().getFullYear()}" required />
                </div>
            </div>

            <div class="bakedbot-optional-section">
                <div class="bakedbot-optional-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 3v18m0-18a9 9 0 01-9 9m9-9a9 9 0 019 9m-9 9a9 9 0 01-9-9m9 9a9 9 0 009-9"/>
                    </svg>
                    <strong>Get exclusive deals & updates</strong>
                    <span class="bakedbot-optional-tag">(Optional)</span>
                </div>

                <div style="margin-top: 12px;">
                    <label class="bakedbot-label" for="bakedbot-firstName">First Name</label>
                    <input type="text" id="bakedbot-firstName" class="bakedbot-input" placeholder="Your name" />
                </div>

                <div style="margin-top: 12px;">
                    <label class="bakedbot-label" for="bakedbot-email">
                        <span style="display: flex; align-items: center; gap: 6px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="2" y="4" width="20" height="16" rx="2"/>
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                            </svg>
                            Email
                        </span>
                    </label>
                    <input type="email" id="bakedbot-email" class="bakedbot-input" placeholder="you@example.com" />
                    <div id="bakedbot-email-consent-wrapper" style="display: none; margin-top: 8px;">
                        <div class="bakedbot-checkbox-wrapper">
                            <input type="checkbox" id="bakedbot-emailConsent" class="bakedbot-checkbox" />
                            <label for="bakedbot-emailConsent" class="bakedbot-checkbox-label">
                                I agree to receive promotional emails. You can unsubscribe anytime.
                            </label>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 12px;">
                    <label class="bakedbot-label" for="bakedbot-phone">
                        <span style="display: flex; align-items: center; gap: 6px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                            Phone Number
                        </span>
                    </label>
                    <input type="tel" id="bakedbot-phone" class="bakedbot-input" placeholder="555-123-4567" maxlength="12" />
                    <div id="bakedbot-sms-consent-wrapper" style="display: none; margin-top: 8px;">
                        <div class="bakedbot-checkbox-wrapper">
                            <input type="checkbox" id="bakedbot-smsConsent" class="bakedbot-checkbox" />
                            <label for="bakedbot-smsConsent" class="bakedbot-checkbox-label">
                                I agree to receive promotional texts. Message & data rates may apply. Reply STOP to opt out.
                            </label>
                        </div>
                    </div>
                </div>

                <p class="bakedbot-optional-hint">💡 Be the first to know about new drops, exclusive deals, and special events</p>
            </div>

            <div id="bakedbot-error" class="bakedbot-error" style="display: none;"></div>

            <button type="submit" id="bakedbot-submit" class="bakedbot-button">Enter Site</button>

            <p class="bakedbot-footer">By entering this site, you agree to our Terms of Service and Privacy Policy</p>
        `;

        content.appendChild(form);
        card.appendChild(header);
        card.appendChild(content);
        overlay.appendChild(card);

        return overlay;
    }

    /**
     * Show error message
     */
    function showError(message) {
        const errorEl = document.getElementById('bakedbot-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }

    /**
     * Hide error message
     */
    function hideError() {
        const errorEl = document.getElementById('bakedbot-error');
        if (errorEl) {
            errorEl.style.display = 'none';
        }
    }

    /**
     * Submit form
     */
    async function handleSubmit(e) {
        e.preventDefault();
        hideError();

        const submitBtn = document.getElementById('bakedbot-submit');
        const form = document.getElementById('bakedbot-age-gate-form');

        // Get form values
        const month = document.getElementById('bakedbot-month').value;
        const day = document.getElementById('bakedbot-day').value;
        const year = document.getElementById('bakedbot-year').value;
        const email = document.getElementById('bakedbot-email').value.trim();
        const phone = document.getElementById('bakedbot-phone').value.trim();
        const firstName = document.getElementById('bakedbot-firstName').value.trim();
        const emailConsent = document.getElementById('bakedbot-emailConsent').checked;
        const smsConsent = document.getElementById('bakedbot-smsConsent').checked;

        // Validate
        if (!month || !day || !year) {
            showError('Please enter a valid date of birth');
            return;
        }

        const monthNum = parseInt(month);
        const dayNum = parseInt(day);
        const yearNum = parseInt(year);

        if (monthNum < 1 || monthNum > 12) {
            showError('Please enter a valid month (1-12)');
            return;
        }

        if (dayNum < 1 || dayNum > 31) {
            showError('Please enter a valid day');
            return;
        }

        if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
            showError('Please enter a valid year');
            return;
        }

        if (email && !validateEmail(email)) {
            showError('Please enter a valid email address');
            return;
        }

        if (phone && phone.replace(/\D/g, '').length !== 10) {
            showError('Please enter a valid 10-digit phone number');
            return;
        }

        // Create ISO date string
        const dateOfBirth = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

        // Disable form
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
        form.classList.add('bakedbot-loading');

        try {
            const response = await fetch(`${API_BASE_URL}/api/age-gate/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    dateOfBirth,
                    state,
                    email: email || undefined,
                    phone: phone ? phone.replace(/\D/g, '') : undefined,
                    firstName: firstName || undefined,
                    emailConsent,
                    smsConsent,
                    brandId,
                    dispensaryId,
                    source,
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Store verification
                storeVerification(dateOfBirth);

                // Remove age gate
                const overlay = document.getElementById('bakedbot-age-gate-overlay');
                if (overlay) {
                    overlay.style.animation = 'bakedbot-fade-in 0.3s ease-out reverse';
                    setTimeout(() => {
                        overlay.remove();
                    }, 300);
                }
            } else {
                showError(data.error || 'Failed to verify age. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enter Site';
                form.classList.remove('bakedbot-loading');
            }
        } catch (error) {
            console.error('[BakedBot AgeGate] Error submitting form:', error);
            showError('Failed to verify age. Please check your connection and try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enter Site';
            form.classList.remove('bakedbot-loading');
        }
    }

    /**
     * Initialize age gate
     */
    function init() {
        // Check if already verified
        if (isAgeVerified()) {
            console.log('[BakedBot AgeGate] Already verified');
            return;
        }

        // Create and append UI
        const ageGate = createAgeGateUI();
        document.body.appendChild(ageGate);

        // Attach event listeners
        const form = document.getElementById('bakedbot-age-gate-form');
        if (form) {
            form.addEventListener('submit', handleSubmit);
        }

        // Phone formatting
        const phoneInput = document.getElementById('bakedbot-phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                e.target.value = formatPhoneNumber(e.target.value);

                // Show/hide SMS consent
                const wrapper = document.getElementById('bakedbot-sms-consent-wrapper');
                if (wrapper) {
                    wrapper.style.display = e.target.value.length > 0 ? 'block' : 'none';
                }
            });
        }

        // Email consent toggle
        const emailInput = document.getElementById('bakedbot-email');
        if (emailInput) {
            emailInput.addEventListener('input', (e) => {
                const wrapper = document.getElementById('bakedbot-email-consent-wrapper');
                if (wrapper) {
                    wrapper.style.display = e.target.value.length > 0 ? 'block' : 'none';
                }
            });
        }

        console.log('[BakedBot AgeGate] Initialized');
    }

    // Expose public API
    window.BakedBotAgeGate = {
        init: init,
        isVerified: isAgeVerified,
        version: '1.0.0'
    };

    // Auto-initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
