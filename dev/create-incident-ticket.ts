
import { supportService } from '@/server/services/support/tickets';

async function main() {
    console.log('Simulating automated error capture...');
    try {
        const ticket = await supportService.createTicket(
            "CRASH: BakedBot brand page 'ecstaticedibles' failed to load. Potential unhandled exception in data fetch.",
            "felisha-auto-monitor",
            { url: "https://bakedbot.ai/ecstaticedibles", priority: "critical" }
        );
        console.log(`Ticket created: ${ticket.id}`);
    } catch (e) {
        console.error('Error creating ticket:', e);
    }
}

main();
