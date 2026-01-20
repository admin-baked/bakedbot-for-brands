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
        
        await firestore.collection('support_tickets').doc(id).set(ticket);
        return ticket;
    },

    async getOpenTickets(limit: number = 10): Promise<SupportTicket[]> {
        const { firestore } = await createServerClient();
        const snapshot = await firestore.collection('support_tickets')
            .where('status', 'in', ['open', 'investigating'])
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
            
        return snapshot.docs.map(d => ({
            ...d.data(),
            createdAt: d.data().createdAt?.toDate()
        })) as SupportTicket[];
    }
};
