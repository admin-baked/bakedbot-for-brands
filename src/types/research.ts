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
  // ChatGPT-style plan — 5 research subtopics generated before execution
  plan?: string[];
  // Set after Drive auto-save completes
  driveFileId?: string;
  // Stored at create time for Drive attribution
  userEmail?: string;
}

export interface ResearchReport {
  id: string;
  taskId: string;
  brandId: string;
  userId: string;
  title: string;
  summary: string;
  content: string; // Markdown content
  sources: ResearchSource[];
  createdAt: Date;
  // Drive file ID — set after auto-save; shows "Saved to Drive" badge in UI
  driveFileId?: string;
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
