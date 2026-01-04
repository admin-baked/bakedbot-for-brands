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
        role: 'tech_vendor', // Targeted at tech vendors/researchers
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
                triggerKeywords: ['stripe', 'airtable', 'hubspot', 'custom', 'internal'],
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
    const p = normalize(prompt);

    // 1. Try to find a specific Step match first (Deep Linking)
    for (const track of tracks) {
        if (track.role !== 'all' && track.role !== role) continue;

        const matchedStep = track.steps.find(step => 
            step.triggerKeywords?.some(k => p.includes(normalize(k)))
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
