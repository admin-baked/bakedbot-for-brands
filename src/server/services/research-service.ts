import { Timestamp, Firestore } from 'firebase-admin/firestore';
import { ResearchTask, ResearchTaskStatus } from '@/types/research';
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
}

export const researchService = new ResearchService();
