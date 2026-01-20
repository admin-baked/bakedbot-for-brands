
import { supportService } from '@/server/services/support/tickets';

async function main() {
    console.log('Checking for open TICKETS (Unified Collection)...');
    try {
        const tickets = await supportService.getOpenTickets();
        if (tickets.length === 0) {
            console.log('No open tickets found in "tickets" collection.');
        } else {
            console.log(`Found ${tickets.length} open tickets:`);
            tickets.forEach(t => {
                console.log(`[${t.status?.toUpperCase() || 'UNKNOWN'}] ${t.id}`);
                console.log(`   Title/Desc: ${t.title || t.description || 'No Content'}`);
                console.log(`   Source: ${t.source || t.reporterEmail || 'Unknown'}`);
                console.log('---');
            });
        }
    } catch (e) {
        console.error('Error fetching tickets:', e);
    }
}

main();
