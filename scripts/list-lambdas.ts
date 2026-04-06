import { getFunctions } from '@remotion/lambda/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function list() {
    const region = 'us-west-2';
    console.log(`🔍 Listing Remotion Lambda functions in ${region}...`);
    
    try {
        const functions = await getFunctions({
            region,
            compatibleOnly: false,
        });
        
        console.log('✅ Functions found:');
        functions.forEach(f => {
            console.log(`- ${f.functionName} (${f.memorySizeInMb}MB, ${f.timeoutInSeconds}s)`);
        });
        
        if (functions.length === 0) {
            console.log('⚠️ No Remotion Lambda functions found in this region.');
        }
    } catch (error) {
        console.error('❌ Failed to list functions:', error);
    }
}

list();
