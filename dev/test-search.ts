
import { searchWeb } from '@/server/tools/web-search';

async function testSearch() {
    console.log('Testing Search Web...');
    try {
        const results = await searchWeb('Dutchie competitor pricing', 5);
        console.log('Results:', results);
    } catch (error) {
        console.error('Search Failed:', error);
    }
}

testSearch();
