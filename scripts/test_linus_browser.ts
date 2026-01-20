
import { browserService } from '../src/server/services/browser-service';
import { logger } from '../src/lib/logger';

async function testLinusBrowser() {
    console.log('Testing Linus Browser Service...');
    try {
        // Test reading a page (e.g., example.com)
        const url = 'https://example.com';
        console.log(`Browsing ${url}...`);
        const result = await browserService.browse(url, 'read');
        
        if (result.success) {
            console.log('Success!');
            console.log('Title:', result.title);
            console.log('Content Preview:', result.content.substring(0, 200) + '...');
        } else {
            console.error('Failed:', result.error);
            process.exit(1);
        }
    } catch (error) {
        console.error('Error executing browser test:', error);
        process.exit(1);
    }
}

testLinusBrowser();
