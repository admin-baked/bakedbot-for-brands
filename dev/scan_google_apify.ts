
import { apiCall } from './scan_leafly_complete';
import fs from 'fs';
import path from 'path';

// Reusing apiCall helper which wraps HTTPS for Apify
// Actor ID for Google Maps Scraper: nwua9Gu5YrADL7ZDj

async function main() {
    console.log('Starting Google Maps Discovery via Apify...');

    // 1. Prepare Input (from User Request)
    const input = {
        "searchStringsArray": [
            "dispensary"
        ],
        "locationQuery": "Chicago, IL",
        "maxCrawledPlacesPerSearch": 20, // Sample size
        "language": "en",
        "searchMatching": "all",
        "skipClosedPlaces": false,
        "includeWebResults": false,
        "scrapeDirectories": false,
        "maxReviews": 0,
        "scrapeReviewsPersonalData": true
    };

    console.log('Triggering Actor nwua9Gu5YrADL7ZDj...');

    // Start Run
    const run = await apiCall('/acts/nwua9Gu5YrADL7ZDj/runs', 'POST', input);

    if (!run || !run.data || !run.data.id) {
        console.error('Failed to start run:', run);
        return;
    }

    const runId = run.data.id;
    console.log(`Run started: ${runId}`);

    // Poll for completion
    let status = 'RUNNING';
    while (status === 'RUNNING' || status === 'READY') {
        await new Promise(r => setTimeout(r, 5000));
        const check = await apiCall(`/acts/nwua9Gu5YrADL7ZDj/runs/${runId}`, 'GET');
        status = check.data.status;
        console.log(`Status: ${status}`);
    }

    if (status === 'SUCCEEDED') {
        console.log('Run Succeeded. Fetching dataset...');
        // Correct dataset ID from run object
        const finalRun = await apiCall(`/acts/nwua9Gu5YrADL7ZDj/runs/${runId}`, 'GET');
        const datasetId = finalRun.data.defaultDatasetId;

        // Fetch items
        const dataset = await apiCall(`/datasets/${datasetId}/items`, 'GET');

        // Transform to our format
        const results = dataset.map((place: any) => ({
            id: place.placeId, // hashed later if needed
            name: place.title,
            city: place.city || 'Chicago',
            state: place.state || 'IL',
            address: place.address,
            location: place.location,
            url: place.url
        }));

        console.log(`Found ${results.length} dispensaries.`);

        // Save
        const outputPath = path.resolve(__dirname, 'discovered_dispensaries.json');
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        console.log(`Saved to ${outputPath}`);
    } else {
        console.error('Run failed:', status);
    }
}

main().catch(console.error);
