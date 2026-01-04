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
                triggerKeywords: ['setup a new integration', 'connect app', 'new integration'],
                thought: "Checking integration catalog... Identifying common connectors...",
                message: "I'd love to help you set up a new integration! 🎉\n\nWhat service or application would you like to connect? For example:\n\n*   **Email/Communication**: Gmail, Slack\n*   **Project Management**: Asana, Jira\n*   **Data**: Google Sheets, HubSpot\n*   **Payment**: Stripe\n\nJust let me know what you're trying to connect to!"
            },
            {
                id: 'step-instagram-limitations',
                order: 2,
                type: 'response',
                triggerKeywords: ['instagram', 'instagram integration'],
                thought: "checking instagram api docs... verifying deprecation status... checking graph api limitations...",
                steps: [
                     "Checking Instagram Basic Display API...",
                     "Verifying Graph API permissions..."
                ],
                message: "I don't see a pre-built Instagram integration available at the moment. However, I can still help you connect to Instagram in a couple of ways:\n\n1.  **Direct API Connection** - (Meta API) Good for posting & analytics.\n2.  **Browser/Computer Access** - Slower but more flexible.\n\nWhat would you like to do? (Post content? Fetch analytics? Manage comments?)"
            },
            {
                id: 'step-lead-generation-pivot',
                order: 3,
                type: 'question',
                triggerKeywords: ['generate leads', 'liking and commenting', 'find dispensaries'],
                thought: "analyzing intent: lead generation... checking instagram tos... identifying risk factors...",
                steps: [
                    "Reviewing Instagram Terms of Service...",
                    "Analyzing 'liking and commenting' automation feasibility...",
                    "Identifying safer alternatives..."
                ],
                message: "Perfect! Lead generation is a solid use case.\n\n**Honest note:** Instagram's Terms of Service prohibit automated liking/commenting (it's considered bot activity). \n\nHowever, **LinkedIn** is fantastic for this B2B use case. Would you be open to exploring **LinkedIn** for finding dispensary owners and brands?"
            },
            {
                id: 'step-linkedin-setup',
                order: 4,
                type: 'action',
                triggerKeywords: ['setup linkedin', 'linkedin integration', 'look at linkedin'],
                thought: "provisioning linkedin connection... checking auth scopes...",
                steps: [
                    "Creating new connection: LinkedIn...",
                    "Requesting scopes: r_liteprofile, w_member_social...",
                    "Verifying connection status..."
                ],
                message: "Perfect! ✅ Your LinkedIn integration is all set up and ready to go!\n\nI've activated: **Search Organizations, Get Profiles, Create Posts**.\n\nHere's what we can now do:\n*   Find potential leads (Dispensaries/Brands)\n*   Research prospects\n*   Engage authentically\n\nWhat would you like to do next?"
            },
             {
                id: 'step-sheets-setup',
                order: 5,
                type: 'action',
                triggerKeywords: ['create google sheet', 'google sheet', 'keywords like cannabis'],
                thought: "connecting to google drive... creating spreadsheet... defining headers...",
                steps: [
                    "Authenticating Google Drive...",
                    "Creating spreadsheet: 'Cannabis B2B Lead Generation'...",
                    "Adding headers: Business Name, LinkedIn URL, Status, Email...",
                    "Format: Bold Headers"
                ],
                message: "Excellent! ✅ I've created your Google Sheet: **\"Cannabis B2B Lead Generation - LinkedIn Engagement\"**\n\nI'm ready to search for companies like *GTL, Ascend, 4front* and populate the sheet. Shall I start the search?"
            },
            {
                id: 'step-browser-automation',
                order: 6,
                type: 'action',
                triggerKeywords: ['browser search', 'virtual computer', 'option 3'],
                thought: "provisioning virtual desktop... launching chrome... navigating to linkedin...",
                steps: [
                    "Provisioning: Cannabis Lead Research Computer...",
                    "Booting environment...",
                    "Launching Chrome...",
                    "Navigating to linkedin.com/search..."
                ],
                message: "Virtual computer ready! 🖥️\n\nI'm browsing LinkedIn now. I've found about **1,800 cannabis dispensary results**.\n\nInstead of manual clicking, I propose:\n1.  **Daily Automation**: I find 3-5 new targets daily.\n2.  **Add to Sheet**: Populate the 'Daily Targets' tab.\n3.  **You Engage**: You like/comment on the specific posts I find.\n\nShould I set up this daily automation?"
            },
             {
                id: 'step-email-setup',
                order: 7,
                type: 'action',
                triggerKeywords: ['setup email', 'email sequence', 'gmail trigger', 'get emails'],
                thought: "configuring email finder... setting up gmail trigger... mapping sequence logic...",
                steps: [
                    "Connecting: QuickEmailVerification...",
                    "Connecting: Gmail...",
                    "Configuring Trigger: 'New Reply Received'...",
                    "Mapping A/B Path Logic..."
                ],
                message: "Perfect! 🎉 Your complete B2B outreach system is now set up!\n\n**✅ Active Components:**\n*   **Daily Discovery** (8am): Finds 3-5 new targets.\n*   **Email Finder**: Extracts emails when you mark 'Connected'.\n*   **Sequences**: A-Path (7 emails) vs B-Path (3 emails).\n*   **Reply Guard**: STOPS sequence immediately if they reply.\n\nReady to launch?"
            },
            {
                id: 'step-analytics-setup',
                order: 8,
                type: 'action',
                triggerKeywords: ['google analytics', 'utm', 'analytics'],
                thought: "connecting ga4... generating utm tags... configuring verified reporting...",
                steps: [
                    "Connecting: Google Analytics 4...",
                    "Generating UTMs: source=email, medium=sequence...",
                    "Creating conversion event: 'book_call'..."
                ],
                message: "🎉 **Google Analytics Integration COMPLETE!**\n\nI've generated unique UTM-tracked links for your **SEO Audit**, **Pricing Report**, and **Calendly**.\n\nYou can now see exactly which email drives the most bookings in your GA4 dashboard under `campaign: cannabis_b2b_linkedin`.\n\nThe system is LIVE. 🚀"
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
        ]
    },
    {
        id: 'dispensary-deal-scout',
        name: 'Dispensary Deal Scout',
        role: 'dispensary', // Targeted at dispensary operators/analysts
        triggerKeywords: ['monitor competitors', 'deal scout', 'price watch', 'daily scrape', 'competitor intel'],
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
