import { createServerClient } from '@/firebase/server-client';
import { v4 as uuidv4 } from 'uuid';

export interface SupportTicket {
    id: string;
    description: string;
    source: string; // e.g. 'felisha', 'user'
    status: 'open' | 'investigating' | 'resolved';
    createdAt: Date;
    metadata?: any;
}

export const supportService = {
    async createTicket(description: string, source: string, metadata?: any): Promise<SupportTicket> {
        const { firestore } = await createServerClient();
        const id = uuidv4();
        
        const ticket: SupportTicket = {
            id,
            description,
            source,
            status: 'open',
            createdAt: new Date(),
            metadata
        };
        
        // Use 'tickets' collection to align with API
        await firestore.collection('tickets').doc(id).set(ticket);
        return ticket;
    },

    async getOpenTickets(limit: number = 10): Promise<SupportTicket[]> {
        const { firestore } = await createServerClient();
        // Query 'tickets' collection
        // Note: API uses 'status' = 'new', service used 'open'. Let's support both or align.
        // API defaults status to 'new'. 
        // Let's query for 'new', 'open', 'investigating'.
        const snapshot = await firestore.collection('tickets')
            .where('status', 'in', ['new', 'open', 'investigating'])
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
            
        return snapshot.docs.map(d => ({
            ...d.data(),
            id: d.id, // Ensure ID is included
            createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(d.data().createdAt)
        })) as SupportTicket[];
    }
};
