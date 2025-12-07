# Ezal Competitive Intelligence - User Guide

## Overview
Ezal is your competitive intelligence agent. It monitors competitor menus 24/7 to give you insights on pricing, inventory, and new product launches.

## Dashboard
Access the Ezal dashboard via the Super Admin interface: **Dashboard > Ezal**.

### Key Metrics
- **Active Scrapers**: Number of competitor menus currently being tracked.
- **Products Tracked**: Total number of individual SKUs monitored across all competitors.
- **Insights (24h)**: Recent changes detected (price drops, restocks, etc.).

### Managing Competitors
1.  **Add Competitor**:
    - Click the **"Add Competitor"** button.
    - Enter the **Name** (e.g., "Green Dragon - Denver").
    - Enter the **Menu URL** (Live URL to their menu page).
    - Click "Create & Track".
    - *Note*: The system will automatically detect the platform (Dutchie/Jane/Weedmaps) based on the URL structure in future updates. For now, it uses a generic parser optimized for most dispensary sites.

2.  **View Status**:
    - The detailed list shows the last scrape time and status (Success/Error).
    - If a scraper is failing, check the URL to ensure it hasn't changed.

## Chat Integration
You can ask BakedBot (Smokey or Big Worm) to perform Ezal tasks directly.

### Commands
- **Track a Competitor**:
    > "Track Starbuds in Aurora, CO"
    > "Start tracking Planet 13 menu"

- **Get Insights**:
    > "What's new with my competitors?"
    > "Any recent price drops?"
    > "Who has cheaper Wyld gummies?"

- **Price Analysis**:
    > "Find price gaps for Edibles"
    > "Are my prices higher than the competition?"

## Troubleshooting
- **Scraper Errors**:
    - "Blocked by robots.txt": The site does not allow bots. We respect this.
    - "Parser failed": The site structure might have changed. Report this to engineering to update the `ParserProfile`.

- **No Data**:
    - Ensure the URL points to the *menu* page, not the homepage.
    - Wait at least 1 hour for the first scheduled scrape to complete.
