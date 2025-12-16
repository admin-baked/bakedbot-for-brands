
import { PRICING_PLANS, COVERAGE_PACKS } from '../src/lib/config/pricing';

console.log('Verifying Pricing Plans Configuration...');

let errors = [];

// Check Claim Pro
const claimPro = PRICING_PLANS.find(p => p.id === 'claim_pro');
if (!claimPro) errors.push('Missing Claim Pro plan');
else {
    if (claimPro.price !== 99) errors.push(`Claim Pro price mismatch: expected 99, got ${claimPro.price}`);
    if (claimPro.name !== 'Claim Pro') errors.push(`Claim Pro name mismatch: expected "Claim Pro", got "${claimPro.name}"`);
}

// Check Founders Claim
const founders = PRICING_PLANS.find(p => p.id === 'founders_claim');
if (!founders) errors.push('Missing Founders Claim plan');
else {
    if (founders.price !== 79) errors.push(`Founders Claim price mismatch: expected 79, got ${founders.price}`);
    if (!founders.scarcity) errors.push('Founders Claim missing scarcity flag');
    if (founders.scarcityLimit !== 75) errors.push(`Founders Claim scarcity limit mismatch: expected 75, got ${founders.scarcityLimit}`);
    if (founders.name !== 'Claim Pro (Founders)') errors.push(`Founders name mismatch: expected "Claim Pro (Founders)", got "${founders.name}"`);
}

// Check Coverage Packs
const pack100 = COVERAGE_PACKS.find(p => p.id === 'pack_100');
if (!pack100) errors.push('Missing Pack 100');
else if (pack100.price !== 49) errors.push('Pack 100 price mismatch');

// Check Free Listing Name
const free = PRICING_PLANS.find(p => p.id === 'free');
if (free && free.name !== 'Free Listing') errors.push('Free plan name mismatch');


if (errors.length > 0) {
    console.error('Verification Failed with errors:');
    errors.forEach(e => console.error(`- ${e}`));
    process.exit(1);
} else {
    console.log('Verification Passed!');
    console.log('--------------------------------');
    PRICING_PLANS.forEach(p => {
        console.log(`[${p.name} ($${p.price})]`);
        if (p.scarcity) console.log(`  -> Scarcity: ${p.scarcityLimit} slots left`);
    });
}
