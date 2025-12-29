'use client';

import { useState, useEffect, useCallback } from 'react';
import { ResearchTaskStatus, ResearchTaskProgress } from '@/types/research';
import { getResearchTaskStatusAction } from '@/app/dashboard/research/actions';

interface UseResearchTaskStatusOptions {
  taskId: string | null;
  pollingInterval?: number; // ms, default 3000
  enabled?: boolean;
}

interface ResearchTaskStatusResult {
  status: ResearchTaskStatus | null;
  progress: ResearchTaskProgress | null;
  resultReportId: string | null;
  error: string | null;
  isLoading: boolean;
  isPolling: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook for polling research task status in real-time
 * 
 * Polls the server for task status updates while the task is pending/processing.
 * Automatically stops polling when task is completed or failed.
 */
export function useResearchTaskStatus({
  taskId,
  pollingInterval = 3000,
  enabled = true
}: UseResearchTaskStatusOptions): ResearchTaskStatusResult {
  const [status, setStatus] = useState<ResearchTaskStatus | null>(null);
  const [progress, setProgress] = useState<ResearchTaskProgress | null>(null);
  const [resultReportId, setResultReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    try {
      const result = await getResearchTaskStatusAction(taskId);
      
      if (result.success) {
        setStatus(result.status || null);
        setProgress(result.progress || null);
        setResultReportId(result.resultReportId || null);
        setError(result.error || null);
      } else {
        setError(result.error || 'Failed to fetch status');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch status');
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  // Initial fetch
  useEffect(() => {
    if (enabled && taskId) {
      fetchStatus();
    }
  }, [enabled, taskId, fetchStatus]);

  // Polling effect
  useEffect(() => {
    if (!enabled || !taskId) {
      setIsPolling(false);
      return;
    }

    // Only poll while pending or processing
    const shouldPoll = status === 'pending' || status === 'processing' || status === null;
    
    if (!shouldPoll) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    const intervalId = setInterval(fetchStatus, pollingInterval);

    return () => {
      clearInterval(intervalId);
      setIsPolling(false);
    };
  }, [enabled, taskId, status, pollingInterval, fetchStatus]);

  return {
    status,
    progress,
    resultReportId,
    error,
    isLoading,
    isPolling,
    refetch: fetchStatus
  };
}
