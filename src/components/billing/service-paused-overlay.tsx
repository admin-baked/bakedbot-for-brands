'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, CreditCard, ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePlanInfo } from '@/hooks/use-plan-info';

/**
 * ServicePausedOverlay
 * 
 * A non-dismissible global overlay that appears when a tenant's service is suspended.
 * Blocks interaction with agentic/billing components while allowing background visibility.
 */
export function ServicePausedOverlay() {
  const { subscriptionStatus, tier, isActive, isSuperUser } = usePlanInfo();

  // Show if suspended and NOT a super user
  const isSuspended = subscriptionStatus === 'suspended' || subscriptionStatus === 'canceled' || subscriptionStatus === 'trial_expired';
  
  if (!isSuspended || isSuperUser) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      >
        {/* Backdrop with Blur */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

        {/* Content Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative max-w-lg w-full bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"
        >
          {/* Header Gradient */}
          <div className="h-32 bg-gradient-to-br from-red-500 to-amber-600 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
            <div className="relative bg-white/20 backdrop-blur-xl p-4 rounded-2xl border border-white/30 shadow-xl">
              <ShieldAlert className="w-10 h-10 text-white" />
            </div>
          </div>

          <div className="p-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider mb-4 border border-red-200 dark:border-red-800">
               <Lock className="w-3 h-3" />
               Service Paused
            </div>

            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">
              Payment Required
            </h2>
            
            <p className="text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
              Your account access has been limited due to an outstanding balance or expired subscription. 
              Agentic automations, playbooks, and AI operations are currently offline.
            </p>

            <div className="grid gap-3">
              <Link href="/dashboard/settings/billing" passHref>
                <Button className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-lg shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Update Payment Method
                  <CreditCard className="ml-2 w-5 h-5" />
                </Button>
              </Link>

              <Button 
                variant="ghost" 
                asChild
                className="w-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <Link href="mailto:support@bakedbot.ai">
                  Contact Support for Help
                </Link>
              </Button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="px-8 py-6 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              Status: {subscriptionStatus?.toUpperCase()}
            </div>
            <div>Ref: {new Date().toISOString().split('T')[0]}</div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
