'use client';

/**
 * DeeboCompliancePanel
 *
 * Right-rail panel for the Creative Studio.
 * Section 1: Deebo compliance status (traffic light + approval chain accordion)
 * Section 2: Publishing schedule (calendar + publish/schedule CTAs)
 * Section 3: Asset library (recently generated content thumbnails)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  MessageSquare,
  CalendarIcon,
  Clock,
  Image,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ApprovalChain } from '@/components/creative/approval-chain';
import type { CreativeContent } from '@/types/creative-content';

interface ComplianceCheck {
  checkType: string;
  passed: boolean;
  message: string;
}

interface DeeboCompliancePanelProps {
  content: CreativeContent | null;
  currentUserRole?: string;
  currentUserId?: string;
  onAcceptSafeVersion: () => void;
  onApprove: (notes: string) => Promise<void>;
  onReject: (notes: string) => Promise<void>;
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  onScheduleApprove: () => void;
  isApproving: string | null;
  gauntletEnabled: boolean;
}

type ComplianceStatus = 'idle' | 'checking' | 'cleared' | 'warning' | 'flagged';

function getComplianceStatus(
  content: CreativeContent | null,
  gauntletEnabled: boolean,
): ComplianceStatus {
  if (!content) return 'idle';
  if (!gauntletEnabled) return 'idle';
  if (!content.complianceChecks || content.complianceChecks.length === 0) return 'checking';
  const failedChecks = (content.complianceChecks as ComplianceCheck[]).filter(c => !c.passed);
  if (failedChecks.length === 0) return 'cleared';
  if (failedChecks.length <= 1) return 'warning';
  return 'flagged';
}

export function DeeboCompliancePanel({
  content,
  currentUserRole,
  currentUserId,
  onAcceptSafeVersion,
  onApprove,
  onReject,
  date,
  onDateChange,
  onScheduleApprove,
  isApproving,
  gauntletEnabled,
}: DeeboCompliancePanelProps) {
  const [showApprovalChain, setShowApprovalChain] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const complianceStatus = getComplianceStatus(content, gauntletEnabled);
  const failedChecks = (content?.complianceChecks as ComplianceCheck[] | undefined)?.filter(c => !c.passed) ?? [];

  const statusConfig = {
    idle: {
      icon: Shield,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/30',
      borderColor: 'border-border',
      label: 'No content yet',
      sublabel: 'Generate content to run compliance check',
      dot: 'bg-muted-foreground',
    },
    checking: {
      icon: Shield,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      label: 'Checking...',
      sublabel: 'Deebo is reviewing your content',
      dot: 'bg-yellow-500 animate-pulse',
    },
    cleared: {
      icon: ShieldCheck,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      label: 'Cleared',
      sublabel: 'Content meets NY OCM regulations',
      dot: 'bg-green-500',
    },
    warning: {
      icon: ShieldAlert,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      label: 'Caution',
      sublabel: 'Minor compliance issue detected',
      dot: 'bg-amber-500',
    },
    flagged: {
      icon: ShieldOff,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      label: 'Flagged',
      sublabel: 'Content requires revision before publishing',
      dot: 'bg-red-500',
    },
  } as const;

  const cfg = statusConfig[complianceStatus];
  const StatusIcon = cfg.icon;

  return (
    <aside className="w-[280px] border-l border-border flex flex-col bg-card/50 shrink-0 overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">

          {/* ─── Section 1: Deebo Compliance ─── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7 border border-border">
                <AvatarImage src="/avatars/deebo.png" />
                <AvatarFallback className="text-[10px] bg-red-500/20 text-red-400">DB</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-semibold">Deebo</p>
                <p className="text-[10px] text-muted-foreground">Compliance Enforcer</p>
              </div>
              <div className={cn('w-2 h-2 rounded-full ml-auto', cfg.dot)} />
            </div>

            {/* Traffic light card */}
            <motion.div
              key={complianceStatus}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-xl border p-3 space-y-2 transition-colors',
                cfg.bgColor,
                cfg.borderColor,
              )}
            >
              <div className="flex items-center gap-2.5">
                <StatusIcon className={cn('w-5 h-5 shrink-0', cfg.color)} />
                <div>
                  <p className={cn('text-sm font-semibold', cfg.color)}>{cfg.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{cfg.sublabel}</p>
                </div>
              </div>

              {/* Failed checks list */}
              <AnimatePresence>
                {failedChecks.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 pt-1"
                  >
                    {failedChecks.map((check, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <XCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-medium text-red-400 uppercase tracking-wide">
                            {check.checkType.replace(/_/g, ' ')}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-tight">{check.message}</p>
                        </div>
                      </div>
                    ))}

                    {/* Safe version suggestion */}
                    <div className="mt-2 pt-2 border-t border-border/50 space-y-1.5">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-primary" />
                        <p className="text-[10px] font-medium text-primary">Deebo&apos;s Safe Version</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground italic pl-4">
                        &ldquo;May help with relaxation.&rdquo;
                      </p>
                      <Button
                        size="sm"
                        onClick={onAcceptSafeVersion}
                        className="w-full h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Accept Safe Version
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* View Full Report / Approval Chain accordion */}
            {content && (
              <button
                onClick={() => setShowApprovalChain(!showApprovalChain)}
                className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  View Full Report
                </span>
                {showApprovalChain ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            <AnimatePresence>
              {showApprovalChain && content?.approvalState && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <ApprovalChain
                    approvalState={content.approvalState}
                    currentUserRole={currentUserRole}
                    currentUserId={currentUserId}
                    onApprove={onApprove}
                    onReject={onReject}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ─── Section 2: Publishing Schedule ─── */}
          <div className="space-y-3">
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold">Publishing Schedule</p>
              </div>
              {showCalendar ? (
                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>

            {date && !showCalendar && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-primary">
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <button
                  onClick={() => onDateChange(undefined)}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="w-3 h-3" />
                </button>
              </div>
            )}

            <AnimatePresence>
              {showCalendar && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={onDateChange}
                    className="rounded-lg border border-border bg-background w-full p-2"
                    classNames={{
                      head_cell: 'text-muted-foreground font-normal text-[0.7rem]',
                      cell: 'text-center text-sm p-0 relative',
                      day: 'h-7 w-7 p-0 font-normal aria-selected:opacity-100 hover:bg-muted rounded-md transition-colors text-foreground text-xs',
                      day_selected:
                        'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                      day_today: 'bg-border/50 text-foreground',
                      nav_button: 'border border-border hover:bg-muted hover:text-white transition-colors h-6 w-6',
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Publish / Schedule CTA */}
            <Button
              onClick={onScheduleApprove}
              disabled={!content || isApproving !== null}
              className={cn(
                'w-full font-semibold text-sm h-9',
                complianceStatus === 'flagged' || complianceStatus === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50'
                  : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50',
              )}
            >
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : date ? (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Schedule for {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Publish Now
                </>
              )}
            </Button>

            {/* QR / engagement quick stats */}
            {content?.qrDataUrl && (
              <div className="flex items-center gap-3 p-2 rounded-lg border border-border bg-background">
                <img src={content.qrDataUrl} alt="QR" className="w-10 h-10 rounded" />
                <div>
                  <p className="text-xs font-medium">{content.qrStats?.scans ?? 0} scans</p>
                  {content.contentUrl && (
                    <a
                      href={content.contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary flex items-center gap-0.5 mt-0.5"
                    >
                      View page <ArrowUpRight className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ─── Section 3: Asset Library ─── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold">Recent Assets</p>
            </div>

            {content?.mediaUrls && content.mediaUrls.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {content.mediaUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/50 cursor-pointer transition-colors group relative"
                  >
                    <img src={url} alt={`Asset ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] text-white font-medium">Use this</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Image className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">No assets yet</p>
                <p className="text-[10px] mt-0.5">Generated images appear here</p>
              </div>
            )}
          </div>

        </div>
      </ScrollArea>
    </aside>
  );
}
