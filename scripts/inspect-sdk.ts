
import FirecrawlApp from '@mendable/firecrawl-js';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

const apiKey = process.env.FIRECRAWL_API_KEY || 'test_key';
const app = new FirecrawlApp({ apiKey });

console.log('--- Firecrawl SDK Inspection ---');
console.log('App instance keys:', Object.keys(app));
console.log('Prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(app)));

// Check if scrape exists
if ('scrape' in app) console.log('Has .scrape() property/method');
if ('scrapeUrl' in app) console.log('Has .scrapeUrl() property/method');

// Check prototype
const proto = Object.getPrototypeOf(app);
if (proto.scrape) console.log('Prototype has .scrape()');
if (proto.scrapeUrl) console.log('Prototype has .scrapeUrl()');

console.log('--------------------------------');
