'use client';

/**
 * AuditPopup
 *
 * Modal wrapper around AuditLeadFlow. Can be opened:
 *  - Programmatically (via open/onClose props) — used by hero form
 *  - Via scroll trigger — auto-fires when user reaches 40% page scroll
 *
 * Scroll trigger fires once per session (sessionStorage guard).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { AuditLeadFlow } from '@/components/audit/audit-lead-flow';

const SCROLL_TRIGGER_THRESHOLD = 0.4; // 40% of page
const SESSION_KEY = 'bb_audit_popup_shown';

interface AuditPopupProps {
  /** Controlled open state (for hero form integration) */
  open?: boolean;
  onClose?: () => void;
  initialUrl?: string;
  /** If true, enables the scroll trigger for non-controlled use */
  scrollTrigger?: boolean;
}

export function AuditPopup({ open: controlledOpen, onClose, initialUrl, scrollTrigger = false }: AuditPopupProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [url, setUrl] = useState(initialUrl ?? '');

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const close = useCallback(() => {
    if (onClose) onClose();
    else setInternalOpen(false);
  }, [onClose]);

  // Scroll trigger — fires once per session
  useEffect(() => {
    if (!scrollTrigger) return;
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    function handleScroll() {
      const scrolled = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      if (scrolled >= SCROLL_TRIGGER_THRESHOLD) {
        sessionStorage.setItem(SESSION_KEY, '1');
        setInternalOpen(true);
        window.removeEventListener('scroll', handleScroll);
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollTrigger]);

  // Sync initialUrl when controlled open fires
  useEffect(() => {
    if (controlledOpen && initialUrl) setUrl(initialUrl);
  }, [controlledOpen, initialUrl]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="AI Retention Audit"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background border border-border rounded-2xl shadow-2xl">
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 z-10 rounded-full p-1.5 bg-muted/80 hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 pt-5">
          <AuditLeadFlow
            initialUrl={url}
            compact
            onClose={close}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * ScrollTriggeredAuditPopup
 *
 * Drop this anywhere on the page (e.g. BakedBotHome) to enable the
 * scroll-based popup. No props needed — it self-manages.
 */
export function ScrollTriggeredAuditPopup() {
  return <AuditPopup scrollTrigger />;
}
