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
    },
    {
        id: 'linkedin-outreach-playbook',
        name: 'LinkedIn Competitive Intelligence Outreach',
        role: 'dispensary', // Targeted at dispensaries/brands
        triggerKeywords: ['competitive intelligence', 'linkedin outreach', 'setup integration', 'lead gen', 'find leads'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-integration-start',
                order: 1,
                type: 'question',
                triggerKeywords: ['setup a new integration', 'connect app', 'new integration', 'connect to linkedin'],
                thought: "Checking integration catalog... Identifying common connectors... Found: LinkedIn API (Basic)...",
                message: "I'd love to help you set up a new integration! 🚀\n\nTo point you in the right direction, could you tell me:\n\n**1. What service or app would you like to connect to?** (e.g., LinkedIn, Slack, Gmail)\n**2. What task are you trying to automate?**"
            },
            {
                id: 'step-linkedin-limitations',
                order: 2,
                type: 'response',
                triggerKeywords: ['linkedin', 'connect linkedin', 'message on linkedin', 'engage on linkedin'],
                thought: "checking linkedin api capabilities... verifying messaging access... identifying limitations (no feed search)...",
                steps: [
                    "Checking: LinkedIn Marketing Developer Platform...",
                    "Verifying: r_liteprofile, w_member_social...",
                    "Notice: 'Feed Search' not supported via API."
                ],
                message: "I found a LinkedIn integration, but I have some news: the available LinkedIn API doesn't support **browsing the feed** or **searching for posts** directly. 😅\n\nThe current integration supports:\n*   Creating posts\n*   Viewing specific member profiles\n*   Liking/Commenting (if we have the URL)\n\n**Here are your options:**\n\n1.  **Weekly Intelligence Report (Recommended)**: I manually review your top 20 targets and email you a digest.\n2.  **Direct Scraping**: More hands-on setup, fully automated.\n3.  **Hybrid**: Weekly digest + you send me specific URLs for real-time commenting.\n\nWhich approach feels right for you?"
            },
            {
                id: 'step-intelligence-report',
                order: 3,
                type: 'response',
                triggerKeywords: ['option 3', 'weekly report', 'intelligence report', 'monitor competitors'],
                thought: "analyzing bakedbot linkedin intelligence report... prioritizing 30+ targets... identifying social equity dispensaries...",
                steps: [
                    "Analyzing Report: 'BakedBot AI LinkedIn Intelligence'...",
                    "Prioritizing Tier A: Grasshopper Club (IL), Socíale (IL), Sway (IL)...",
                    "Prioritizing Tier B: Pure Oasis (MA), Planted Provisioning (MI)...",
                    "Strategy: 'Value-First Engagement'..."
                ],
                message: "Perfect! I've reviewed your **LinkedIn Intelligence Report** – it's excellently researched. 🧠\n\n**Primary Targets Identification:**\n*   **Tier 1 (Social Equity)**: Grasshopper Club, Socíale, SWAY, Pure Oasis.\n*   **Strategy**: Engage with company pages first, then founders (e.g., Matthew Brewer, Edie Moore).\n\nI'll set up **Option 3 (Hybrid)**:\n1.  **Weekly Digest**: I'll monitor these 20+ priorities.\n2.  **Real-Time**: You send me a URL -> I draft a comment -> You approve.\n\nShall I configure the **Weekly Digest for Wednesday mornings**?"
            },
            {
                id: 'step-rotation-setup',
                order: 4,
                type: 'action',
                triggerKeywords: ['rotate accounts', 'every 2 weeks', 'expand list'],
                thought: "configuring rotation logic... setting pool size to 20... scheduling bi-weekly cycle...",
                steps: [
                    "Configuring Pool: 20 Accounts (Tier A + Tier B)...",
                    "Logic: Rotate 5 targets every Monday...",
                    "Goal: 'Stay on radar without being obvious'..."
                ],
                message: "Brilliant strategy! I'll implement a **Rotating Priority Pool** to keep engagement authentic. 🔄\n\n**The Plan:**\n*   **Pool Size**: 20 Priority Accounts.\n*   **Rotation**: I'll cycle through 5 different targets every week (e.g., Week 1: Grasshopper/Socíale -> Week 2: High Haven/Calyxeum).\n*   **Goal**: Continuous subtle touches across your entire network.\n\nI've updated the scheduler to pull from this dynamic pool."
            },
            {
                id: 'step-final-activation',
                order: 5,
                type: 'action',
                triggerKeywords: ['activate', 'start now', 'monday 9am', 'add to slack'],
                thought: "finalizing monday trigger... connecting to slack... tagging jack allen...",
                steps: [
                    "Creating Trigger: Monday @ 09:00 AM ET...",
                    "Action: Generate Weekly Intelligence Digest...",
                    "Channel: #execmode (Tagging @Jack Allen)...",
                    "Status: LIVE."
                ],
                message: "✅ **Upgrade successful! Your LinkedIn Intelligence Agent is LIVE.**\n\n**System Configuration:**\n*   **Schedule**: Mondays @ 9:00 AM ET.\n*   **Workflow**: Rotating Digest + Optimization Review.\n*   **Delivery**: Email + Slack (#execmode).\n*   **Real-Time**: Ready for your post URLs any time.\n\nI'll send the first digest this coming Monday. 🚀"
            }
        ]
    },
    {
        id: '40-tons-price-tracker',
        name: '40 Tons Price Tracker Playbook',
        role: 'brand', // Targeted at the brand '40 Tons'
        triggerKeywords: ['40 tons', 'track prices', 'daily price check', 'brand tracker', 'check availability'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-website-explore',
                order: 1,
                type: 'response',
                triggerKeywords: ['start tracking', 'check 40 tons', 'bayside cannabis'],
                thought: "Connecting to baysidecannabis.com... analyzing DOM structure... extracting pricing data...",
                steps: [
                    "Navigating to: https://baysidecannabis.com/brands/40-tons/...",
                    "Parsing product grid...",
                    "Extracting: 'Sativa 7pk Preroll' ($80.00)...",
                    "Extracting: 'Chocolope - 4g' ($44.00)..."
                ],
                message: "Perfect! I can see the **Bayside Cannabis** website structure. \n\nI found **6 products** currently available, ranging from **$44 - $80**. \n\nNow, let me check your existing connections to set up the Google Sheet for daily tracking."
            },
            {
                id: 'step-connection-check',
                order: 2,
                type: 'action',
                triggerKeywords: ['check connections', 'setup sheet', 'google drive'],
                thought: "verifying integrations... checking google drive permissions...",
                steps: [
                    "Checking connection: Google Drive (Active)...",
                    "Verifying scope: spreadsheets.currentOnly...",
                    "Allocating resource: Daily Price Agent..."
                ],
                message: "Excellent! You already have a **Google Drive connection** active. ✅\n\nI'll use this to create your **\"40 Tons Price Tracker\"** spreadsheet. \n\nGranting permissions to the Daily Price Agent now..."
            },
            {
                id: 'step-setup-schedule',
                order: 3,
                type: 'action',
                triggerKeywords: ['schedule daily', 'daily run', '9 am'],
                thought: "configuring cron job... setting timezone central...",
                steps: [
                    "Creating Trigger: Daily @ 09:00 AM CST...",
                    "Defining Schema: [Location, Product, Price, Date]...",
                    "Deploying: 40-tons-monitor-v1..."
                ],
                message: "🎉 **Your daily 40 Tons Price Tracker is all set!**\n\n**⚙️ Configuration:**\n*   **Schedule**: Every day at 9:00 AM Central\n*   **Target**: Bayside Cannabis (initial)\n*   **Data**: Location, Product, Price, Date\n*   **Storage**: Google Sheet \"40 Tons Price Tracker\"\n\nYour first automated run is set for tomorrow. Would you like me to run a **test check right now**?"
            },
            {
                id: 'step-first-run-report',
                order: 4,
                type: 'response',
                triggerKeywords: ['run test', 'check now', 'test run'],
                thought: "executing manual run... scraping bayside... writing to sheet...",
                steps: [
                    "Executing: Manual Trigger...",
                    "Scraping: Bayside Cannabis (6 items)...",
                    "Writing to Sheet: Row 2-8..."
                ],
                message: "✅ **Perfect! Your first check is complete.**\n\n**Captured Data (11/13/2025):**\n*   40 Tons - Sativa 7pk Preroll ($80.00)\n*   40 Tons - Chocolope 4g ($44.00)\n*   ...and 4 more.\n\nView your sheet here: **[40 Tons Price Tracker](#)**\n\nReady to expand? I can add more dispensaries. Just paste a list (Weedmaps URLs work great!) and I'll add them to the daily patrol."
            },
            {
                id: 'step-multi-location',
                order: 5,
                type: 'question',
                triggerKeywords: ['add locations', 'test weedmaps', 'more dispensaries'],
                thought: "analyzing new targets... distinguishing weedmaps vs direct...",
                steps: [
                    "Analyzing: Two Buds Dispensary (Weedmaps)...",
                    "Analyzing: Big Gas (Direct Site)...",
                    "Updating Agent Schema: Multi-location support..."
                ],
                message: "Perfect! I've analyzed the new locations. **Weedmaps** links are super easy to scrape, and I can handle direct sites like **Big Gas** too.\n\n**Summary of Coverage:**\n*   **Total Locations**: 7 tracked\n*   **Products**: 25 entries\n*   **Best Price**: $39.82 (Black Market Canna)\n\nDo you want to lock this in and activate the **Daily 60+ Location Sweep**? 🚀"
            }
        ]
    },
    {
        id: 'cannabis-ai-tracker',
        name: 'Cannabis AI Usage Tracker',
        role: 'all', // Available to all roles
        triggerKeywords: ['track ai usage', 'ai adoption', 'cannabis ai tracker', 'research dispensaries'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-infra-setup',
                order: 1,
                type: 'response',
                triggerKeywords: ['setup tracker', 'start research', 'connect wordpress'],
                thought: "checking connections... verifying wordpress api... inspecting google drive access...",
                steps: [
                    "Verifying: WordPress REST API (https://bakedbot.ai/wp-json/bbai/v1)...",
                    "Checking: Google Sheets backup...",
                    "Allocating: Daily Research Agent..."
                ],
                message: "I love this project! 🚀\n\nI'll help you build the **Cannabis AI Usage Tracker**. \n\n**Infrastructure Status:**\n*   **WordPress API**: Ready to receive data at `/wp-json/bbai/v1/orgs`\n*   **Google Sheets**: Backup connection active\n\nI just need your **WordPress Bearer Token** to authenticate the API writes. Can you paste it here?"
            },
            {
                id: 'step-api-auth',
                order: 2,
                type: 'action',
                triggerKeywords: ['bearer token', 'api key', 'auth token'],
                thought: "validating token... testing upsert endpoint... creating backup sheet...",
                steps: [
                    "Testing Token: bbai_02196... (Valid) ✅",
                    "POST /orgs: Upsert Test Org (Success)",
                    "Creating Sheet: 'Cannabis AI Adoption Tracker'..."
                ],
                message: "Perfect! ✅ **API connection is live!**\n\nI've also created your **Google Sheet backup**.\n\nNow, let me set up the **Daily Research Agent**. It will:\n1.  Find 1-3 new dispensaries daily (rotating states: IL -> MI -> CA...)\n2.  Identify AI tools (BakedBot, Jane, Dutchie, etc.)\n3.  Submit to API + Backup to Sheet\n\nShall I force-run the first batch now used the 'Chicago, IL' focus?"
            },
            {
                id: 'step-first-batch',
                order: 3,
                type: 'response',
                triggerKeywords: ['run batch', 'test run', 'start research'],
                thought: "executing research... analysing chicago dispensaries... identifying ai signals...",
                steps: [
                    "Searching: 'Dispensaries Chicago AI tools'...",
                    "Found: Green Leaf Dispensary (Dutchie POS)...",
                    "Found: Ultra Cannabis (BakedBot AI)...",
                    "Submitting: 3 Orgs to API..."
                ],
                message: "🎉 **Research Complete!**\n\nI've found and submitted 3 organizations:\n1.  **Ultra Cannabis** (MI) - *BakedBot AI*\n2.  **Greenlight Dispensary** (MO) - *StrainBrain*\n3.  **Connected Cannabis** (CA) - *Dutchie AI*\n\n**Tracker Stats:**\n*   Total Tracked: 4\n*   States: 3\n*   Tools: 4\n\nThe daily automation is set for **9:00 AM CST**. \n\nBonus: I can set up a **Weekly Optimization Review** (Sundays 7PM) to analyze trends and suggest improvements. Want me to add that?"
            },
            {
                id: 'step-weekly-review',
                order: 4,
                type: 'action',
                triggerKeywords: ['weekly review', 'optimization', 'sunday'],
                thought: "scheduling weekly job... configuring analysis logic...",
                steps: [
                    "Scheduling: Weekly Review (Sun @ 7PM)...",
                    "Configuring: Trend Analysis Module...",
                    "Setting Priority: Business Metrics (Conversion Lift)..."
                ],
                message: "Done! 📅 **Weekly Review Scheduled.**\n\nEvery Sunday, I'll analyze the week's data and email you:\n*   **Performance Metrics** (Orgs added, quality score)\n*   **Gap Analysis** (Missing states/segments)\n*   **Optimization Tips** (e.g. \"Focus on NY next week\")\n\nYou're all set! The system runs on autopilot now. 🚀"
            }
        ]
    },
    {
        id: 'smokey-competitive-outreach',
        name: 'Smokey Competitive Intelligence Outreach',
        role: 'brand', // Suitable for brand/sales roles
        triggerKeywords: ['competitor intel', 'spy on competitors', 'price tracking', 'smokey chat', 'outreach campaign'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-lead-source',
                order: 1,
                type: 'response',
                triggerKeywords: ['upload leads', 'connect sheet', 'start outreach'],
                thought: "scanning google drive for lead sources... analyzing sheet structure... identifying column mappings...",
                steps: [
                    "Found: 'State Database Leads' (10k+ rows)...",
                    "Found: 'Cannabis Dispensary Leads' (241 rows)...",
                    "Mapping Columns: [Business Name, Email, City]...",
                    "Validating: 211 unscrubed leads remaining..."
                ],
                message: "I've found your lead sources! 📂\n\nI recommend starting with the **241-lead Local Sheet** since the emails are already validated. I can switch to the massive **10k State Database** once we exhaust those.\n\n**Current Pipeline Status:**\n*   **Source**: 'Cannabis Dispensary Leads' (Google Sheet)\n*   **Volume**: 10 leads/day (9:00 AM daily)\n*   **Supply**: ~21 days remaining\n\nShall I proceed with setting up the **Competitive Intelligence** email sequence?"
            },
            {
                id: 'step-email-config',
                order: 2,
                type: 'action',
                triggerKeywords: ['setup email', 'configure sequences', 'fomo'],
                thought: "configuring email sequences... setting up a/b branching... activating urgency logic...",
                steps: [
                    "Configuring Branch A: 'Engaged' (High Times hook)...",
                    "Configuring Branch B: 'Unengaged' (City-specific comparison)...",
                    "Activating Module: 'Dynamic Urgency' (${100-customers} spots left)..."
                ],
                message: "Done! 📧 **Email Sequences Configured.**\n\n**Strategy Highlights:**\n*   **Branch A (Engaged)**: Hits hard on the '50% Lifetime Discount' & High Times social proof.\n*   **Branch B (Unengaged)**: Pivots to city-specific pricing questions (e.g., \"Do you know what your Denver competitors feature?\").\n*   **Urgency Engine**: Every email dynamically updates to show: \"Only **${100 - Current_Customers}** spots left.\"\n\nNow, let's connect **Slack** and **Calendly** so you don't miss a beat."
            },
            {
                id: 'step-integrations',
                order: 3,
                type: 'action',
                triggerKeywords: ['connect slack', 'calendly', 'alerts'],
                thought: "connecting slack channels... integrating calendly webhook... setting milestone alerts...",
                steps: [
                    "Connecting: #bakedbot-lead-gen...",
                    "Watching: Calendly (jack@bakedbot.ai auto-add)...",
                    "Setting Milestones: [1, 5, 10, 25, 50, 100]..."
                ],
                message: "Connections live! 🔗\n\n*   **Slack**: Alerts set for #bakedbot-lead-gen (Milestones & Daily Summaries)\n*   **Calendly**: Monitoring for bookings → Auto-inviting Jack\n*   **Bounces**: Auto-pause if bounce rate hits >10%\n\nOne last thing: I can run a **Weekly Optimization Review** every Friday at 4pm to analyze open rates and suggest improvements. Want that turned on?"
            },
            {
                id: 'step-weekly-opt',
                order: 4,
                type: 'response',
                triggerKeywords: ['weekly review', 'optimization', 'friday report'],
                thought: "scheduling friday analysis... configuring kpi tracking...",
                steps: [
                    "Scheduling: Friday @ 4:00 PM...",
                    "Module: 'Deep Dive Analysis' (Open Rate, Reply Rate)...",
                    "Module: 'Recommendation Engine' (A/B Test Suggestions)..."
                ],
                message: "All set! 🚀 **Smokey Chat Competitive Intelligence System is LIVE.**\n\n**Weekly Schedule:**\n*   **Daily (9am)**: 10 emails sent, calendar checked, milestones tracked.\n*   **Fridays (4pm)**: Deep-dive optimization report sent to you.\n\nYou literally don't have to touch anything. I'll ping you on Slack if I need approval for optimizations. Good luck hunting! 🦁"
            }
        ]
    },
    {
        id: 'investor-outreach',
        name: 'Investor Outreach Automation',
        role: 'brand', // Suitable for brand founders/owners
        triggerKeywords: ['investor outreach', 'fundraising', 'vc connect', 'martez mode', 'feedback loop'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-lead-research',
                order: 1,
                type: 'response',
                triggerKeywords: ['find investors', 'start research'],
                thought: "scanning linkedin for investor leads... analyzing posts for psychological archetypes... filtering for cannabis/tech focus...",
                steps: [
                    "Search Query: 'seed stage VCs cannabis tech 2025'...",
                    "Analyzing Profiles: [Jarrid Tingle, Arian Simone, Alex Ferber]...",
                    "Assigning Archetypes: [Visionary, Connector, Data Analyst]...",
                    "Extracting: 'Investment Thesis', 'Portfolio Companies'..."
                ],
                message: "I've identified 5 high-potential investor leads for today! 🕵️‍♂️\n\n**Psychological Profiling Complete:**\n1.  **Jarrid Tingle** (Harlem Capital) - *The Visionary* (Aligned with equity/future thesis)\n2.  **Arian Simone** (Fearless Fund) - *The Connector* (Highly active networker)\n3.  **Alex Ferber** (Greenhouse) - *The Data Analyst* (Focus on metrics/ROI)\n\nI've pulled their recent posts to personalize our hooks. Ready to validate their emails?"
            },
            {
                id: 'step-email-validation',
                order: 2,
                type: 'action',
                triggerKeywords: ['validate emails', 'check bounce', 'verify'],
                thought: "pinging QuickEmailVerification API... checking SMTP status... filtering catch-alls...",
                steps: [
                    "Validating: jarrid@harlem.capital... ✅ VALID",
                    "Validating: arian@fearless.fund... ✅ VALID",
                    "Validating: alex@greenhouse.vc... ⚠️ CATCH-ALL (Flagged for manual review)",
                    "Bounce Guard: Active (<2% target)"
                ],
                message: "Validation Gateway Passed. 🛡️\n\n*   **4 Leads Validated** (Safe to send)\n*   **1 Lead Flagged** (Catch-all address, skipped to protect sender rep)\n\n**Bounce Protection**: Active. If bounce rate hits 2%, I will auto-pause the campaign.\n\nReady to configure the **Feedback-First** outreach sequence?"
            },
            {
                id: 'step-outreach-config',
                order: 3,
                type: 'action',
                triggerKeywords: ['send emails', 'start sequence', 'feedback first'],
                thought: "selecting archetype templates... injecting high times social proof... configuring utm parameters...",
                steps: [
                    "Template A (Visionary): 'The cannabis automation thesis everyone's missing'...",
                    "Template B (Data Analyst): '85% automation rate case study'...",
                    "Social Proof: 'High Times: Industry Leaders' link attached...",
                    "UTM Tagging: ?utm_campaign=VISIONARY_FEEDBACK&utm_content=EMAIL_01"
                ],
                message: "Outreach Configured! 🚀\n\n**Strategy: Feedback-First (No Ask)**\nInstead of pitching, we're asking for their perspective on the **High Times** article calling us 'Industry Leaders'.\n\n*   **Visionaries** get the 'Autonomous Commerce' thesis.\n*   **Analysts** get the 'Unit Economics' data.\n\nEmails will go out staggereed by 10 minutes to mimic human sending."
            },
            {
                id: 'step-behavioral-loop',
                order: 4,
                type: 'response',
                triggerKeywords: ['track signals', 'monitor engagement', 'hot leads'],
                thought: "monitoring open/click events... tracking investment signals... configuring behavioral follow-ups...",
                steps: [
                    "Watching: 'High Times Click' (Interest Signal)...",
                    "Watching: 'Tool Usage' + 'Calendar View' (Hot Lead)...",
                    "Trigger Logic: If NO_OPEN -> Send 'Press Coverage' follow-up in 3 days..."
                ],
                message: "Behavioral Intelligence Active. 🧠\n\nI'm tracking **Investment Signals** vs just opens:\n*   **Signal**: Clicks High Times link -> They're validating credibility.\n*   **Hot Lead**: Uses Free Audit Tool + Views Calendar -> **I'll Slack you immediately.**\n\nI'll send you a **Daily Report** every evening at 6PM with your stats. Good luck! 💸"
            }
        ]
    },
    {
        id: 'dispensary-deal-scout',
        name: 'Dispensary Deal Scout',
        role: 'dispensary', // Targeted at dispensary operators/analysts
        triggerKeywords: ['monitor competitors', 'monitor competitor pricing', 'price drop', 'deal scout', 'price watch', 'daily scrape', 'competitor pricing'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-deal-hunt',
                order: 1,
                type: 'response',
                triggerKeywords: ['start hunt', 'scrape menus'],
                thought: "initializing scraper for target dispensaries... parsing menu items for discounts... filtering standard pricing...",
                steps: [
                    "Target 1: West Coast Meds (Menu Scrape)... Found 5 active promos.",
                    "Target 2: Ultra Cannabis (Menu Scrape)... Found 1 active promo.",
                    "Filtering: 'Stiiizy Blue Dream' (14% Off)...",
                    "Filtering: 'Banned Berry Melon' (23% Off)..."
                ],
                message: "I've completed the **Daily Deal Hunt**! 🦅\n\n**Findings:**\n*   **West Coast Meds**: 5 active deals found (avg 15% off).\n*   **Ultra Cannabis**: 1 active deal found (15% off).\n\nKey finding: West Coast Meds has a deep discount (23%) on 'Banned Berry Melon' edibles today. \n\nLogging these to your audit spreadsheet now..."
            },
            {
                id: 'step-audit-log',
                order: 2,
                type: 'action',
                triggerKeywords: ['log deals', 'update sheet'],
                thought: "connecting to google sheets... checking for duplicates... appending new rows...",
                steps: [
                    "Sheet: 'Dispensary Deals - Daily Audit'...",
                    "Check: Row 85 'Stiiizy Blue Dream' (Duplicate - Skipping)...",
                    "Action: appending 6 new rows...",
                    "Status: Clean data confirmed."
                ],
                message: "Audit Log Updated. ✅\n\nI've added today's deals to your **Google Sheet**. I cross-referenced against 85 existing entries to ensure no duplicates.\n\n**Spreadsheet Link**: [View Full Audit](https://docs.google.com/spreadsheets)\n\nPreparing your daily email report for the executive team..."
            },
            {
                id: 'step-daily-report',
                order: 3,
                type: 'action',
                triggerKeywords: ['send report', 'email update'],
                thought: "formatting html email... adding deal summary... sending to distribution list...",
                steps: [
                    "Formatting: '🌿 Daily Dispensary Deals Report'...",
                    "Recipients: jack@bakedbot.ai, martez@bakedbot.ai...",
                    "Sending via Gmail API..."
                ],
                message: "Daily Report Sent! 📧\n\n**Recipients:**\n*   Jack (jack@bakedbot.ai)\n*   Martez (martez@bakedbot.ai)\n\nThe email includes a clean breakdown of all 6 deals found today. This automation is scheduled to run every morning at **9:00 AM**.\n\nWould you like me to run a **Weekly Optimization Review** to look for pricing trends?"
            },
            {
                id: 'step-weekly-optimization',
                order: 4,
                type: 'response',
                triggerKeywords: ['weekly review', 'analyze trends'],
                thought: "triggering weekly analysis webhook... calculating pricing trends... identifying optimization opportunities...",
                steps: [
                    "Triggering: Weekly Review Webhook...",
                    "Analyzing: 7-day pricing variance...",
                    "Recommendation: 'Deepen edible discounts on Tuesdays'..."
                ],
                message: "Weekly Analysis Complete. 📊\n\nI've analyzed the last 7 days of deal data. \n\n**Insight**: Competitors are aggressive on Edibles on Tuesdays (20%+ off). We should consider matching this next week.\n\nI'll keep this webhook active for your Monday morning reviews!"
            }
        ]
    },
    {
        id: 'ezal-competitive-intelligence',
        name: 'Ezal Competitive Intelligence (Multi-Vertical)',
        role: 'all', // Serving Brands, Dispensaries, Investors, Social Equity
        triggerKeywords: ['ezal', 'competitive research', 'track competitors', 'market spider', 'hemp intel', 'investor demo'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-multi-vertical-research',
                order: 1,
                type: 'response',
                triggerKeywords: ['research business', 'analyze competitors', 'hemp research'],
                thought: "identifying vertical (Cannabis vs Hemp vs CBD)... selecting crawler strategy... parsing regulatory framework...",
                steps: [
                    "Input: 'Carolina Hemp Lab' (Hemp Flower Brand)...",
                    "Vertical Detected: Hemp/CBD (Federally Legal, Nationwide Shipping)...",
                    "Crawling Competitors: 'Horn Creek Hemp' + 'Fern Valley Farms'...",
                    "Analyzing: Terpene profiles, bulk pricing, shipping policies..."
                ],
                message: "I've initialized the **Ezal Competitive Engine**. 🕷️\n\n**Target Analysis:**\n*   **Business**: Carolina Hemp Lab\n*   **Sector**: Hemp/CBD (Flower Focus)\n*   **Competitors Found**: Horn Creek Hemp, Fern Valley Farms\n\n**Vertical Context**: Unlike cannabis, I'm analyzing nationwide shipping policies and bulk-weight pricing structures.\n\nReady to configure the **14-Day Trial**?"
            },
            {
                id: 'step-campaign-config',
                order: 2,
                type: 'action',
                triggerKeywords: ['configure trial', 'setup campaign', 'ab testing'],
                thought: "assigning trial length... selecting a/b variant... configuring social bonus params...",
                steps: [
                    "Trial Type: Hemp/CBD Standard (5 Days)...",
                    "A/B Assignment: Randomizing... Variant B ('Autonomous Competitive Analysis')...",
                    "Social Bonus: 'BakedBot AI FTW' screenshot tracking enabled..."
                ],
                message: "Campaign Configured. ⚙️\n\n*   **Trial Length**: 5 Days (Extendable to 6)\n*   **Subject Line**: Variant B (Market Intelligence focus)\n*   **Social Bonus**: Active. If they share a screenshot, I'll auto-unlock Day 6.\n\nI've also queued the **Q3 Snapshot** link for the footer to stoke interest without pitching."
            },
            {
                id: 'step-investor-demo',
                order: 3,
                type: 'response',
                triggerKeywords: ['investor demo', 'track shares', 'investor outreach'],
                thought: "detecting investor profile... generating demo report... tracking deck engagement...",
                steps: [
                    "Investor Detected: 'Backstage Capital'...",
                    "Action: Generating 'Pure Options Detroit' competitive report as DEMO...",
                    "Tracking: Monitoring opens/clicks on 'Q3 Snapshot' link...",
                    "Goal: Convert to meeting."
                ],
                message: "Investor Demo Mode Active. 💼\n\nI'm sending the competitive report to **Backstage Capital** not as a lead, but as a **Product Demo**.\n\n**Strategy**:\n1.  Show them AI in action (Pure Options analysis).\n2.  Link to **Q3 Snapshot** (Proof of traction).\n3.  Ask for meeting to discuss scaling this technology."
            },
            {
                id: 'step-health-optimization',
                order: 4,
                type: 'action',
                triggerKeywords: ['monitor bounces', 'weekly optimize', 'health check'],
                thought: "checking mail delivery subsystem... removing hard bounces... calculating weekly bounce rate...",
                steps: [
                    "Bounce Monitor: Checking last 24h...",
                    "Hard Bounces: 0 found (Clean) ✅...",
                    "Weekly KPI: Bounce Rate < 2% (Current: 0.8%)...",
                    "Optimization: Expanding 'Hemp Conversion' keywords for next week."
                ],
                message: "System Health Green. 🟢\n\n*   **Bounce Rate**: 0.8% (Excellent)\n*   **Optimization**: I've added 'Hemp Conversion' to our crawler logic for next week based on high engagement signals.\n\n**Weekly Summary**: Sent to #execmode."
            }
        ]
    },
    {
        id: 'media-outreach-automation',
        name: 'Media Outreach Automation (Podcasts & Press)',
        role: 'brand', // Targeted at brand building/PR
        triggerKeywords: ['media outreach', 'find podcasts', 'pitch journalists', 'cannabis pr', 'media domination'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-media-research',
                order: 1,
                type: 'response',
                triggerKeywords: ['find media', 'start research', 'podcast search'],
                thought: "scanning spotify api... scraping apple podcasts... parsing mjbizdaily via firecrawl... identifying host chemicals...",
                steps: [
                    "Source: Spotify ('Cannabis Business')... Found: 'The Cannabis Equipment News'...",
                    "Source: MJBizDaily... Found: 'Chris Roberts' (Journalist)...",
                    "Source: LinkedIn... Found: 'Dustin Hoxworth' (Editor)...",
                    "Status: 25 New Contacts Added to Sheet."
                ],
                message: "I've completed the **Daily Lead Research (25/25)**! 🕵️‍♂️\n\n**Top Discoveries:**\n1.  **Dustin Hoxworth** (Cannabis Tech) - *Editor* (Focus: Innovation)\n2.  **Chris Roberts** (MJBizDaily) - *Journalist* (Focus: Retail Trends)\n3.  **Joey Brabo** (Respect My Region) - *Podcaster*\n\n**Data Collected:** Email, LinkedIn, Recent Article/Episode.\n\nShall I proceed to **Step 2: Email Validation**?"
            },
            {
                id: 'step-email-validation',
                order: 2,
                type: 'action',
                triggerKeywords: ['validate emails', 'verify list', 'check bounces'],
                thought: "pinging QuickEmailVerification API... filtering catch-alls... formatting validation report...",
                steps: [
                    "Input: 25 Emails...",
                    "Validating: dustin@cannabistech.com... ✅ VALID",
                    "Validating: chris.roberts@mjbizdaily.com... ✅ VALID",
                    "Validating: info@podcaster.com... ⚠️ CATCH-ALL",
                    "Result: 92% Pass Rate."
                ],
                message: "Validation Complete. 🛡️\n\n*   **Valid**: 21 contacts (Ready to Send)\n*   **Catch-All**: 3 contacts (Manual Review suggested)\n*   **Invalid**: 1 contact (Removed)\n\n**Do-Not-Contact Check**: System skipped 'Margaret Jackson' (Status: Retired). ✅\n\nReady to launch **Phase 3: Outreach Sequence**?"
            },
            {
                id: 'step-outreach-sequence',
                order: 3,
                type: 'action',
                triggerKeywords: ['start outreach', 'send emails', 'launch sequence'],
                thought: "selecting templates... injecting press social proof... generating utm links...",
                steps: [
                    "Queueing Email 0 (Press Opener): 'We're in High Times'...",
                    "Queueing Email 1 (Story Idea): 'AI rewriting retail'...",
                    "Generating UTMs: ?utm_source=email&utm_campaign=media-outreach...",
                    "Volume: 5 emails today (Ramp-up schedule)."
                ],
                message: "Outreach Sequence Active. 🚀\n\n**Today's Batch (5 Emails):**\n1.  **Opener**: 'We're in High Times' (Social Proof First)\n2.  **Target**: MJBizDaily, Cannabis Tech, NYT\n3.  **Tracking**: UTMs active on all links.\n\n**Sequence Logic:**\n*   If NO OPEN (24h) -> Send Email 1 ('Story Idea')\n*   If CLICKED -> Move to 'A-Path' (Equity Focus)\n\nI'll handle the daily staggering automatically."
            },
            {
                id: 'step-engagement',
                order: 4,
                type: 'action',
                triggerKeywords: ['engage social', 'linkedin likes', 'twitter reply'],
                thought: "scanning linkedin feed... analyzing recent posts... generating relevant comments...",
                steps: [
                    "Target: Dustin Hoxworth (LinkedIn)...",
                    "Action: Like recent post about 'Cannabis AI'...",
                    "Comment: 'Great insight on automation, Dustin. We're seeing similar efficiency gains.'...",
                    "Status: 5 Interactions logged."
                ],
                message: "Social Engagement Logged. 💬\n\nI've warmed up 5 targets on LinkedIn/Twitter to get on their radar before the emails land.\n\n*   **Liked**: 5 Posts\n*   **Commented**: 3 Posts (Strategic value-add)\n\nThis increases email open rates by ~40%."
            },
            {
                id: 'step-weekly-report',
                order: 5,
                type: 'response',
                triggerKeywords: ['weekly report', 'media wins', 'friday summary'],
                thought: "aggregating ga4 data... calculating open rates... identifying hot leads...",
                steps: [
                    "GA4 Query: utm_campaign=media-outreach...",
                    "Analysis: Email 0 CTR (12%) vs Email 1 CTR (8%)...",
                    "Hot Leads: Chris Roberts (Clicked 'Deck')...",
                    "Drafting Report: Sent to martez@bakedbot.ai."
                ],
                message: "Weekly Media Report Generated. 📊\n\n**Highlights:**\n*   **New Leads**: +25\n*   **Response Rate**: 8% (2 Replies)\n*   **Top Outlet**: MJBizDaily (Most clicks)\n\n**Action Item**: Chris Roberts clicked your Pitch Deck link twice. I recommend a manual follow-up via LinkedIn.\n\nReport sent to your inbox!"
            }
        ]
    },
    {
        id: 'company-news-digest',
        name: 'Weekly Company News Digest',
        role: 'all', // Available to any user
        triggerKeywords: ['news about my company', 'company news', 'weekly articles', 'send articles', 'news digest', 'press mentions'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-company-name',
                order: 1,
                type: 'question',
                triggerKeywords: ['news about', 'articles about', 'company mentions'],
                thought: "Preparing news monitoring workflow... Need company name to configure search...",
                message: "I'll set up a weekly task to search for and send you articles about your company. First, I need to know: **What's the name of your company?**"
            },
            {
                id: 'step-trigger-setup',
                order: 2,
                type: 'action',
                triggerKeywords: ['bakedbot', 'my company is', 'company name'],
                thought: "configuring weekly trigger... setting up news search... scheduling Monday 9am...",
                steps: [
                    "Creating Trigger: 'Weekly Company News'...",
                    "Schedule: Every Monday @ 09:00 AM...",
                    "Search Query: [Company Name] news articles...",
                    "Delivery: Email digest."
                ],
                message: "Perfect! ✨ I've set up a weekly trigger to send you news about your company.\n\n**Here's what you can expect:**\n*   **When**: Every Monday at 9:00 AM\n*   **What**: I'll search for recent articles and news mentioning your company and send you a compiled list via email\n\nThe first run will happen next Monday. Each week, I'll gather the latest articles and deliver them straight to your inbox so you can stay on top of what's being said about your company.\n\nWould you like me to **test this by running it now** so you can see what the report will look like?"
            },
            {
                id: 'step-test-run',
                order: 3,
                type: 'response',
                triggerKeywords: ['test now', 'run now', 'show me'],
                thought: "executing test run... searching news sources... compiling digest...",
                steps: [
                    "Searching: Google News, MJBizDaily, Cannabis Business Times...",
                    "Found: 5 recent articles...",
                    "Compiling digest...",
                    "Sending to inbox..."
                ],
                message: "✅ Your weekly news digest has been sent! This week's email highlights recent press coverage and industry mentions.\n\n**Next update**: Monday at 9:00 AM.\n\nI'll keep you informed automatically each week. 📰"
            }
        ]
    },
    {
        id: 'daily-cannabis-news-digest',
        name: 'Daily Cannabis News Digest',
        role: 'all',
        triggerKeywords: ['cannabis news', 'daily news', 'industry news', 'send cannabis news', 'news to email', 'daily summary'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-check-connections',
                order: 1,
                type: 'action',
                triggerKeywords: ['daily summary', 'cannabis news', 'news to email'],
                thought: "checking available connections... verifying gmail access... preparing news search...",
                steps: [
                    "Checking Connections: Gmail...",
                    "Status: Gmail (Connected) ✅",
                    "Preparing: Cannabis News Search..."
                ],
                message: "I'll help you set up daily cannabis news summaries! 📰\n\nPerfect! You already have **Gmail connected**. Let me set up a daily automated task to search for cannabis news, summarize it, and send it to your email.\n\nWould you like me to **send the first one now** so you can see what it looks like?"
            },
            {
                id: 'step-send-first',
                order: 2,
                type: 'action',
                triggerKeywords: ['send first', 'send now', 'yes', 'do it'],
                thought: "searching cannabis news sources... aggregating headlines... composing email digest...",
                steps: [
                    "Searching: MJBizDaily, Cannabis Business Times, Leafly News...",
                    "Found: 8 articles from last 24 hours...",
                    "Summarizing key stories...",
                    "Sending to: your email..."
                ],
                message: "✅ Your first cannabis news digest has been sent!\n\n**Today's Headlines:**\n*   Regulatory updates from state markets\n*   Industry M&A activity\n*   Retail trends and consumer insights\n\nNow let's set up the daily automation. **What time would you like to receive your daily cannabis news summary?**"
            },
            {
                id: 'step-schedule-setup',
                order: 3,
                type: 'action',
                triggerKeywords: ['9am', '8am', 'morning', 'every day', 'daily at'],
                thought: "configuring daily trigger... setting preferred time... activating automation...",
                steps: [
                    "Creating Trigger: 'Daily Cannabis News'...",
                    "Schedule: Every day @ [Time]...",
                    "Source: Industry news aggregation...",
                    "Delivery: Email digest."
                ],
                message: "🎉 **Daily Cannabis News Digest is now LIVE!**\n\n**Configuration:**\n*   **Schedule**: Every day at your preferred time\n*   **Content**: Top cannabis industry headlines, regulatory updates, market trends\n*   **Delivery**: Email to your inbox\n\nYou'll receive your first automated digest tomorrow. Stay informed! 🌿"
            }
        ]
    },
    {
        id: 'direct-api-connection',
        name: 'Direct API Connection Setup',
        role: 'all',
        triggerKeywords: ['direct api', 'api connection', 'connect api', 'custom api', 'api endpoint', 'rest api'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-service-selection',
                order: 1,
                type: 'question',
                triggerKeywords: ['setup api', 'direct api connection', 'new api'],
                thought: "Preparing API connection workflow... Need to identify target service...",
                message: "I'd be happy to help you set up a direct API connection! 🔌\n\nTo get started, I'll need to know: **Which service or API would you like to connect to?**\n\n*Examples: Stripe, Airtable, HubSpot, a custom internal API, etc.*\n\nOnce you let me know, I'll guide you through gathering the necessary details like the API endpoint and authentication credentials."
            },
            {
                id: 'step-gather-credentials',
                order: 2,
                type: 'question',
                triggerKeywords: ['airtable', 'hubspot', 'custom', 'internal'],
                thought: "identifying api type... preparing credential collection...",
                steps: [
                    "Identified: [Service Name]...",
                    "Checking: Authentication requirements...",
                    "Preparing: Credential collection form..."
                ],
                message: "Great choice! To connect to this API, I'll need:\n\n1. **API Endpoint URL** (e.g., `https://api.service.com/v1`)\n2. **Authentication Type** (API Key, OAuth, Bearer Token?)\n3. **Credentials** (API Key or Token)\n\nYou can paste these directly in the chat, or I can help you find where to get them in the service's dashboard."
            },
            {
                id: 'step-test-connection',
                order: 3,
                type: 'action',
                triggerKeywords: ['here is', 'my api key', 'endpoint is', 'credentials'],
                thought: "validating credentials... testing connection... verifying permissions...",
                steps: [
                    "Storing: Credentials (encrypted)...",
                    "Testing: API endpoint connectivity...",
                    "Verifying: Authentication success...",
                    "Checking: Available endpoints..."
                ],
                message: "✅ **Connection Successful!**\n\nI've verified the API connection and stored your credentials securely.\n\n**Available Actions:**\n*   Make GET/POST requests\n*   Set up scheduled data pulls\n*   Trigger actions from other workflows\n\nWhat would you like to do with this connection?"
            }
        ]
    },
    // ==========================================
    // DISPENSARY TALK TRACKS
    // ==========================================
    
    // --- Menu & Inventory ---
    {
        id: 'dispensary-menu-sync',
        name: 'Menu Sync from POS',
        role: 'dispensary',
        triggerKeywords: ['sync menu', 'sync from dutchie', 'connect pos', 'import menu', 'update menu from'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-pos-selection',
                order: 1,
                type: 'question',
                thought: "Checking POS integrations... Identifying available connectors...",
                message: "I can sync your menu from your POS system! 🔄\n\n**Which POS are you using?**\n*   Dutchie\n*   Flowhub\n*   Jane\n*   Treez\n*   Other\n\nOnce connected, I'll keep your menu automatically updated."
            },
            {
                id: 'step-sync-execute',
                order: 2,
                type: 'action',
                triggerKeywords: ['dutchie', 'flowhub', 'jane', 'treez'],
                thought: "Connecting to POS API... Fetching product catalog... Mapping categories...",
                steps: [
                    "Connecting: POS API...",
                    "Fetching: Product catalog...",
                    "Mapping: Categories & pricing...",
                    "Syncing: 250 products..."
                ],
                message: "✅ **Menu Synced Successfully!**\n\n**Summary:**\n*   📦 Products imported: 250\n*   🏷️ Categories: 8\n*   💰 Prices updated: All current\n\nYour menu will auto-sync every 15 minutes. Want me to set up **low stock alerts**?"
            }
        ]
    },
    {
        id: 'dispensary-inventory-alerts',
        name: 'Low Stock Inventory Alerts',
        role: 'dispensary',
        triggerKeywords: ['low stock', 'running low', 'inventory alerts', 'out of stock', 'stock levels'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-check-inventory',
                order: 1,
                type: 'action',
                thought: "Scanning inventory levels... Checking reorder points... Identifying critical items...",
                steps: [
                    "Scanning: Current inventory...",
                    "Checking: Reorder thresholds...",
                    "Identifying: Critical items..."
                ],
                message: "📦 **Inventory Alert Report**\n\n**⚠️ Low Stock (Order Soon):**\n*   Stiiizy OG Kush 1g - 5 units left\n*   Cookies Gary Payton 3.5g - 3 units\n*   Select Elite Cart 0.5g - 8 units\n\n**🚨 Out of Stock:**\n*   Raw Garden Live Resin 1g\n\nWould you like me to **draft a reorder** or **set up automatic alerts**?"
            },
            {
                id: 'step-setup-alerts',
                order: 2,
                type: 'action',
                triggerKeywords: ['set up alerts', 'automatic alerts', 'notify me'],
                thought: "Configuring alert thresholds... Setting notification preferences...",
                message: "✅ **Low Stock Alerts Activated!**\n\nI'll notify you when any product drops below 10 units.\n\n**Delivery:**\n*   📧 Email: Daily summary\n*   📱 SMS: Critical (below 3 units)\n\nYou can adjust thresholds in Settings anytime."
            }
        ]
    },
    {
        id: 'dispensary-bulk-pricing',
        name: 'Bulk Price Update',
        role: 'dispensary',
        triggerKeywords: ['update prices', 'bulk pricing', 'change prices', 'price increase', 'price decrease', 'adjust prices'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-pricing-scope',
                order: 1,
                type: 'question',
                thought: "Preparing bulk pricing tool... Need to identify scope...",
                message: "I can update prices in bulk! 💰\n\n**What would you like to adjust?**\n1.  All products by X%\n2.  Specific brand (e.g., \"All Stiiizy +10%\")\n3.  Specific category (e.g., \"All Edibles -5%\")\n4.  Match competitor pricing\n\nTell me the scope and I'll preview the changes before applying."
            },
            {
                id: 'step-preview-changes',
                order: 2,
                type: 'action',
                triggerKeywords: ['stiiizy', 'cookies', 'all products', 'edibles', 'flower', 'by 10%', 'by 5%'],
                thought: "Calculating new prices... Generating preview... Checking margins...",
                steps: [
                    "Calculating: New prices...",
                    "Generating: Preview...",
                    "Checking: Margin impact..."
                ],
                message: "📊 **Price Update Preview**\n\n| Product | Current | New | Change |\n|---------|---------|-----|--------|\n| Stiiizy OG 1g | $45 | $49.50 | +10% |\n| Stiiizy Blue Dream | $40 | $44 | +10% |\n| ... 12 more products |\n\n**Margin Impact**: +$2.50 avg per unit\n\n✅ **Apply these changes?** (Type \"confirm\" to proceed)"
            },
            {
                id: 'step-apply-changes',
                order: 3,
                type: 'action',
                triggerKeywords: ['confirm', 'yes', 'apply'],
                thought: "Applying price updates... Syncing to POS... Updating menu...",
                message: "✅ **Prices Updated!**\n\n14 products updated successfully. Changes are now live on your menu and synced to your POS."
            }
        ]
    },
    {
        id: 'dispensary-dead-stock',
        name: 'Dead Stock Analysis',
        role: 'dispensary',
        triggerKeywords: ['dead stock', 'slow sellers', 'not selling', 'sitting inventory', 'stale products'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-analyze-stock',
                order: 1,
                type: 'action',
                thought: "Analyzing sales velocity... Identifying slow movers... Calculating days on shelf...",
                steps: [
                    "Analyzing: 90-day sales velocity...",
                    "Identifying: Slow movers...",
                    "Calculating: Days on shelf..."
                ],
                message: "📉 **Dead Stock Report**\n\n**Products with 0 sales in 30+ days:**\n| Product | Days on Shelf | Units | Tied Capital |\n|---------|--------------|-------|---------------|\n| Kushy Punch 100mg | 45 days | 24 | $480 |\n| Old Pal Shake 14g | 38 days | 12 | $180 |\n| Wyld Marionberry | 32 days | 18 | $270 |\n\n**Total Capital Tied**: $930\n\n**Recommendations:**\n1.  Bundle with popular items\n2.  Flash sale (20% off)\n3.  Return to vendor (if possible)\n\nWant me to **create a clearance promotion**?"
            }
        ]
    },
    
    // --- Competitive Intelligence ---
    {
        id: 'dispensary-competitor-pricing',
        name: 'Competitor Price Comparison',
        role: 'dispensary',
        triggerKeywords: ['competitor prices', 'what are competitors charging', 'price comparison', 'compare prices', 'market prices'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-gather-intel',
                order: 1,
                type: 'action',
                thought: "Scanning competitor menus... Aggregating pricing data... Comparing categories...",
                steps: [
                    "Scanning: 5 nearby competitors...",
                    "Aggregating: Pricing data...",
                    "Comparing: Key categories..."
                ],
                message: "🕵️ **Competitor Price Analysis**\n\n**1/8oz Flower Comparison:**\n| Dispensary | Avg Price | vs You |\n|------------|-----------|--------|\n| Green Thumb | $38 | -$7 |\n| The Dispensary | $42 | -$3 |\n| **You** | $45 | — |\n| Harvest | $48 | +$3 |\n\n**Insights:**\n*   You're 8% above market average\n*   Green Thumb is undercutting on premium flower\n*   Opportunity: Match on top sellers, premium on exclusive\n\nWant a **full category breakdown** or **price alert setup**?"
            }
        ]
    },
    {
        id: 'dispensary-deals-monitor',
        name: 'Competitor Deals Monitor',
        role: 'dispensary',
        triggerKeywords: ['competitor deals', 'deals near me', 'what deals', 'promotions nearby', 'competitor specials'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-scan-deals',
                order: 1,
                type: 'action',
                thought: "Crawling competitor websites... Extracting promotions... Categorizing deals...",
                steps: [
                    "Crawling: Competitor websites...",
                    "Extracting: Current promotions...",
                    "Categorizing: By type..."
                ],
                message: "🔥 **Active Competitor Deals**\n\n**Green Thumb (2.3 mi)**\n*   🏷️ 20% off all Stiiizy today\n*   🎁 BOGO 50% off edibles\n\n**The Dispensary (3.1 mi)**\n*   💨 $25 1/8ths (house brand)\n*   👤 First-time: 25% off\n\n**Harvest (4.5 mi)**\n*   📅 Happy Hour 4-7pm: 15% off\n\n**Recommendation**: Consider a counter-offer on Stiiizy or highlight your exclusive strains.\n\nWant me to **set up daily deal alerts**?"
            }
        ]
    },
    {
        id: 'dispensary-market-snapshot',
        name: 'Market Competitive Snapshot',
        role: 'dispensary',
        triggerKeywords: ['competitive snapshot', 'market analysis', 'market overview', 'competition report', 'competitive analysis'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-full-analysis',
                order: 1,
                type: 'action',
                thought: "Compiling market data... Analyzing positioning... Identifying opportunities...",
                steps: [
                    "Compiling: Market data...",
                    "Analyzing: Competitive positioning...",
                    "Identifying: Opportunities & threats..."
                ],
                dataView: 'competitor_map',
                message: "📊 **Competitive Market Snapshot**\n\n**Your Market Position**: #3 of 8 dispensaries in 5-mile radius\n\n**Strengths:**\n✅ Best selection of live resin\n✅ Highest Google rating (4.7⭐)\n✅ Only store with same-day delivery\n\n**Vulnerabilities:**\n⚠️ Flower prices 8% above average\n⚠️ No loyalty program visible\n⚠️ Limited edible variety\n\n**Opportunities:**\n💡 Green Thumb has 23 out-of-stock items\n💡 No competitor offers CBD-only products\n💡 Weekend traffic peak (capture with deals)\n\nWant me to **dive deeper** into any area?"
            }
        ]
    },
    
    // --- Marketing & Customer Engagement ---
    {
        id: 'dispensary-sms-campaign',
        name: 'SMS Text Blast Campaign',
        role: 'dispensary',
        triggerKeywords: ['text blast', 'sms campaign', 'send text', 'mass text', 'text customers'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-campaign-setup',
                order: 1,
                type: 'question',
                thought: "Preparing SMS campaign builder... Loading customer segments...",
                message: "📱 **SMS Campaign Builder**\n\nLet's set up your text blast!\n\n**Who should receive this?**\n1.  All customers (2,340 contacts)\n2.  VIP customers (180 contacts)\n3.  Inactive 30+ days (420 contacts)\n4.  Recent purchasers (890 contacts)\n5.  Custom segment\n\nAnd briefly, **what's the message about?** (e.g., \"4/20 sale 30% off\")"
            },
            {
                id: 'step-draft-message',
                order: 2,
                type: 'action',
                triggerKeywords: ['all customers', 'vip', '4/20', 'sale', 'discount', 'deal'],
                thought: "Drafting compliant SMS... Checking character count... Adding opt-out...",
                steps: [
                    "Drafting: SMS content...",
                    "Checking: Compliance (TCPA)...",
                    "Adding: Opt-out language..."
                ],
                message: "📝 **Draft SMS** (156 chars)\n\n```\n🔥 4/20 SALE! 30% off storewide this weekend only! Shop now: [link]\n\nReply STOP to opt out.\n```\n\n**Audience**: All customers (2,340)\n**Est. Cost**: $23.40\n\n✅ **Send now** or **schedule for later**?"
            },
            {
                id: 'step-send-confirm',
                order: 3,
                type: 'action',
                triggerKeywords: ['send now', 'schedule', 'confirm'],
                thought: "Queuing messages... Sending via Twilio... Tracking delivery...",
                message: "✅ **SMS Campaign Sent!**\n\n*   📤 Messages queued: 2,340\n*   ⏱️ Est. delivery: 5 minutes\n*   📊 Tracking: Real-time in dashboard\n\nI'll send you a delivery report when complete!"
            }
        ]
    },
    {
        id: 'dispensary-vip-customers',
        name: 'VIP Customer Report',
        role: 'dispensary',
        triggerKeywords: ['vip customers', 'top customers', 'best customers', 'highest spenders', 'loyal customers'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-vip-report',
                order: 1,
                type: 'action',
                thought: "Analyzing customer LTV... Ranking by spend... Identifying VIPs...",
                steps: [
                    "Analyzing: Customer lifetime value...",
                    "Ranking: By total spend...",
                    "Identifying: Top performers..."
                ],
                dataView: 'lead_list',
                message: "👑 **Top 10 VIP Customers**\n\n| Rank | Customer | Total Spend | Visits | Avg Order |\n|------|----------|-------------|--------|------------|\n| 1 | Sarah M. | $4,250 | 45 | $94 |\n| 2 | James K. | $3,890 | 38 | $102 |\n| 3 | Mike T. | $3,420 | 52 | $66 |\n| ... | ... | ... | ... | ... |\n\n**VIP Insights:**\n*   Average VIP visits: 3.2x/month\n*   Preferred category: Flower (62%)\n*   Best day: Saturday\n\nWant to **send them a special offer** or **export this list**?"
            }
        ]
    },
    {
        id: 'dispensary-winback-campaign',
        name: 'Customer Win-Back Campaign',
        role: 'dispensary',
        triggerKeywords: ['win-back', 'winback', 'inactive customers', 're-engage', 'bring back customers', 'lapsed customers'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-identify-lapsed',
                order: 1,
                type: 'action',
                thought: "Identifying lapsed customers... Segmenting by last visit... Preparing offers...",
                steps: [
                    "Identifying: Inactive customers...",
                    "Segmenting: By days since last visit...",
                    "Calculating: Potential revenue..."
                ],
                message: "🎯 **Win-Back Opportunity**\n\n**Inactive Customers (30+ days):**\n*   30-60 days: 180 customers (avg LTV: $340)\n*   60-90 days: 95 customers (avg LTV: $420)\n*   90+ days: 145 customers (avg LTV: $280)\n\n**Potential Recovery**: $142,000 in annual value\n\n**Recommended Campaign:**\n\"We miss you! Here's 20% off your next visit.\"\n\nShould I **create this campaign**?"
            },
            {
                id: 'step-create-campaign',
                order: 2,
                type: 'action',
                triggerKeywords: ['create', 'yes', 'do it', 'set up'],
                thought: "Creating multi-touch campaign... Scheduling touchpoints... Setting up tracking...",
                message: "✅ **Win-Back Campaign Created!**\n\n**Campaign Flow:**\n1.  Day 1: Email \"We miss you\" + 20% offer\n2.  Day 3: SMS reminder (if no open)\n3.  Day 7: Final chance email\n\n**Targeting**: 420 inactive customers\n**Launch**: Tomorrow 10:00 AM\n\nI'll report results in your weekly digest!"
            }
        ]
    },
    {
        id: 'dispensary-loyalty-bonus',
        name: 'Loyalty Point Bonus Setup',
        role: 'dispensary',
        triggerKeywords: ['loyalty bonus', 'double points', 'loyalty points', 'rewards bonus', 'points promotion'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-bonus-setup',
                order: 1,
                type: 'question',
                thought: "Loading loyalty program settings... Checking current multiplier...",
                message: "🎁 **Loyalty Point Bonus**\n\nYour current rate: 1 point per $1 spent\n\n**What type of bonus?**\n1.  Double points (all purchases)\n2.  Triple points (specific category)\n3.  Bonus points (minimum spend)\n4.  Birthday bonus\n\n**Duration?** (e.g., \"this weekend\", \"Friday only\")"
            },
            {
                id: 'step-activate-bonus',
                order: 2,
                type: 'action',
                triggerKeywords: ['double', 'triple', 'weekend', 'friday', 'today'],
                thought: "Configuring bonus multiplier... Setting date range... Activating...",
                message: "✅ **Loyalty Bonus Activated!**\n\n**Details:**\n*   🎯 2X Points on all purchases\n*   📅 This weekend (Sat-Sun)\n*   📢 Auto-notify: Enabled\n\nI'll send an SMS/email to 2,340 members announcing the bonus!"
            }
        ]
    },
    
    // --- Compliance ---
    {
        id: 'dispensary-compliance-check',
        name: 'Marketing Compliance Check',
        role: 'dispensary',
        triggerKeywords: ['compliance check', 'is this compliant', 'check my copy', 'legal review', 'marketing compliance'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-check-content',
                order: 1,
                type: 'question',
                thought: "Loading compliance rules for your state... Ready for review...",
                message: "✅ **Compliance Checker Ready**\n\nI'll review your marketing content against:\n*   State cannabis advertising laws\n*   CTIA SMS regulations\n*   Platform-specific policies\n\n**Paste your marketing copy below** and I'll flag any issues."
            },
            {
                id: 'step-analyze-content',
                order: 2,
                type: 'action',
                thought: "Scanning for prohibited claims... Checking age-gate requirements... Reviewing health claims...",
                steps: [
                    "Scanning: Prohibited claims...",
                    "Checking: Age-gate requirements...",
                    "Reviewing: Health claims..."
                ],
                dataView: 'compliance_checklist',
                message: "📋 **Compliance Review Results**\n\n**⚠️ Issues Found:**\n1.  ❌ \"Cures anxiety\" - Remove health claims\n2.  ❌ Missing age disclaimer\n3.  ⚠️ \"Best prices\" - Needs substantiation\n\n**✅ Compliant:**\n*   No appeals to minors\n*   Proper THC disclaimers\n*   No prohibited imagery\n\n**Suggested Revision:**\n\"May help with relaxation\" + Age 21+ disclaimer\n\nWant me to **rewrite this for you**?"
            }
        ]
    },
    {
        id: 'dispensary-menu-audit',
        name: 'Menu Compliance Audit',
        role: 'dispensary',
        triggerKeywords: ['menu audit', 'audit menu', 'menu compliance', 'check my menu', 'product compliance'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-audit-menu',
                order: 1,
                type: 'action',
                thought: "Scanning menu items... Checking labeling requirements... Validating THC/CBD info...",
                steps: [
                    "Scanning: 250 menu items...",
                    "Checking: Labeling requirements...",
                    "Validating: THC/CBD accuracy..."
                ],
                message: "📋 **Menu Compliance Audit**\n\n**Summary**: 250 products scanned\n\n**🚨 Critical Issues (3):**\n*   Missing THC % on 2 products\n*   Incorrect unit size on 1 edible\n\n**⚠️ Warnings (8):**\n*   Product descriptions need strain type\n*   Missing batch numbers on 5 items\n\n**✅ Passing**: 239 products (96%)\n\nWant me to **generate a fix list** or **auto-correct** where possible?"
            }
        ]
    },
    {
        id: 'dispensary-metrc-report',
        name: 'METRC Sales Report',
        role: 'dispensary',
        triggerKeywords: ['metrc report', 'state report', 'compliance report', 'sales report metrc', 'regulatory report'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-generate-report',
                order: 1,
                type: 'action',
                thought: "Compiling sales data... Formatting for METRC... Validating entries...",
                steps: [
                    "Compiling: Sales transactions...",
                    "Formatting: METRC template...",
                    "Validating: Entry accuracy..."
                ],
                message: "📊 **METRC Sales Report Generated**\n\n**Period**: Last 7 days\n**Transactions**: 842\n**Total Sales**: $47,230\n\n**Validation**: ✅ All entries compliant\n\n**Download Options:**\n*   📄 CSV (METRC format)\n*   📄 PDF (internal records)\n\nI can also **set up automatic weekly reports** for your team."
            }
        ]
    },
    
    // --- Analytics ---
    {
        id: 'dispensary-best-sellers',
        name: 'Best Sellers Report',
        role: 'dispensary',
        triggerKeywords: ['best sellers', 'top sellers', 'what sold most', 'popular products', 'top products'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-sales-analysis',
                order: 1,
                type: 'action',
                thought: "Analyzing sales data... Ranking by revenue... Identifying trends...",
                steps: [
                    "Analyzing: Last 7 days sales...",
                    "Ranking: By units & revenue...",
                    "Identifying: Trends..."
                ],
                dataView: 'price_chart',
                message: "🏆 **Best Sellers (Last 7 Days)**\n\n| Rank | Product | Units | Revenue |\n|------|---------|-------|----------|\n| 1 | Stiiizy OG Kush 1g | 145 | $6,525 |\n| 2 | Cookies Gary Payton 3.5g | 98 | $5,390 |\n| 3 | Select Elite 0.5g | 87 | $3,915 |\n| 4 | Wyld Gummies | 76 | $1,900 |\n| 5 | Raw Garden LR 1g | 71 | $4,260 |\n\n**Insights:**\n*   📈 Stiiizy up 23% vs last week\n*   📉 Edibles down 8% (seasonal?)\n*   💡 Consider bundling #4 with #1\n\nWant to see **category breakdown** or **compare to last month**?"
            }
        ]
    },
    {
        id: 'dispensary-sales-comparison',
        name: 'Sales Period Comparison',
        role: 'dispensary',
        triggerKeywords: ['compare sales', 'this week vs last', 'sales comparison', 'performance comparison', 'week over week'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-compare-periods',
                order: 1,
                type: 'action',
                thought: "Fetching period data... Calculating deltas... Identifying drivers...",
                steps: [
                    "Fetching: This week vs last week...",
                    "Calculating: Growth/decline...",
                    "Identifying: Key drivers..."
                ],
                message: "📊 **Sales Comparison: This Week vs Last**\n\n| Metric | This Week | Last Week | Change |\n|--------|-----------|-----------|--------|\n| Revenue | $52,340 | $48,120 | +8.8% 📈 |\n| Orders | 412 | 389 | +5.9% |\n| Avg Ticket | $127 | $124 | +2.4% |\n| New Customers | 45 | 38 | +18.4% 🎉 |\n\n**Top Growth Drivers:**\n*   Weekend promo: +$3,200\n*   New Cookies drop: +$1,800\n\n**Declines:**\n*   Edibles: -12% (restock needed)\n\nWant a **deeper dive** into any category?"
            }
        ]
    },
    {
        id: 'dispensary-sales-forecast',
        name: 'Sales Forecasting',
        role: 'dispensary',
        triggerKeywords: ['forecast sales', 'predict sales', 'next month sales', 'sales projection', 'demand forecast'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-generate-forecast',
                order: 1,
                type: 'action',
                thought: "Running forecast model... Analyzing trends... Adjusting for seasonality...",
                steps: [
                    "Analyzing: 90-day sales history...",
                    "Modeling: Growth trajectory...",
                    "Adjusting: Seasonality factors..."
                ],
                message: "🔮 **Sales Forecast: Next 30 Days**\n\n**Projected Revenue**: $198,000 - $215,000\n**Confidence**: 85%\n\n**Weekly Breakdown:**\n| Week | Projected | Key Factor |\n|------|-----------|------------|\n| 1 | $48,000 | Normal week |\n| 2 | $52,000 | 4/20 buildup |\n| 3 | $68,000 | 4/20 weekend 🔥 |\n| 4 | $45,000 | Post-holiday dip |\n\n**Recommendations:**\n*   📦 Stock up on top sellers by Week 2\n*   👥 Schedule extra staff for Week 3\n*   💰 Reserve $5k for 4/20 marketing\n\nWant me to **create a prep checklist**?"
            }
        ]
    },
    
    // --- Operations ---
    {
        id: 'dispensary-pending-orders',
        name: 'Pending Orders Dashboard',
        role: 'dispensary',
        triggerKeywords: ['pending orders', 'open orders', 'orders to fulfill', 'order queue', 'fulfillment queue'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-order-status',
                order: 1,
                type: 'action',
                thought: "Fetching order queue... Categorizing by status... Calculating wait times...",
                steps: [
                    "Fetching: Active orders...",
                    "Categorizing: By status...",
                    "Calculating: Wait times..."
                ],
                message: "📦 **Order Queue Status**\n\n**Pending Fulfillment**: 12 orders\n\n| Order # | Type | Items | Wait Time | Status |\n|---------|------|-------|-----------|--------|\n| #4521 | Pickup | 3 | 45 min ⚠️ | Ready |\n| #4520 | Delivery | 5 | 30 min | Packing |\n| #4519 | Pickup | 2 | 15 min | Ready |\n| ... | ... | ... | ... | ... |\n\n**Alerts:**\n*   ⚠️ 2 orders waiting 30+ min\n*   🚗 3 deliveries scheduled next hour\n\nWant to **notify customers** or **reassign orders**?"
            }
        ]
    },
    {
        id: 'dispensary-daily-summary',
        name: 'Daily Sales Summary Email',
        role: 'dispensary',
        triggerKeywords: ['daily summary', 'daily report', 'end of day report', 'eod summary', 'sales summary email'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-setup-summary',
                order: 1,
                type: 'question',
                thought: "Configuring daily report... Setting up schedule...",
                message: "📧 **Daily Summary Setup**\n\nI'll send you a daily sales summary!\n\n**What time should I send it?**\n*   End of business (e.g., 9 PM)\n*   Next morning (e.g., 7 AM)\n*   Custom time\n\n**Who should receive it?** (You can add multiple emails)"
            },
            {
                id: 'step-confirm-setup',
                order: 2,
                type: 'action',
                triggerKeywords: ['9pm', '7am', 'morning', 'evening', 'end of day'],
                thought: "Creating scheduled report... Configuring recipients... Activating...",
                message: "✅ **Daily Summary Activated!**\n\n**Schedule**: Every day at 9:00 PM\n**Recipients**: You\n\n**Report Includes:**\n*   💰 Total revenue & orders\n*   🏆 Top 5 sellers\n*   📈 vs yesterday comparison\n*   ⚠️ Any alerts (low stock, issues)\n\nYour first report arrives tonight!"
            }
        ]
    },
    // ==========================================
    // BRAND TALK TRACKS
    // ==========================================
    
    // --- Distribution & Retail Expansion ---
    {
        id: 'brand-find-dispensaries',
        name: 'Find Retail Partners',
        role: 'brand',
        triggerKeywords: ['find dispensaries', 'find retailers', 'expand distribution', 'new retail partners', 'where to sell'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-market-search',
                order: 1,
                type: 'question',
                thought: "Preparing retail discovery... Loading market data...",
                message: "🏪 **Retail Partner Discovery**\n\nI'll help you find dispensaries to carry your products!\n\n**What market are you targeting?**\n1.  Specific city/state (e.g., \"Denver, CO\")\n2.  Radius from location (e.g., \"50 miles from LA\")\n3.  Specific chain (e.g., \"all Cookies locations\")\n\nAnd what **product category** are you pitching? (Flower, Concentrates, Edibles, etc.)"
            },
            {
                id: 'step-show-results',
                order: 2,
                type: 'action',
                triggerKeywords: ['denver', 'los angeles', 'california', 'colorado', 'flower', 'edibles', 'concentrates'],
                thought: "Searching retail database... Scoring by fit... Ranking opportunities...",
                steps: [
                    "Searching: 2,400 dispensaries in market...",
                    "Filtering: By category alignment...",
                    "Scoring: By revenue & brand fit...",
                    "Ranking: Top opportunities..."
                ],
                dataView: 'lead_list',
                message: "📍 **Top Retail Opportunities in Your Market**\n\n| Dispensary | Revenue Tier | Current Brands | Match Score |\n|------------|--------------|----------------|-------------|\n| Green Thumb Denver | $$$$ | Stiiizy, Cookies | 95% 🔥 |\n| The Green Solution | $$$ | Local only | 88% |\n| Native Roots | $$$$ | Premium focus | 85% |\n| Lightshade | $$$ | Diverse | 82% |\n| Medicine Man | $$$ | Value-focused | 75% |\n\n**Insights:**\n*   Green Thumb has gap in your category\n*   Native Roots actively seeking new brands\n*   3 stores have upcoming buyer meetings\n\nWant me to **draft outreach emails** or **export this list**?"
            },
            {
                id: 'step-outreach',
                order: 3,
                type: 'action',
                triggerKeywords: ['draft', 'email', 'outreach', 'contact'],
                thought: "Generating personalized outreach... Pulling buyer contacts...",
                message: "📧 **Outreach Drafts Ready**\n\nI've prepared personalized emails for each prospect:\n\n**Green Thumb Denver**\n> Subject: [Your Brand] x Green Thumb Partnership\n> \n> Hi [Buyer Name],\n> \n> I noticed Green Thumb is the #1 store for premium concentrates in Denver...\n\n*5 emails drafted and ready to send*\n\n✅ **Send all** or **review individually**?"
            }
        ]
    },
    {
        id: 'brand-retail-map',
        name: 'Retail Distribution Map',
        role: 'brand',
        triggerKeywords: ['where am i sold', 'distribution map', 'retail locations', 'my retailers', 'store map'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-show-map',
                order: 1,
                type: 'action',
                thought: "Loading distribution data... Mapping retail partners... Calculating coverage...",
                steps: [
                    "Loading: Distribution records...",
                    "Mapping: Active retail partners...",
                    "Calculating: Market coverage..."
                ],
                dataView: 'competitor_map',
                message: "🗺️ **Your Distribution Map**\n\n**Active Retail Partners**: 47 stores\n**States**: CA, CO, NV, AZ\n**Market Coverage**: 12% of legal dispensaries\n\n**By State:**\n| State | Stores | % Coverage | Top Performer |\n|-------|--------|------------|---------------|\n| CA | 28 | 8% | MedMen LA |\n| CO | 12 | 15% | Green Thumb |\n| NV | 5 | 18% | Planet 13 |\n| AZ | 2 | 3% | Harvest |\n\n**Gaps Identified:**\n*   🔴 San Diego: 0 stores (high demand market)\n*   🟡 Phoenix: Only 2 stores (underserved)\n\nWant to **target gap markets** or **see retailer performance**?"
            }
        ]
    },
    
    // --- Sales Analytics ---
    {
        id: 'brand-sell-through',
        name: 'Sell-Through Analytics',
        role: 'brand',
        triggerKeywords: ['sell-through', 'sellthrough', 'how are we selling', 'retail performance', 'product velocity'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-analyze-velocity',
                order: 1,
                type: 'action',
                thought: "Pulling POS data... Calculating velocity... Comparing to category...",
                steps: [
                    "Pulling: Retail POS data...",
                    "Calculating: Units/week velocity...",
                    "Comparing: To category benchmarks..."
                ],
                dataView: 'price_chart',
                message: "📈 **Sell-Through Report**\n\n**Overall Velocity**: 4.2 units/store/week\n**Category Avg**: 3.8 units (you're +11% above avg!)\n\n**By Product:**\n| SKU | Velocity | vs Category | Trend |\n|-----|----------|-------------|-------|\n| OG Kush 1g | 8.5/wk | +45% | 📈 |\n| Blue Dream 3.5g | 6.2/wk | +22% | 📈 |\n| Wedding Cake 1g | 2.1/wk | -15% | 📉 |\n| Gelato Cart 0.5g | 5.8/wk | +8% | → |\n\n**By Retailer:**\n| Store | Velocity | Reorder Rate |\n|-------|----------|---------------|\n| Green Thumb | 12.4/wk | Weekly |\n| Planet 13 | 9.2/wk | Bi-weekly |\n| MedMen | 3.1/wk | Monthly ⚠️ |\n\n**Alert**: Wedding Cake underperforming. Consider promo or discontinue?\n\nWant **deeper analysis** or **retailer-specific reports**?"
            }
        ]
    },
    {
        id: 'brand-market-share',
        name: 'Market Share Analysis',
        role: 'brand',
        triggerKeywords: ['market share', 'category share', 'share of shelf', 'brand ranking', 'how do we compare'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-share-analysis',
                order: 1,
                type: 'action',
                thought: "Aggregating market data... Calculating share... Comparing competitors...",
                steps: [
                    "Aggregating: Category sales data...",
                    "Calculating: Market share %...",
                    "Comparing: To top competitors..."
                ],
                message: "📊 **Market Share Analysis**\n\n**Your Category**: Concentrates\n**Your Share**: 8.2% (#4 in market)\n\n**Competitive Landscape:**\n| Rank | Brand | Share | Trend |\n|------|-------|-------|-------|\n| 1 | Raw Garden | 18.5% | → |\n| 2 | Stiiizy | 15.2% | 📈 +2% |\n| 3 | Select | 12.1% | 📉 -1% |\n| 4 | **You** | 8.2% | 📈 +0.5% |\n| 5 | Cresco | 7.8% | → |\n\n**Insights:**\n*   You're gaining on Select (they're declining)\n*   Stiiizy's growth is from distro expansion\n*   Gap to #3: ~$2M annual sales\n\n**To move up:**\n1.  Add 15 retail partners (+1.5% share)\n2.  Launch promo with top 10 retailers\n3.  Expand to NV (underrepresented)\n\nWant a **growth roadmap** or **competitor deep-dive**?"
            }
        ]
    },
    
    // --- Competitive Intelligence ---
    {
        id: 'brand-competitor-watch',
        name: 'Competitor Brand Watch',
        role: 'brand',
        triggerKeywords: ['competitor brands', 'watch competitors', 'competitor products', 'new launches', 'what are competitors doing'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-competitor-intel',
                order: 1,
                type: 'action',
                thought: "Scanning competitor activity... Tracking new products... Monitoring pricing...",
                steps: [
                    "Scanning: Competitor websites...",
                    "Tracking: New product launches...",
                    "Monitoring: Pricing changes..."
                ],
                message: "🕵️ **Competitor Intelligence Report**\n\n**New Product Launches (Last 30 Days):**\n| Brand | Product | Category | Price Point |\n|-------|---------|----------|-------------|\n| Raw Garden | Crushed Diamonds 2g | Concentrates | $80 (premium) |\n| Stiiizy | Live Resin Pods | Vapes | $45 (mid) |\n| Select | Cliq Pods | Vapes | $35 (value) |\n\n**Pricing Movements:**\n*   📉 Cresco dropped flower prices 12% (aggressive push)\n*   📈 Raw Garden raised concentrates 8% (premium positioning)\n\n**Distribution Changes:**\n*   Stiiizy added 45 new retailers in CA\n*   Select exiting AZ market (opportunity!)\n\n**Social Buzz:**\n*   Raw Garden trending on r/Cannabis\n*   Cresco getting criticism for quality\n\nWant **alerts on competitor moves** or **deeper brand analysis**?"
            }
        ]
    },
    {
        id: 'brand-pricing-intel',
        name: 'Competitive Pricing Intel',
        role: 'brand',
        triggerKeywords: ['competitor pricing', 'price benchmarks', 'how are we priced', 'pricing strategy', 'price positioning'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-price-comparison',
                order: 1,
                type: 'action',
                thought: "Gathering retail prices... Comparing SKUs... Analyzing positioning...",
                steps: [
                    "Gathering: Retail price data...",
                    "Comparing: Similar SKUs...",
                    "Analyzing: Price positioning..."
                ],
                message: "💰 **Pricing Intelligence Report**\n\n**Your Category**: Concentrates (1g)\n**Your Avg Retail**: $42\n**Market Avg**: $40\n**Your Position**: Premium (+5%)\n\n**SKU-Level Comparison:**\n| Your Product | Price | Competitor | Their Price | Gap |\n|--------------|-------|------------|-------------|-----|\n| OG Kush 1g | $45 | Raw Garden | $48 | -$3 ✅ |\n| Blue Dream 1g | $42 | Stiiizy | $40 | +$2 |\n| Gelato 1g | $40 | Select | $35 | +$5 ⚠️ |\n\n**Insights:**\n*   OG Kush: Well-priced vs premium competitor\n*   Gelato: 14% premium vs Select (may hurt velocity)\n\n**Recommendation:**\n*   Consider $38 promo on Gelato to compete with Select\n*   OG Kush can support price increase\n\nWant to **adjust pricing** or **set up price alerts**?"
            }
        ]
    },
    
    // --- Wholesale & LeafLink ---
    {
        id: 'brand-wholesale-orders',
        name: 'Wholesale Order Management',
        role: 'brand',
        triggerKeywords: ['wholesale orders', 'leaflink orders', 'pending orders', 'retailer orders', 'order status'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-order-status',
                order: 1,
                type: 'action',
                thought: "Fetching LeafLink orders... Categorizing by status... Calculating revenue...",
                steps: [
                    "Connecting: LeafLink API...",
                    "Fetching: Active orders...",
                    "Categorizing: By status..."
                ],
                message: "📦 **Wholesale Orders Dashboard**\n\n**This Week**: $48,500 in orders (23 orders)\n\n**Pending Fulfillment (8):**\n| Retailer | Amount | Items | Due Date |\n|----------|--------|-------|----------|\n| Green Thumb | $8,200 | 120 units | Tomorrow ⚠️ |\n| Planet 13 | $12,400 | 200 units | Thu |\n| MedMen | $5,600 | 80 units | Fri |\n\n**Awaiting Payment (4):**\n*   Native Roots: $6,200 (Net 30 - Day 22)\n*   Harvest: $4,100 (Net 30 - Day 28) ⚠️\n\n**Shipped This Week (11):**\n*   Total: $17,800\n*   On-time rate: 100% ✅\n\nWant to **process fulfillment** or **send payment reminders**?"
            }
        ]
    },
    {
        id: 'brand-reorder-forecast',
        name: 'Retailer Reorder Forecast',
        role: 'brand',
        triggerKeywords: ['reorder forecast', 'who will reorder', 'upcoming orders', 'predict orders', 'next orders'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-forecast',
                order: 1,
                type: 'action',
                thought: "Analyzing order patterns... Predicting reorder timing... Estimating volume...",
                steps: [
                    "Analyzing: Historical order patterns...",
                    "Predicting: Reorder timing...",
                    "Estimating: Order volumes..."
                ],
                message: "🔮 **Reorder Forecast (Next 14 Days)**\n\n**Expected Orders**: $62,000 from 12 retailers\n\n| Retailer | Est. Date | Est. Amount | Confidence |\n|----------|-----------|-------------|------------|\n| Green Thumb | 3 days | $8,500 | 95% |\n| Planet 13 | 5 days | $11,200 | 90% |\n| MedMen | 7 days | $6,800 | 85% |\n| Native Roots | 8 days | $5,400 | 80% |\n| Harvest | 10 days | $4,200 | 75% |\n\n**At Risk (Overdue):**\n*   🔴 The Green Solution: Usually orders every 2 weeks, now 3 weeks since last order\n*   🟡 Lightshade: Velocity down 30%, may reduce order\n\n**Recommended Actions:**\n1.  Reach out to Green Solution\n2.  Offer Lightshade a promo to boost velocity\n\nWant me to **draft outreach** for at-risk accounts?"
            }
        ]
    },
    
    // --- Marketing & Brand Building ---
    {
        id: 'brand-retailer-promo',
        name: 'Retailer Promotion Campaign',
        role: 'brand',
        triggerKeywords: ['retailer promo', 'trade promotion', 'retailer discount', 'push promo', 'incentivize retailers'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-promo-setup',
                order: 1,
                type: 'question',
                thought: "Loading retailer data... Preparing promo builder...",
                message: "🎯 **Retailer Promo Builder**\n\n**What type of promotion?**\n1.  Volume discount (buy X get Y% off)\n2.  Co-op marketing (fund their ads)\n3.  Display/placement incentive\n4.  New product intro deal\n5.  Velocity bonus (hit targets = rebate)\n\n**Which retailers?**\n*   All partners (47)\n*   Top performers (12)\n*   Underperformers (8)\n*   Custom list"
            },
            {
                id: 'step-configure-promo',
                order: 2,
                type: 'action',
                triggerKeywords: ['volume', 'co-op', 'display', 'new product', 'velocity', 'all', 'top', 'under'],
                thought: "Configuring promotion... Calculating margin impact... Preparing materials...",
                steps: [
                    "Configuring: Promo terms...",
                    "Calculating: Margin impact...",
                    "Preparing: Retailer materials..."
                ],
                message: "📊 **Promo Configuration**\n\n**Volume Discount Promo:**\n*   Buy 50+ units: 10% off\n*   Buy 100+ units: 15% off\n*   Buy 200+ units: 20% off\n\n**Target**: Top 12 performers\n**Duration**: 2 weeks\n**Est. Lift**: +35% volume\n**Margin Impact**: -8% (offset by volume)\n\n**Materials Ready:**\n*   📧 Announcement email\n*   📄 Sell sheet with promo pricing\n*   📊 ROI calculator for buyers\n\n✅ **Launch this promo**?"
            },
            {
                id: 'step-launch-promo',
                order: 3,
                type: 'action',
                triggerKeywords: ['launch', 'yes', 'send', 'confirm'],
                thought: "Sending to retailers... Updating LeafLink pricing... Tracking...",
                message: "🚀 **Promo Launched!**\n\n*   📧 12 retailers notified\n*   💰 LeafLink pricing updated\n*   📊 Tracking dashboard active\n\nI'll send you daily updates on promo performance!"
            }
        ]
    },
    {
        id: 'brand-budtender-training',
        name: 'Budtender Training Materials',
        role: 'brand',
        triggerKeywords: ['budtender training', 'train budtenders', 'staff training', 'product education', 'brand training'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-training-setup',
                order: 1,
                type: 'question',
                thought: "Loading product catalog... Preparing training content generator...",
                message: "📚 **Budtender Training Builder**\n\n**What would you like to create?**\n1.  Product knowledge guide (all SKUs)\n2.  New product launch training\n3.  Strain/effects education\n4.  Brand story & talking points\n5.  Competitive positioning guide\n\n**Format?**\n*   PDF guide\n*   Video script\n*   Quiz/certification\n*   One-pager per product"
            },
            {
                id: 'step-generate-training',
                order: 2,
                type: 'action',
                triggerKeywords: ['product knowledge', 'new product', 'strain', 'brand story', 'competitive', 'pdf', 'video', 'quiz'],
                thought: "Generating training content... Pulling product data... Creating materials...",
                steps: [
                    "Generating: Training content...",
                    "Pulling: Product specs...",
                    "Creating: Formatted materials..."
                ],
                message: "📄 **Training Materials Generated**\n\n**Product Knowledge Guide**\n*   12 products covered\n*   Effects, terpenes, pricing for each\n*   Recommended customer profiles\n*   Competitive comparisons\n\n**Included Sections:**\n1.  Brand Story (why we exist)\n2.  Product Lineup (specs & effects)\n3.  Who to Recommend (customer profiles)\n4.  vs Competitors (positioning)\n5.  FAQ (common questions)\n\n**Formats Available:**\n*   📄 PDF Guide (24 pages)\n*   🎥 Video Script (8 min)\n*   ✅ Knowledge Quiz (20 questions)\n\n✅ **Download** or **send to retailers**?"
            }
        ]
    },
    {
        id: 'brand-social-content',
        name: 'Social Media Content',
        role: 'brand',
        triggerKeywords: ['social media', 'instagram post', 'social content', 'create post', 'content calendar'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-content-brief',
                order: 1,
                type: 'question',
                thought: "Loading brand guidelines... Preparing content generator...",
                message: "📱 **Social Content Creator**\n\n**What do you need?**\n1.  Single post (Instagram/Twitter)\n2.  Week of content (7 posts)\n3.  Product launch campaign\n4.  User-generated content ideas\n5.  Story/Reel concepts\n\n**What's the focus?**\n*   New product\n*   Brand awareness\n*   Retailer shoutout\n*   Education/effects\n*   Behind the scenes"
            },
            {
                id: 'step-generate-content',
                order: 2,
                type: 'action',
                triggerKeywords: ['single', 'week', 'launch', 'ugc', 'story', 'product', 'awareness', 'education'],
                thought: "Generating content... Applying brand voice... Creating captions...",
                steps: [
                    "Generating: Content concepts...",
                    "Applying: Brand voice...",
                    "Creating: Captions & hashtags..."
                ],
                message: "📸 **Content Ready**\n\n**Week of Instagram Posts:**\n\n**Monday** - Product Spotlight\n> 🔥 Meet our new Live Resin OG.\n> Cured for 21 days. Extracted at peak freshness.\n> Available at 47 retailers near you.\n> #LiveResin #Cannabis #[YourBrand]\n\n**Wednesday** - Education\n> 💡 Did you know? Live resin preserves 40% more terpenes than distillate.\n> That's why the flavor hits different.\n> #CannabisFacts #Terpenes\n\n**Friday** - Retailer Shoutout\n> 🙌 Big love to @GreenThumb for always keeping us stocked!\n> Visit them for [YourBrand] this weekend.\n> #RetailPartner #ShopLocal\n\n*4 more posts in content calendar*\n\n✅ **Download all** or **edit individual posts**?"
            }
        ]
    },
    
    // --- Product & Catalog ---
    {
        id: 'brand-product-performance',
        name: 'Product Performance Report',
        role: 'brand',
        triggerKeywords: ['product performance', 'sku performance', 'which products selling', 'product analytics', 'sku analytics'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-performance-report',
                order: 1,
                type: 'action',
                thought: "Pulling SKU data... Analyzing performance... Identifying trends...",
                steps: [
                    "Pulling: Sales by SKU...",
                    "Analyzing: Velocity & margin...",
                    "Identifying: Winners & losers..."
                ],
                dataView: 'price_chart',
                message: "📊 **Product Performance Report**\n\n**Your Catalog**: 12 SKUs across 47 retailers\n\n**🏆 Top Performers:**\n| SKU | Units/Mo | Revenue | Margin | Trend |\n|-----|----------|---------|--------|-------|\n| OG Kush 1g | 2,450 | $98K | 42% | 📈 +15% |\n| Blue Dream 3.5g | 1,820 | $72K | 38% | 📈 +8% |\n| Gelato Cart | 1,540 | $61K | 45% | → |\n\n**⚠️ Underperformers:**\n| SKU | Units/Mo | Revenue | Margin | Issue |\n|-----|----------|---------|--------|-------|\n| Wedding Cake 1g | 340 | $13K | 35% | Low velocity |\n| Sour Diesel 3.5g | 280 | $11K | 32% | Margin squeeze |\n\n**Recommendations:**\n1.  🚀 Double down on OG Kush (expanding distribution)\n2.  💰 Raise price on Gelato (room for margin)\n3.  ❌ Consider discontinuing Sour Diesel\n\nWant **SKU-level deep dive** or **retailer breakdown**?"
            }
        ]
    },
    {
        id: 'brand-new-product-launch',
        name: 'New Product Launch Planner',
        role: 'brand',
        triggerKeywords: ['new product launch', 'launch product', 'product launch plan', 'introduce new sku', 'go to market'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-launch-brief',
                order: 1,
                type: 'question',
                thought: "Preparing launch planner... Loading market data...",
                message: "🚀 **New Product Launch Planner**\n\n**Tell me about your new product:**\n1.  Product name & category\n2.  Target price point\n3.  Unique selling proposition\n4.  Launch timeline\n\n**I'll create:**\n*   Competitive positioning analysis\n*   Retailer pitch deck\n*   Launch timeline & milestones\n*   Marketing assets & messaging"
            },
            {
                id: 'step-create-plan',
                order: 2,
                type: 'action',
                thought: "Analyzing market... Building launch plan... Creating timeline...",
                steps: [
                    "Analyzing: Competitive landscape...",
                    "Building: Launch strategy...",
                    "Creating: Timeline & milestones..."
                ],
                message: "📋 **Launch Plan Created**\n\n**Product**: [New Product Name]\n**Category**: Concentrates\n**Target Launch**: 6 weeks from now\n\n**Phase 1: Prep (Weeks 1-2)**\n*   ✅ Finalize packaging & compliance\n*   📄 Create sell sheets & training\n*   📊 Competitive positioning doc\n\n**Phase 2: Soft Launch (Weeks 3-4)**\n*   🎯 Pitch to top 10 retailers\n*   📦 Initial orders & fulfillment\n*   👨‍🏫 Budtender training delivery\n\n**Phase 3: Full Launch (Weeks 5-6)**\n*   📣 Marketing campaign live\n*   📱 Social media blitz\n*   📊 Track early velocity\n\n**Assets I'll Generate:**\n*   Retailer pitch deck\n*   Product one-pagers\n*   Social content calendar\n*   Budtender training guide\n\n✅ **Start generating assets**?"
            }
        ]
    },
    
    // --- Reporting & Analytics ---
    {
        id: 'brand-weekly-report',
        name: 'Weekly Brand Report',
        role: 'brand',
        triggerKeywords: ['weekly report', 'brand report', 'weekly summary', 'performance report', 'send me a report'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-generate-report',
                order: 1,
                type: 'action',
                thought: "Compiling weekly metrics... Analyzing trends... Generating insights...",
                steps: [
                    "Compiling: Sales & orders...",
                    "Analyzing: Week-over-week...",
                    "Generating: Insights..."
                ],
                message: "📊 **Weekly Brand Report**\n\n**Week of Jan 1-7, 2026**\n\n**📈 Revenue**: $48,200 (+12% vs last week)\n**📦 Orders**: 23 wholesale orders\n**🏪 Active Retailers**: 47\n**📊 Avg Velocity**: 4.2 units/store/week\n\n**Top Story:**\n🔥 OG Kush had best week ever (+23% velocity)\n\n**Wins:**\n*   ✅ 2 new retailers onboarded\n*   ✅ Planet 13 increased order size 40%\n*   ✅ Social engagement up 18%\n\n**Watch List:**\n*   ⚠️ Wedding Cake velocity declining\n*   ⚠️ 1 retailer (Harvest) payment overdue\n\n**This Week's Priorities:**\n1.  Follow up with Harvest on payment\n2.  Push OG Kush promo to more retailers\n3.  Decision on Wedding Cake SKU\n\nWant this **delivered weekly** via email?"
            },
            {
                id: 'step-schedule-report',
                order: 2,
                type: 'action',
                triggerKeywords: ['yes', 'deliver', 'schedule', 'email', 'weekly'],
                thought: "Scheduling weekly report... Configuring delivery...",
                message: "✅ **Weekly Report Scheduled!**\n\n**Delivery**: Every Monday at 8:00 AM\n**Recipients**: You\n\n**Report Includes:**\n*   Revenue & orders summary\n*   Top/bottom performers\n*   Retailer activity\n*   Week's priorities\n\nYour first automated report arrives next Monday!"
            }
        ]
    },
    {
        id: 'brand-revenue-dashboard',
        name: 'Revenue Dashboard',
        role: 'brand',
        triggerKeywords: ['revenue', 'total sales', 'how much sold', 'mtd revenue', 'ytd revenue'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-show-revenue',
                order: 1,
                type: 'action',
                thought: "Calculating revenue... Breaking down by period... Comparing targets...",
                steps: [
                    "Calculating: Total revenue...",
                    "Breaking down: By period...",
                    "Comparing: To targets..."
                ],
                message: "💰 **Revenue Dashboard**\n\n**This Month (Jan 2026)**\n*   Revenue: $142,400\n*   Target: $150,000\n*   Progress: 95% (on track! ✅)\n\n**This Quarter (Q1)**\n*   Revenue: $142,400\n*   Target: $450,000\n*   Progress: 32% (ahead of pace 📈)\n\n**Year-to-Date**\n*   Revenue: $142,400\n*   Target: $1,800,000\n*   Progress: 8%\n\n**By Channel:**\n| Channel | Revenue | % of Total |\n|---------|---------|------------|\n| Wholesale | $128,160 | 90% |\n| Direct (D2C) | $14,240 | 10% |\n\n**By Region:**\n| Region | Revenue | Growth |\n|--------|---------|--------|\n| California | $85,440 | +15% |\n| Colorado | $42,720 | +8% |\n| Nevada | $14,240 | +22% |\n\nWant a **detailed breakdown** or **export for finance**?"
            }
        ]
    },
    // =========================================================================
    // CUSTOMER TALK TRACKS
    // Used by customers via direct login, Smokey widget on brand/dispensary
    // websites, and Location/Brand/Dispensary SEO pages
    // =========================================================================

    // --- Product Discovery ---
    {
        id: 'customer-product-search',
        name: 'Product Search',
        role: 'customer',
        triggerKeywords: ['find products', 'looking for', 'what strains', 'show me', 'search for', 'do you have'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-gather-preferences',
                order: 1,
                type: 'question',
                thought: "Understanding what the customer is looking for...",
                message: "🌿 I'd love to help you find the perfect product! What are you looking for today?\n\n• Flower\n• Edibles\n• Vapes\n• Concentrates\n• Tinctures\n• Something specific"
            },
            {
                id: 'step-search-products',
                order: 2,
                type: 'action',
                thought: "Searching catalog... Matching preferences... Ranking by relevance...",
                steps: [
                    "Searching: Available products...",
                    "Matching: Your preferences...",
                    "Ranking: Best matches..."
                ],
                message: "Here's what I found for you! 🔥\n\n**Top Matches:**\n1. **Blue Dream** - Sativa Hybrid, 22% THC ($45/eighth)\n   *Uplifting, creative, perfect for daytime*\n2. **Wedding Cake** - Indica Hybrid, 25% THC ($50/eighth)\n   *Relaxing, euphoric, great for evening*\n3. **Durban Poison** - Pure Sativa, 20% THC ($42/eighth)\n   *Energizing, focused, productive vibes*\n\nWant more details on any of these, or should I search for something more specific?"
            }
        ]
    },
    {
        id: 'customer-effect-search',
        name: 'Effect-Based Search',
        role: 'customer',
        triggerKeywords: ['help me relax', 'for energy', 'pain relief', 'sleep', 'anxiety', 'creative', 'focus', 'stress'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-understand-effect',
                order: 1,
                type: 'action',
                thought: "Understanding desired effects... Matching to terpene profiles... Finding best strain matches...",
                steps: [
                    "Analyzing: Your desired effects...",
                    "Matching: Terpene profiles...",
                    "Finding: Best strains for you..."
                ],
                message: "😌 I've got some great options for what you're looking for!\n\n**Recommended for Your Needs:**\n\n🌙 **For Relaxation & Stress Relief:**\n• **Granddaddy Purple** - Indica, high myrcene\n• **Northern Lights** - Classic calming indica\n\n💤 **For Sleep:**\n• **Purple Punch** - Heavy indica, sedating\n• **9 Pound Hammer** - Knockout effects\n\n⚡ **For Energy & Focus:**\n• **Green Crack** - Sativa, motivating\n• **Jack Herer** - Clear-headed energy\n\nWant me to tell you more about any of these, or help you find a dispensary nearby?"
            }
        ]
    },
    {
        id: 'customer-product-compare',
        name: 'Product Comparison',
        role: 'customer',
        triggerKeywords: ['compare', 'vs', 'versus', 'difference between', 'which is better', 'what is the difference'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-compare-products',
                order: 1,
                type: 'action',
                thought: "Analyzing products... Comparing effects, potency, price... Generating comparison...",
                steps: [
                    "Analyzing: Product profiles...",
                    "Comparing: Key attributes...",
                    "Generating: Side-by-side view..."
                ],
                message: "📊 **Product Comparison**\n\n| Attribute | Blue Dream | OG Kush |\n|-----------|------------|----------|\n| Type | Sativa Hybrid | Indica Hybrid |\n| THC | 22% | 24% |\n| Effects | Uplifting, Creative | Relaxing, Euphoric |\n| Terpenes | Myrcene, Pinene | Limonene, Caryophyllene |\n| Best For | Daytime use | Evening use |\n| Price | $45/eighth | $48/eighth |\n\n**My Recommendation:** If you want to stay productive, go with **Blue Dream**. If you're winding down, **OG Kush** is your friend.\n\nWant details on where to buy either of these?"
            }
        ]
    },
    {
        id: 'customer-new-arrivals',
        name: 'New Arrivals',
        role: 'customer',
        triggerKeywords: ['new products', 'just in', 'latest drops', 'new arrivals', 'whats new', 'fresh', 'recent'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-show-new',
                order: 1,
                type: 'action',
                thought: "Fetching latest inventory... Checking recent additions...",
                steps: [
                    "Checking: Latest drops...",
                    "Finding: New arrivals..."
                ],
                message: "🆕 **Fresh Drops This Week!**\n\n🔥 **Just Landed:**\n1. **Gelato 41** - Exotic hybrid, 28% THC - *Limited batch!*\n2. **Runtz Live Resin** - Premium extract, terp-heavy\n3. **Kiva Camino Gummies** - New flavors in stock\n\n📦 **Coming Soon:**\n• Connected Cannabis Co. collab\n• New Stiiizy pods\n\nInterested in any of these? I can check availability near you!"
            }
        ]
    },

    // --- Order & Purchase ---
    {
        id: 'customer-store-locator',
        name: 'Store Locator',
        role: 'customer',
        triggerKeywords: ['where to buy', 'stores near me', 'closest dispensary', 'find dispensary', 'dispensaries near', 'buy near me'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-get-location',
                order: 1,
                type: 'question',
                thought: "Need location to find nearby stores...",
                message: "📍 I can help you find dispensaries nearby! What's your ZIP code or city?"
            },
            {
                id: 'step-show-stores',
                order: 2,
                type: 'action',
                triggerKeywords: ['90210', 'los angeles', 'chicago', 'denver'],
                thought: "Searching dispensaries... Checking availability... Ranking by distance...",
                steps: [
                    "Searching: Nearby dispensaries...",
                    "Checking: Product availability...",
                    "Ranking: By distance..."
                ],
                message: "🏪 **Dispensaries Near You:**\n\n1. **Green Leaf Collective** - 0.5 mi\n   📍 123 Main St\n   ⏰ Open until 9pm\n   ⭐ 4.8 (342 reviews)\n\n2. **CannaCare Wellness** - 1.2 mi\n   📍 456 Oak Ave\n   ⏰ Open until 10pm\n   ⭐ 4.6 (218 reviews)\n\n3. **The Green Room** - 2.1 mi\n   📍 789 Elm Blvd\n   ⏰ Open until 8pm\n   ⭐ 4.9 (156 reviews)\n\nWant directions, or shall I check if a specific product is available at any of these?"
            }
        ]
    },
    {
        id: 'customer-order-status',
        name: 'Order Status',
        role: 'customer',
        triggerKeywords: ['my order', 'order status', 'track order', 'where is my order', 'order tracking'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-check-order',
                order: 1,
                type: 'action',
                thought: "Looking up order status... Checking fulfillment...",
                steps: [
                    "Looking up: Your recent orders...",
                    "Checking: Fulfillment status..."
                ],
                message: "📦 **Your Recent Order**\n\n**Order #BB-2026-1234**\n• Status: **Ready for Pickup** ✅\n• Placed: Today, 2:15 PM\n• Pickup at: Green Leaf Collective\n\n**Items:**\n• Blue Dream 1/8 oz ($45)\n• Kiva Gummies ($22)\n\n**Total:** $67.00\n\n*Your order is waiting for you! Bring your ID.*\n\nNeed help with something else?"
            }
        ]
    },
    {
        id: 'customer-reorder',
        name: 'Quick Reorder',
        role: 'customer',
        triggerKeywords: ['reorder', 'buy again', 'same as last time', 'order again', 'repeat order'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-show-past-orders',
                order: 1,
                type: 'action',
                thought: "Fetching order history... Finding reorderable items...",
                steps: [
                    "Fetching: Your order history...",
                    "Checking: Item availability..."
                ],
                message: "🔄 **Quick Reorder**\n\n**Your Favorites:**\n1. Blue Dream 1/8 oz - $45 *(In stock ✅)*\n2. Kiva Camino Gummies - $22 *(In stock ✅)*\n3. Stiiizy OG Pod - $35 *(Low stock ⚠️)*\n\nWant me to add any of these to your cart? Just let me know which ones!"
            }
        ]
    },

    // --- Brand/Dispensary Info ---
    {
        id: 'customer-brand-info',
        name: 'Brand Info',
        role: 'customer',
        triggerKeywords: ['about', 'who makes', 'tell me about', 'what is', 'brand info', 'company'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-show-brand-info',
                order: 1,
                type: 'action',
                thought: "Looking up brand information... Fetching product catalog...",
                steps: [
                    "Looking up: Brand details...",
                    "Fetching: Product lineup..."
                ],
                message: "ℹ️ **About This Brand**\n\n*This information is tailored to the brand page you're on.*\n\n**Founded:** 2018 in California\n**Mission:** Craft cannabis with purpose\n**Products:** Premium flower, concentrates, edibles\n\n**Popular Products:**\n• OG Kush - Signature strain\n• Live Resin Carts - Best seller\n• Infused Pre-rolls - Fan favorite\n\n**Where to Buy:**\nAvailable at 50+ licensed dispensaries in CA, CO, NV\n\nAnything specific you'd like to know?"
            }
        ]
    },
    {
        id: 'customer-hours-location',
        name: 'Hours & Location',
        role: 'customer',
        triggerKeywords: ['hours', 'when open', 'address', 'directions', 'location', 'open now', 'closing time'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-show-hours',
                order: 1,
                type: 'action',
                thought: "Looking up store hours and location...",
                message: "🕐 **Store Hours & Location**\n\n*Showing info for this dispensary:*\n\n📍 **Address:**\n123 Cannabis Way, Los Angeles, CA 90210\n\n⏰ **Hours:**\n• Monday-Friday: 9am - 9pm\n• Saturday: 10am - 10pm\n• Sunday: 11am - 7pm\n\n**Open Now:** Yes ✅ (closes in 4 hours)\n\n📞 **Contact:** (555) 420-1234\n🌐 **Website:** www.dispensary.com\n\nNeed directions or want to place an order?"
            }
        ]
    },
    {
        id: 'customer-deals-specials',
        name: 'Deals & Specials',
        role: 'customer',
        triggerKeywords: ['deals', 'specials', 'discounts', 'sale', 'promotions', 'coupon', 'savings'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-show-deals',
                order: 1,
                type: 'action',
                thought: "Fetching current deals and promotions...",
                steps: [
                    "Checking: Today's deals...",
                    "Finding: Active promotions..."
                ],
                message: "🎉 **Today's Deals & Specials!**\n\n🔥 **Daily Deal:**\n• 20% off all edibles (Today only!)\n\n💚 **Weekly Specials:**\n• Buy 2 pre-rolls, get 1 free\n• $10 off orders over $75\n\n👑 **Member Exclusives:**\n• Double points on vape purchases\n• Early access to new drops\n\n🎂 **Birthday?** Get 25% off your order this month!\n\nWant to browse products on sale?"
            }
        ]
    },

    // --- Loyalty & Account ---
    {
        id: 'customer-loyalty-points',
        name: 'Loyalty Points',
        role: 'customer',
        triggerKeywords: ['my points', 'rewards', 'loyalty balance', 'points balance', 'reward points'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-show-points',
                order: 1,
                type: 'action',
                thought: "Looking up loyalty balance and tier status...",
                message: "🏆 **Your Rewards**\n\n**Points Balance:** 2,450 points\n**Member Tier:** Gold 🥇\n\n**Points Value:** $24.50 in rewards!\n\n**Recent Activity:**\n• +150 pts - Last purchase (Jan 2)\n• -500 pts - Redeemed $5 off (Dec 28)\n• +300 pts - Bonus points promo (Dec 25)\n\n**Next Tier (Platinum):** 550 pts away\n\nWant to redeem your points on your next order?"
            }
        ]
    },
    {
        id: 'customer-earn-points',
        name: 'Earn Points',
        role: 'customer',
        triggerKeywords: ['how to earn', 'get more points', 'earn points', 'earn rewards', 'points earning'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-show-earning',
                order: 1,
                type: 'action',
                thought: "Explaining loyalty program earning structure...",
                message: "💰 **Ways to Earn Points**\n\n**Shopping:**\n• 1 point per $1 spent\n• 2x points on featured items\n\n**Bonuses:**\n• 🎂 500 pts on your birthday\n• 👥 200 pts for each referral\n• ⭐ 100 pts for product reviews\n\n**Current Promos:**\n• Double points weekends\n• 3x points on new arrivals\n\n**Your Status:** Gold (1.5x earning multiplier!)\n\nStart earning by shopping today!"
            }
        ]
    },
    {
        id: 'customer-redeem-rewards',
        name: 'Redeem Rewards',
        role: 'customer',
        triggerKeywords: ['redeem points', 'use rewards', 'claim reward', 'spend points', 'redeem'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-redeem-options',
                order: 1,
                type: 'action',
                thought: "Fetching redemption options based on points balance...",
                message: "🎁 **Redeem Your Rewards**\n\n**Your Balance:** 2,450 points\n\n**Available Rewards:**\n\n💵 **Cash Discounts:**\n• 500 pts → $5 off\n• 1,000 pts → $10 off\n• 2,000 pts → $25 off *(Best value!)*\n\n🎁 **Free Products:**\n• 800 pts → Free pre-roll\n• 1,500 pts → Free edible\n• 3,000 pts → Free eighth\n\n🌟 **Experiences:**\n• 5,000 pts → VIP dispensary tour\n\nWhich would you like to redeem?"
            }
        ]
    },

    // --- General ---
    {
        id: 'customer-get-help',
        name: 'Get Help',
        role: 'customer',
        triggerKeywords: ['help', 'support', 'contact', 'question', 'problem', 'issue', 'need help'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-help-options',
                order: 1,
                type: 'response',
                thought: "Providing help options...",
                message: "🙋 **How Can I Help?**\n\nI'm here to assist with:\n\n🌿 **Product Questions**\n• Finding products, strains, effects\n\n📦 **Orders**\n• Track orders, reorder favorites\n\n📍 **Finding Stores**\n• Locate dispensaries near you\n\n🏆 **Rewards**\n• Check points, redeem rewards\n\n📞 **Contact Support:**\n• Email: support@bakedbot.ai\n• Phone: (555) 420-HELP\n\nJust ask me anything, or choose an option above!"
            }
        ]
    },
    {
        id: 'customer-greeting',
        name: 'Greeting',
        role: 'customer',
        triggerKeywords: ['hi', 'hello', 'hey', 'hey smokey', 'hi smokey', 'whats up', 'good morning'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-greet',
                order: 1,
                type: 'response',
                thought: "Greeting the customer warmly...",
                message: "👋 Hey there! I'm **Smokey**, your AI budtender.\n\nI can help you with:\n• 🌿 Finding the perfect products\n• 📍 Locating dispensaries nearby\n• 📦 Tracking your orders\n• 🏆 Checking your rewards\n\nWhat can I do for you today?"
            }
        ]
    },
    // --- BRAND TALK TRACKS ---
    {
        id: 'brand-performance-overview',
        name: 'Brand Performance Overview',
        role: 'brand',
        triggerKeywords: ['sales report', 'how is my brand doing', 'top products', 'revenue info'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-analyze-performance',
                order: 1,
                type: 'response',
                thought: "Pops is analyzing sales data... querying revenue trends... identifying top movers...",
                message: "📊 **Performance Snapshot (Last 30 Days)**\n\nI've pulled your latest numbers:\n*   **Total Revenue**: $42,500 (+12% MoM) 📈\n*   **Top Product**: Blue Dream Pre-rolls (1,200 units sold)\n*   **Fastest Growing**: Sleep Gummies (+45%)\n\nWould you like a deeper dive into a specific product category?"
            }
        ]
    },
    {
        id: 'brand-retailer-check',
        name: 'Retailer Network Check',
        role: 'brand',
        triggerKeywords: ['who stocks me', 'inventory check', 'retailer list', 'where am i sold'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-scan-retailers',
                order: 1,
                type: 'response',
                thought: "Ezal is scanning retailer menus... checking stock status... verifying active listings...",
                message: "🗺️ **Retailer Network Status**\n\nI've scanned 150 local dispensaries. Here's where your brand is active:\n*   **Active Locations**: 45 Dispensaries\n*   **Stock Critical**: 3 Locations (Low Inventory)\n*   **New Listings**: 2 Stores added this week!\n\nI can send you the full list of stores with low stock triggers if you'd like?"
            }
        ]
    },
    {
        id: 'brand-marketing-launch',
        name: 'Marketing Campaign Launch',
        role: 'brand',
        triggerKeywords: ['start campaign', 'create promo', 'launch marketing', 'new promotion'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-campaign-setup',
                order: 1,
                type: 'question',
                thought: "Craig is initializing campaign builder... checking available channels... identifying goals...",
                message: "🚀 **Let's Launch a Campaign!**\n\nI'm ready to help you drive some traffic. What's the primary goal for this push?\n\n1.  **New Product Launch** (Awareness)\n2.  **Move Old Inventory** (Discount)\n3.  **Brand Awareness** (Engagement)\n\nJust tell me the goal and I'll draft the copy!"
            }
        ]
    },
    // --- DISPENSARY TALK TRACKS ---
    {
        id: 'dispensary-inventory-audit',
        name: 'Inventory Audit',
        role: 'dispensary',
        triggerKeywords: ['dead stock', 'low stock', 'inventory report', 'stock audit'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-audit-inventory',
                order: 1,
                type: 'response',
                thought: "Pops is auditing inventory levels... calculating turnover rates... flagging dead stock...",
                message: "📦 **Inventory Health Audit**\n\nI've flagged a few items that need attention:\n*   **Dead Stock Risk**: 'Peach Rings 100mg' (No sales in 60 days)\n*   **Low Stock Alert**: 'Blue Dream 1/8th' (Only 5 units left - standard run rate is 10/day)\n\nShall I draft a 'Fire Sale' promo for the Peach Rings to clear shelf space?"
            }
        ]
    },
    {
        id: 'dispensary-competitor-pulse',
        name: 'Competitor Pulse Check',
        role: 'dispensary',
        triggerKeywords: ['competitor prices', 'price check', 'market pricing', 'competitor pulse'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-check-prices',
                order: 1,
                type: 'response',
                thought: "Ezal is scraping local competitors... comparing basket analysis... identifying price gaps...",
                message: "👀 **Market Pulse Check**\n\nI checked 5 nearby competitors. Here's the scoop:\n*   **Edibles**: You are 10% cheaper than average. (Good for volume!)\n*   **Flower**: 'Green Leaf' is undercutting you by $5 on 1/8ths.\n*   **Opportunity**: No one else has 'Sleep Tinctures' in stock right now.\n\nWant me to monitor 'Green Leaf' daily?"
            }
        ]
    },
    {
        id: 'dispensary-seo-health',
        name: 'SEO Health Check',
        role: 'dispensary',
        triggerKeywords: ['seo status', 'listing health', 'google ranking', 'how is my listing'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        steps: [
            {
                id: 'step-check-seo',
                order: 1,
                type: 'response',
                thought: "Craig is analyzing SEO metadata... checking index status... verifying keywords...",
                message: "🌐 **SEO Health Report**\n\nYour 'BakedBot Discovery' page is performing well!\n*   **Status**: Indexed ✅\n*   **Traffic**: +15% views this week\n*   **Top Keyword**: 'Dispensary near me open late'\n\n**Recommendation**: Add 2 more photos to your listing to boost engagement further."
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
export async function findTalkTrackByTrigger(prompt: string, role: TalkTrack['role']): Promise<TalkTrack | null> {
    const tracks = await getAllTalkTracks();
    const normalize = (s: string) => s.toLowerCase().trim();
    const normalizeForWords = (s: string) => normalize(s).replace(/[^a-z0-9]+/g, ' ').trim();
    const p = normalize(prompt);
    const pWords = ` ${normalizeForWords(prompt)} `;

    const matchesKeyword = (keyword: string): boolean => {
        const kNorm = normalize(keyword);
        const kWords = normalizeForWords(keyword);
        if (!kNorm || !kWords) return false;

        const tokens = kWords.split(/\s+/).filter(t => t.length > 1);
        if (tokens.length === 0) return false;

        // Single token: require word-boundary match to avoid substring false positives.
        if (tokens.length === 1) {
            return pWords.includes(` ${tokens[0]} `);
        }

        // Multi-token phrase: prefer exact phrase match, then fallback to "all tokens present".
        if (p.includes(kNorm)) return true;
        return tokens.every(t => pWords.includes(` ${t} `));
    };

    // 1. Try to find a specific Step match first (Deep Linking)
    for (const track of tracks) {
        if (track.role !== 'all' && track.role !== role) continue;

        const matchedStep = track.steps.find(step => 
            step.triggerKeywords?.some(matchesKeyword)
        );

        if (matchedStep) {
            // Clone track and move matched step to the front so consumer (route.ts) sees it first
            const newSteps = [matchedStep, ...track.steps.filter(s => s.id !== matchedStep.id)];
            return {
                ...track,
                steps: newSteps
            };
        }
    }

    // 2. Fallback to Track-level match
    const roleMatches = tracks.filter(t => t.role === 'all' || t.role === role);
    return roleMatches.find(t => 
        t.triggerKeywords.some(matchesKeyword)
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
