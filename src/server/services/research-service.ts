import { Timestamp, Firestore } from 'firebase-admin/firestore';
import { ResearchTask, ResearchTaskStatus, ResearchReport, ResearchTaskProgress } from '@/types/research';
import { getAdminFirestore } from '@/firebase/admin';

export class ResearchService {
  private _db: Firestore | null = null;
  
  private get db(): Firestore {
    if (!this._db) {
      this._db = getAdminFirestore();
    }
    return this._db;
  }
  
  private get tasksCollection() {
    return this.db.collection('research_tasks');
  }
  
  private get reportsCollection() {
    return this.db.collection('research_reports');
  }

  /**
   * Creates a new research task to be picked up by the Python Sidecar
   */
  async createTask(userId: string, brandId: string, query: string, userEmail?: string): Promise<string> {
    const taskRef = this.tasksCollection.doc();
    const taskData: Omit<ResearchTask, 'id'> = {
      userId,
      brandId,
      query,
      userEmail,
      depth: 3, // Default for now
      breadth: 3,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: {
        currentStep: 'Queued',
        stepsCompleted: 0,
        totalSteps: 5,
      }
    };

    // Firebase Admin uses Timestamp, but our type uses Date. 
    // We convert to FS native types for storage, but return types match interface.
    await taskRef.set({
        ...taskData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    });

    return taskRef.id;
  }

  /**
   * Retrieves a task by ID
   */
  async getTask(taskId: string): Promise<ResearchTask | null> {
    const doc = await this.tasksCollection.doc(taskId).get();
    if (!doc.exists) return null;
    
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: (data?.createdAt as Timestamp).toDate(),
      updatedAt: (data?.updatedAt as Timestamp).toDate(),
    } as ResearchTask;
  }

  /**
   * Lists tasks for a specific brand
   * Note: Sorting done client-side to avoid needing a composite index
   */
  async getTasksByBrand(brandId: string, limit = 10): Promise<ResearchTask[]> {
    // Simple query without orderBy to avoid requiring composite index
    const snapshot = await this.tasksCollection
      .where('brandId', '==', brandId)
      .limit(limit * 2) // Fetch more to allow for sorting
      .get();

    const tasks = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: (data?.createdAt as Timestamp)?.toDate() || new Date(),
            updatedAt: (data?.updatedAt as Timestamp)?.toDate() || new Date(),
        } as ResearchTask;
    });

    // Sort client-side by createdAt descending and limit
    return tasks
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Lists tasks for a specific user (used for users without a brandId like super_admin)
   * Note: Sorting done client-side to avoid needing a composite index
   */
  async getTasksByUser(userId: string, limit = 10): Promise<ResearchTask[]> {
    const snapshot = await this.tasksCollection
      .where('userId', '==', userId)
      .limit(limit * 2)
      .get();

    const tasks = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: (data?.createdAt as Timestamp)?.toDate() || new Date(),
            updatedAt: (data?.updatedAt as Timestamp)?.toDate() || new Date(),
        } as ResearchTask;
    });

    return tasks
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Update task progress (called by worker/sidecar)
   */
  async updateTaskProgress(
    taskId: string, 
    status: ResearchTaskStatus, 
    progress?: Partial<ResearchTaskProgress>,
    error?: string
  ): Promise<void> {
    const updateData: Record<string, any> = {
      status,
      updatedAt: Timestamp.now(),
    };
    
    if (progress) {
      updateData.progress = progress;
    }
    
    if (error) {
      updateData.error = error;
    }
    
    await this.tasksCollection.doc(taskId).update(updateData);
  }

  /**
   * Mark task as complete with report ID
   */
  async completeTask(taskId: string, reportId: string): Promise<void> {
    await this.tasksCollection.doc(taskId).update({
      status: 'completed' as ResearchTaskStatus,
      resultReportId: reportId,
      updatedAt: Timestamp.now(),
      progress: {
        currentStep: 'Complete',
        stepsCompleted: 5,
        totalSteps: 5,
        lastUpdate: new Date().toISOString()
      }
    });
  }

  /**
   * Retrieves a research report by ID
   */
  async getReport(reportId: string): Promise<ResearchReport | null> {
    const doc = await this.reportsCollection.doc(reportId).get();
    if (!doc.exists) return null;
    
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: (data?.createdAt as Timestamp)?.toDate() || new Date(),
    } as ResearchReport;
  }

  /**
   * Create a research report
   */
  async createReport(report: Omit<ResearchReport, 'id'>): Promise<string> {
    const reportRef = this.reportsCollection.doc();
    await reportRef.set({
      ...report,
      createdAt: Timestamp.now()
    });
    return reportRef.id;
  }

  // === Roach / BigWorm Synchronous Methods ===

  /**
   * Conducts a synchronous deep dive using Firecrawl Discovery
   */
  async performDeepDive(query: string, depth: number = 2): Promise<any> {
      try {
          const { discovery } = await import('@/server/services/firecrawl');
          if (!discovery.isConfigured()) {
              return { error: 'Discovery Service not configured' };
          }

          // Step 1: Broad Search
          const searchResults = await discovery.search(query);
          
          // Step 2: "Depth" - If depth > 1, we could scrape top results
          // For now, returning search results with metadata
          return {
              query,
              depth,
              results: searchResults
          };
      } catch (e: any) {
          return { error: `Deep dive failed: ${e.message}` };
      }
  }

  /**
   * Conducts a focused academic search
   */
  async performScholarSearch(query: string, limit: number = 5): Promise<any> {
      try {
          const { discovery } = await import('@/server/services/firecrawl');
          if (!discovery.isConfigured()) {
               return { error: 'Discovery Service not configured' };
          }

          // Append academic sites to query
          const academicQuery = `${query} (site:ac.uk OR site:edu OR site:arxiv.org OR site:scholar.google.com OR site:ncbi.nlm.nih.gov)`;
          
          const results = await discovery.search(academicQuery);
          return {
              query,
              type: 'academic',
              results: results ? (results as any[]).slice(0, limit) : []
          };
      } catch (e: any) {
          return { error: `Scholar search failed: ${e.message}` };
      }
  }
}

export const researchService = new ResearchService();
