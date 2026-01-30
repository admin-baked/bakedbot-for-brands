/**
 * Intercept network requests from Thrive's menu to discover
 * the actual Dispense API endpoint and authentication method
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface APIRequest {
    url: string;
    method: string;
    headers: Record<string, string>;
    postData?: string;
    response?: {
        status: number;
        statusText: string;
        headers: Record<string, string>;
        body?: any;
    };
}

async function interceptDispenseAPI() {
    console.log('🕵️  Intercepting Dispense API Calls...\n');
    console.log('═'.repeat(70));

    const apiCalls: APIRequest[] = [];
    let browser;

    try {
        browser = await chromium.launch({ headless: false }); // Show browser for debugging
        const context = await browser.newContext();
        const page = await context.newPage();

        // Intercept all network requests
        page.on('request', request => {
            const url = request.url();

            // Look for API calls to dispenseapp.com
            if (url.includes('dispenseapp.com') || url.includes('api')) {
                console.log(`📡 Request: ${request.method()} ${url}`);

                apiCalls.push({
                    url,
                    method: request.method(),
                    headers: request.headers(),
                    postData: request.postData() || undefined,
                });
            }
        });

        // Intercept responses
        page.on('response', async response => {
            const url = response.url();

            // Look for API responses from dispenseapp.com
            if (url.includes('dispenseapp.com') || url.includes('api')) {
                console.log(`📥 Response: ${response.status()} ${url}`);

                // Find the matching request
                const apiCall = apiCalls.find(call => call.url === url && !call.response);

                if (apiCall) {
                    try {
                        const responseHeaders: Record<string, string> = {};
                        response.headers().forEach((value, key) => {
                            responseHeaders[key] = value;
                        });

                        let body;
                        const contentType = response.headers()['content-type'] || '';

                        if (contentType.includes('application/json')) {
                            body = await response.json();
                            console.log(`   ✅ JSON Response with ${Array.isArray(body) ? body.length : Object.keys(body).length} items/keys`);
                        }

                        apiCall.response = {
                            status: response.status(),
                            statusText: response.statusText(),
                            headers: responseHeaders,
                            body,
                        };
                    } catch (error) {
                        console.log(`   ⚠️  Could not parse response: ${error}`);
                    }
                }
            }
        });

        console.log('\n🌐 Loading menu page...');
        await page.goto('https://thrivesyracuse.com/menu', { waitUntil: 'networkidle' });

        console.log('⏳ Waiting for products to load...');
        await page.waitForTimeout(5000);

        console.log('\n📜 Scrolling to trigger more API calls...');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(3000);

        console.log('\n' + '═'.repeat(70));
        console.log(`\n✅ Captured ${apiCalls.length} API calls\n`);

        // Filter for the most important API calls (products/menu endpoints)
        const productAPICalls = apiCalls.filter(call =>
            call.url.includes('product') ||
            call.url.includes('menu') ||
            call.url.includes('inventory') ||
            call.url.includes('items')
        );

        console.log('🎯 Product-related API calls:\n');
        productAPICalls.forEach((call, idx) => {
            console.log(`${idx + 1}. ${call.method} ${call.url}`);
            console.log(`   Status: ${call.response?.status || 'pending'}`);

            // Check for auth headers
            const authHeaders = ['authorization', 'x-api-key', 'api-key', 'token', 'x-auth-token'];
            authHeaders.forEach(header => {
                if (call.headers[header]) {
                    console.log(`   Auth: ${header}: ${call.headers[header].substring(0, 50)}...`);
                }
            });

            if (call.response?.body) {
                if (Array.isArray(call.response.body)) {
                    console.log(`   Response: Array with ${call.response.body.length} items`);

                    // Show first item structure
                    if (call.response.body.length > 0) {
                        const firstItem = call.response.body[0];
                        console.log(`   Fields: ${Object.keys(firstItem).join(', ')}`);

                        // Check for image fields
                        const imageFields = Object.keys(firstItem).filter(k =>
                            k.toLowerCase().includes('image') ||
                            k.toLowerCase().includes('photo') ||
                            k.toLowerCase().includes('picture')
                        );

                        if (imageFields.length > 0) {
                            console.log(`   📸 Image fields: ${imageFields.join(', ')}`);
                            imageFields.forEach(field => {
                                console.log(`      ${field}: ${firstItem[field]}`);
                            });
                        }
                    }
                } else {
                    console.log(`   Response: Object with keys: ${Object.keys(call.response.body).join(', ')}`);
                }
            }

            console.log('');
        });

        // Save all API calls
        const savePath = path.join(process.cwd(), 'dev', 'intercepted-api-calls.json');
        fs.writeFileSync(savePath, JSON.stringify(apiCalls, null, 2));
        console.log(`💾 Saved all API calls to: ${savePath}\n`);

        // Create a working example
        if (productAPICalls.length > 0) {
            const workingCall = productAPICalls[0];

            console.log('🔧 WORKING API EXAMPLE:\n');
            console.log(`URL: ${workingCall.url}`);
            console.log(`Method: ${workingCall.method}`);
            console.log('\nHeaders:');
            Object.entries(workingCall.headers).forEach(([key, value]) => {
                if (!key.toLowerCase().includes('cookie')) {
                    console.log(`  ${key}: ${value}`);
                }
            });

            if (workingCall.postData) {
                console.log(`\nBody: ${workingCall.postData}`);
            }

            console.log(`\nStatus: ${workingCall.response?.status}`);

            // Save as a curl command
            const curlHeaders = Object.entries(workingCall.headers)
                .filter(([key]) => !key.toLowerCase().includes('cookie'))
                .map(([key, value]) => `-H "${key}: ${value}"`)
                .join(' \\\n  ');

            const curlCommand = `curl -X ${workingCall.method} \\\n  "${workingCall.url}" \\\n  ${curlHeaders}`;

            fs.writeFileSync(
                path.join(process.cwd(), 'dev', 'dispense-api-curl.sh'),
                curlCommand
            );

            console.log('\n💾 Saved curl command to: dev/dispense-api-curl.sh');
        }

        await browser.close();

    } catch (error) {
        console.error('\n❌ Failed:', error);
        if (browser) await browser.close();
        throw error;
    }
}

interceptDispenseAPI()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
