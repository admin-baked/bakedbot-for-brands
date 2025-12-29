export type ResearchTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ResearchTaskProgress {
  currentStep: string;
  stepsCompleted: number;
  totalSteps: number;
  sourcesFound?: number;
  lastUpdate?: string;
}

export interface ResearchTask {
  id: string;
  userId: string;
  brandId: string;
  query: string;
  depth: number; // 1-5?
  breadth: number; // 1-5?
  status: ResearchTaskStatus;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
  resultReportId?: string; // ID of the generated report
  progress?: ResearchTaskProgress; // Real-time progress tracking
  error?: string; // Error message if failed
}

export interface ResearchReport {
  id: string;
  taskId: string;
  title: string;
  summary: string;
  content: string; // Markdown content
  sources: ResearchSource[];
  createdAt: Date;
  metadata?: {
    total_tokens?: number;
    execution_time_ms?: number;
    agent_version?: string;
  };
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet?: string;
  credibility_score?: number;
}
