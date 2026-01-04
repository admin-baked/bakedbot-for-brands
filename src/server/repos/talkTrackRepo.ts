import { createServerClient } from '@/firebase/server-client';
import { TalkTrack } from '@/types/talk-track';
import { unstable_cache } from 'next/cache';

const CACHE_TAG = 'talk-tracks';

const DEFAULT_TRACKS: TalkTrack[] = [
    {
        id: 'cannabis-menu-discovery',
        name: 'Cannabis Menu Discovery',
        role: 'dispensary',
        triggerKeywords: ['search menus', 'scrape menus', 'menu discovery', 'find competitor menus'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-1',
                order: 1,
                type: 'question',
                thought: "Analyzing scraping constraints... Comparing browser automation vs API latency... Identifying cost-effective paths...",
                message: "Absolutely! Great thinking—computer scraping is indeed slow and expensive. Let me explore some faster alternatives:"
            },
            {
                id: 'step-2',
                order: 2,
                type: 'question',
                thought: "Formulating optimal data ingestion strategy...",
                message: "Good news—there are faster options! Let me ask you a few things to find the best path:\n\n1. **Does Ultra Cannabis have their own website?** (We can scrape direct)\n2. **Do you have WeedMaps merchant access?** (API is instant)\n3. **Any existing data feeds?** (Headset/Metrc)\n\nThe fastest & cheapest approach would be **Option A (Direct API)** or **Option D (Apify)**."
            }
        ]
    },
    {
        id: 'cannabis-menu-scraper-setup',
        name: 'Cannabis Menu Scraper Setup',
        role: 'dispensary',
        triggerKeywords: ['start scraper', 'setup scraper', 'run scrape', 'test scrape'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-1',
                order: 1,
                type: 'response',
                thought: "Initializing headless browser... Navigating to WeedMaps... Finding Ultra Cannabis listing...",
                message: "Perfect! Let me run the test scrape now with the computer, and I'll also research setting up Apify and the direct API options for future runs.\n\nFirst, let me get the **#execmode** channel ID so we can post results."
            },
            {
                 id: 'step-2',
                 order: 2,
                 type: 'response',
                 thought: "Scraping Ultra Cannabis (1035 products)... Found Competitor: Green Acres... Analyzing 40% discount strategy... Calculating margin gaps...",
                 message: "Perfect! 🎉 Test run complete! Here's what I've delivered:\n\n**✅ What's Done**\n*   **Scraped Both Menus**: Ultra Cannabis (1,035 items) vs Green Acres.\n*   **Competitive Intelligence**: Competitor is aggressive (40-50% off). Recommendation: Position Ultra as premium.\n*   **Google Sheet Created**: \"Ultra Cannabis - Detroit\" with dated tabs.\n\n**🚀 Daily Automation Live**\nScheduled for **3:30 PM Central** daily.\n\nQuick question: Would you like me to switch to **Apify** (10x faster) for the production runs?"
            }
        ]
    }
];

/**
 * Get all active talk tracks
 */
export async function getAllTalkTracks(): Promise<TalkTrack[]> {
    return unstable_cache(
        async () => {
             const { firestore } = await createServerClient();
             const snap = await firestore
                .collection('talk_tracks')
                .where('isActive', '==', true)
                .get();

             if (snap.empty) {
                 return DEFAULT_TRACKS;
             }

             return snap.docs.map(doc => ({
                 id: doc.id,
                 ...doc.data()
             })) as TalkTrack[];
        },
        ['all-talk-tracks'],
        { tags: [CACHE_TAG], revalidate: 300 } // Cache for 5 mins
    )();
}

/**
 * Get talk track by trigger keyword
 * This is an inefficient linear scan but acceptable for small number of tracks.
 * In a real system, we'd use a dedicated search service or map.
 */
export async function findTalkTrackByTrigger(prompt: string, role: string): Promise<TalkTrack | null> {
    const tracks = await getAllTalkTracks();
    const normalize = (s: string) => s.toLowerCase().trim();
    const p = normalize(prompt);

    // Filter by role matches first (or 'all')
    const roleMatches = tracks.filter(t => t.role === 'all' || t.role === role);

    // Find first track where prompt contains any trigger keyword
    return roleMatches.find(t => 
        t.triggerKeywords.some(k => p.includes(normalize(k)))
    ) || null;
}

/**
 * Create or Update a Talk Track (Admin only)
 */
export async function saveTalkTrack(track: Omit<TalkTrack, 'id'> & { id?: string }): Promise<string> {
    const { firestore } = await createServerClient();
    const tracksCol = firestore.collection('talk_tracks');

    // Remove undefined fields to prevent Firestore errors
    const data = JSON.parse(JSON.stringify(track)); 
    data.updatedAt = new Date();

    if (track.id) {
        await tracksCol.doc(track.id).set(data, { merge: true });
        return track.id;
    } else {
        data.createdAt = new Date();
        const doc = await tracksCol.add(data);
        return doc.id;
    }
}
