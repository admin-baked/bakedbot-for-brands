import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { ResearchTask, ResearchTaskStatus } from '@/types/research';

export class ResearchService {
  private db = getFirestore();
  private tasksCollection = this.db.collection('research_tasks');
  private reportsCollection = this.db.collection('research_reports');

  /**
   * Creates a new research task to be picked up by the Python Sidecar
   */
  async createTask(userId: string, brandId: string, query: string): Promise<string> {
    const taskRef = this.tasksCollection.doc();
    const taskData: Omit<ResearchTask, 'id'> = {
      userId,
      brandId,
      query,
      depth: 3, // Default for now
      breadth: 3,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
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
   */
  async getTasksByBrand(brandId: string, limit = 10): Promise<ResearchTask[]> {
    const snapshot = await this.tasksCollection
      .where('brandId', '==', brandId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: (data?.createdAt as Timestamp).toDate(),
            updatedAt: (data?.updatedAt as Timestamp).toDate(),
        } as ResearchTask;
    });
  }
}

export const researchService = new ResearchService();
