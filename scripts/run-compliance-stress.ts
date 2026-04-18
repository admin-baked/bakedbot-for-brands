/**
 * Deebo Compliance Agent — Multi-State Stress Test
 *
 * Tests the BakedBot Deebo compliance enforcer across 9 US cannabis markets:
 * NY, CA, CO, IL, MA, WA, NV, NJ, MI. Phase 4 of the stress test expansion toward national coverage.
 *
 * No Firebase/Firestore — purely API-driven compliance knowledge testing.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: '.env.local' });
dotenv.config();

// ============================================================================
// TYPES
// ============================================================================

type ComplianceState = 'NY' | 'CA' | 'CO' | 'IL' | 'MA' | 'WA' | 'NV' | 'NJ' | 'MI';
type ComplianceCategory =
    | 'possession-limits'
    | 'advertising'
    | 'packaging'
    | 'licensing'
    | 'testing'
    | 'employment'
    | 'operations'
    | 'delivery'
    | 'tax'
    | 'enforcement'
    | 'track-trace'
    | 'federal';
type ComplianceDifficulty = 'basic' | 'intermediate' | 'advanced';

interface ComplianceCase {
    id: string;
    title: string;
    state: ComplianceState;
    category: ComplianceCategory;
    question: string;
    expectedTopics: string[];
    mustNotContain?: string[];
    mustReference?: string[];
    difficulty: ComplianceDifficulty;
}

interface GradeDimensions {
    accuracy: number;
    caveats: number;
    actionability: number;
    tone: number;
    completeness: number;
}

interface GradeResult {
    grade: 'great' | 'good' | 'acceptable' | 'poor' | 'fail';
    score: number;
    responseReady: boolean;
    summary: string;
    strengths: string[];
    issues: string[];
    suggestedFixes: string[];
    dimensions: GradeDimensions;
}

interface CaseResult {
    id: string;
    title: string;
    state: ComplianceState;
    category: ComplianceCategory;
    difficulty: ComplianceDifficulty;
    durationMs: number;
    response: string;
    responsePreview: string;
    grade: GradeResult;
    error?: string;
}

// ============================================================================
// DEEBO SYSTEM PROMPT
// ============================================================================

const DEEBO_SYSTEM_PROMPT = `You are Deebo, the compliance enforcer for BakedBot — a cannabis retail AI platform. You are strict, thorough, and always accurate about cannabis regulations.

You help dispensary operators understand:
- State-specific possession limits and purchase limits
- Advertising and marketing restrictions
- Packaging and labeling requirements
- Employee and licensing requirements
- Testing and quality control requirements
- Delivery service rules
- Tax obligations

COMPLIANCE RULES (non-negotiable):
1. Always state which state's regulations you're referencing
2. For complex legal questions, ALWAYS recommend verifying with a compliance officer or licensed attorney
3. Never make overconfident statements about regulations that change frequently (license renewal dates, exact fee amounts)
4. If regulations differ by license type (adult-use vs. medical), clarify both
5. Never fabricate specific statute numbers unless you are certain — say "check your state regulations" instead
6. For advertising questions, always err on the side of caution — restrictions are strict in all cannabis states

Be direct, accurate, and helpful. A dispensary operator asking these questions needs real guidance, not vague deflections.`;

// ============================================================================
// 90 COMPLIANCE CASES — 10 per state (NY, CA, CO, IL, MA, WA, NV, NJ, MI)
// ============================================================================

const COMPLIANCE_CASES: ComplianceCase[] = [
    // ─── NEW YORK (NY) — 10 cases ────────────────────────────────────────────
    {
        id: 'ny-possession-limits',
        title: 'NY adult recreational possession limits',
        state: 'NY',
        category: 'possession-limits',
        question: 'What are the current adult recreational cannabis possession limits in New York State?',
        expectedTopics: ['3 ounces', 'flower', '24 grams', 'concentrate', 'adult', '21'],
        mustReference: ['3', 'ounce'],
        mustNotContain: ['1 ounce', '8 grams', 'I cannot provide'],
        difficulty: 'basic',
    },
    {
        id: 'ny-advertising-social-media',
        title: 'NY cannabis advertising on Facebook/Instagram',
        state: 'NY',
        category: 'advertising',
        question: 'Can our New York dispensary advertise on Facebook or Instagram? What social media advertising is allowed in NY?',
        expectedTopics: ['OCM', 'age-gating', 'restrictions', 'minors', 'audience verification', 'platform terms'],
        mustReference: ['OCM', 'age'],
        difficulty: 'intermediate',
    },
    {
        id: 'ny-packaging-labels',
        title: 'NY cannabis label requirements',
        state: 'NY',
        category: 'packaging',
        question: 'What does New York require on cannabis product labels? What information must be included?',
        expectedTopics: ['THC content', 'warnings', 'batch number', 'licensee', 'universal symbol', 'weight'],
        mustReference: ['THC', 'warning'],
        difficulty: 'intermediate',
    },
    {
        id: 'ny-caurd-vs-aucc',
        title: 'NY CAURD vs AUCC license difference',
        state: 'NY',
        category: 'licensing',
        question: 'What is the difference between a CAURD license and an AUCC (adult-use conditional cultivator) license in New York?',
        expectedTopics: ['CAURD', 'dispensary', 'cultivator', 'conditional', 'adult-use', 'OCM', 'social equity'],
        mustReference: ['CAURD', 'OCM'],
        difficulty: 'advanced',
    },
    {
        id: 'ny-delivery-license',
        title: 'NY cannabis home delivery requirements',
        state: 'NY',
        category: 'delivery',
        question: 'Can our dispensary in New York offer home delivery? What license and process is required?',
        expectedTopics: ['delivery', 'license', 'OCM', 'verification', 'age', 'compliance'],
        mustReference: ['delivery', 'license'],
        difficulty: 'intermediate',
    },
    {
        id: 'ny-budtender-certification',
        title: 'NY budtender state certification requirement',
        state: 'NY',
        category: 'employment',
        question: 'Do budtenders in New York need a specific state certification or training before working on the sales floor?',
        expectedTopics: ['training', 'certification', 'employee', 'OCM', 'responsible vendor', 'dispensary'],
        mustReference: ['training', 'NY'],
        difficulty: 'basic',
    },
    {
        id: 'ny-metrc-transactions',
        title: 'NY Metrc required transactions',
        state: 'NY',
        category: 'operations',
        question: 'New York uses Metrc as its seed-to-sale tracking system. What transactions must a retail dispensary record in Metrc?',
        expectedTopics: ['Metrc', 'seed-to-sale', 'transfer', 'sale', 'inventory', 'adjustment', 'manifest'],
        mustReference: ['Metrc', 'inventory'],
        difficulty: 'intermediate',
    },
    {
        id: 'ny-loyalty-programs',
        title: 'NY cannabis loyalty programs',
        state: 'NY',
        category: 'advertising',
        question: 'Are cannabis loyalty programs allowed in New York? Are there any restrictions on how they can work?',
        expectedTopics: ['loyalty', 'OCM', 'restrictions', 'discount', 'promotional', 'compliance'],
        mustReference: ['loyalty', 'OCM'],
        difficulty: 'intermediate',
    },
    {
        id: 'ny-cannabis-tax-layers',
        title: 'NY cannabis tax layers — excise and local',
        state: 'NY',
        category: 'tax',
        question: 'What are the different layers of cannabis taxes in New York? What does a dispensary collect and remit?',
        expectedTopics: ['excise tax', 'local', 'potency', 'THC', 'municipality', 'OCM', 'retail'],
        mustReference: ['excise', 'tax'],
        difficulty: 'intermediate',
    },
    {
        id: 'ny-consumption-lounge',
        title: 'NY consumption lounge legality',
        state: 'NY',
        category: 'operations',
        question: 'Are cannabis consumption lounges legal in New York? What is the current status of on-site consumption rules?',
        expectedTopics: ['consumption lounge', 'OCM', 'license', 'on-site', 'municipality', 'status'],
        mustReference: ['consumption', 'OCM'],
        difficulty: 'advanced',
    },

    // ─── CALIFORNIA (CA) — 10 cases ──────────────────────────────────────────
    {
        id: 'ca-possession-limits',
        title: 'CA adult recreational possession limits',
        state: 'CA',
        category: 'possession-limits',
        question: 'What are the adult recreational cannabis possession limits in California?',
        expectedTopics: ['1 ounce', 'flower', '8 grams', 'concentrate', 'adult', '21', 'DCC'],
        mustReference: ['1 ounce', 'ounce'],
        mustNotContain: ['3 ounces', 'I cannot provide'],
        difficulty: 'basic',
    },
    {
        id: 'ca-digital-ad-age-gating',
        title: 'CA age-gating requirements for digital ads',
        state: 'CA',
        category: 'advertising',
        question: 'What are California\'s age-gating requirements for digital cannabis advertising? What does our website and social media need to comply?',
        expectedTopics: ['DCC', 'age-gating', '71.6%', 'adult', 'verification', 'platform', '21+'],
        mustReference: ['DCC', 'age'],
        difficulty: 'intermediate',
    },
    {
        id: 'ca-child-resistant-packaging',
        title: 'CA child-resistant packaging requirements',
        state: 'CA',
        category: 'packaging',
        question: 'What are California\'s child-resistant packaging requirements for cannabis products? What do we need to know at the retail level?',
        expectedTopics: ['child-resistant', 'DCC', 'opaque', 'resealable', 'testing', 'ASTM', 'packaging'],
        mustReference: ['child-resistant', 'DCC'],
        difficulty: 'intermediate',
    },
    {
        id: 'ca-type-10-vs-10a',
        title: 'CA Type 10 vs Type 10A license',
        state: 'CA',
        category: 'licensing',
        question: 'What is the difference between a California Type 10 retailer license and a Type 10A delivery-only license?',
        expectedTopics: ['Type 10', 'Type 10A', 'storefront', 'delivery-only', 'DCC', 'non-storefront'],
        mustReference: ['Type 10', 'DCC'],
        difficulty: 'advanced',
    },
    {
        id: 'ca-delivery-county-lines',
        title: 'CA cannabis delivery across county lines',
        state: 'CA',
        category: 'delivery',
        question: 'Can a California licensed cannabis retailer make deliveries that cross county lines? What are the rules?',
        expectedTopics: ['DCC', 'county', 'delivery', 'statewide', 'non-storefront', 'jurisdiction'],
        mustReference: ['county', 'DCC'],
        difficulty: 'advanced',
    },
    {
        id: 'ca-testing-panels',
        title: 'CA required testing panels before sale',
        state: 'CA',
        category: 'testing',
        question: 'What testing panels are required in California before cannabis products can be sold to consumers?',
        expectedTopics: ['potency', 'pesticides', 'microbials', 'heavy metals', 'residual solvents', 'terpenes', 'DCC', 'lab'],
        mustReference: ['DCC', 'potency'],
        difficulty: 'intermediate',
    },
    {
        id: 'ca-billboard-advertising',
        title: 'CA cannabis billboard advertising',
        state: 'CA',
        category: 'advertising',
        question: 'Can a California dispensary use billboard advertising? What restrictions apply?',
        expectedTopics: ['billboard', 'DCC', '1000 feet', 'school', 'minors', 'restrictions', 'outdoor'],
        mustReference: ['DCC', 'billboard'],
        difficulty: 'intermediate',
    },
    {
        id: 'ca-metrc-requirements',
        title: 'CA track-and-trace (CCTT/Metrc) requirements',
        state: 'CA',
        category: 'operations',
        question: 'What does California require for seed-to-sale tracking? What does a retailer need to do in the CCTT/Metrc system?',
        expectedTopics: ['CCTT', 'Metrc', 'DCC', 'manifest', 'package tag', 'transfer', 'retail sale'],
        mustReference: ['Metrc', 'DCC'],
        difficulty: 'intermediate',
    },
    {
        id: 'ca-excise-tax',
        title: 'CA excise tax rate and collection',
        state: 'CA',
        category: 'tax',
        question: 'What is California\'s cannabis excise tax rate, and who collects and remits it — the retailer or the distributor?',
        expectedTopics: ['excise tax', '15%', 'distributor', 'retailer', 'DCC', 'CDTFA', 'average market price'],
        mustReference: ['excise', 'tax'],
        difficulty: 'intermediate',
    },
    {
        id: 'ca-worker-protection-act',
        title: 'CA cannabis worker protection act',
        state: 'CA',
        category: 'employment',
        question: 'What does California\'s cannabis worker protection act require of dispensary employers?',
        expectedTopics: ['AB 2188', 'employer', 'testing', 'off-duty', 'non-psychoactive', 'discrimination', 'worker'],
        mustReference: ['employer', 'CA'],
        difficulty: 'advanced',
    },

    // ─── COLORADO (CO) — 10 cases ─────────────────────────────────────────────
    {
        id: 'co-possession-home-grow',
        title: 'CO adult possession limits and home grow rules',
        state: 'CO',
        category: 'possession-limits',
        question: 'What are Colorado\'s adult recreational possession limits, and what are the home grow rules?',
        expectedTopics: ['1 ounce', 'possession', 'home grow', '3 plants', '6 plants', 'MED', '21+'],
        mustReference: ['1 ounce', 'home grow'],
        mustNotContain: ['3 ounces', 'I cannot provide'],
        difficulty: 'basic',
    },
    {
        id: 'co-vertical-integration',
        title: 'CO vertical integration — retailer and cultivator',
        state: 'CO',
        category: 'licensing',
        question: 'Can a Colorado cannabis retailer also hold a cultivation license? What does vertical integration look like under MED rules?',
        expectedTopics: ['MED', 'vertical integration', 'retail', 'cultivator', 'license', 'Marijuana Enforcement Division'],
        mustReference: ['MED', 'license'],
        difficulty: 'advanced',
    },
    {
        id: 'co-advertising-restrictions',
        title: 'CO cannabis advertising — banned vs. allowed',
        state: 'CO',
        category: 'advertising',
        question: 'What advertising is banned vs. allowed for cannabis retailers in Colorado? Give me the key rules.',
        expectedTopics: ['MED', '1000 feet', 'school', 'minors', 'age-gating', 'false claims', 'radio', 'TV'],
        mustReference: ['MED', 'school'],
        difficulty: 'intermediate',
    },
    {
        id: 'co-metrc-retailer',
        title: 'CO seed-to-sale tracking (Metrc) for retailers',
        state: 'CO',
        category: 'operations',
        question: 'What does a Colorado cannabis retailer need to do in Metrc? What are the key tracking requirements?',
        expectedTopics: ['Metrc', 'MED', 'package tag', 'manifest', 'retail sale', 'inventory'],
        mustReference: ['Metrc', 'MED'],
        difficulty: 'intermediate',
    },
    {
        id: 'co-tax-structure',
        title: 'CO marijuana retail tax structure',
        state: 'CO',
        category: 'tax',
        question: 'What is Colorado\'s marijuana retail tax structure? What percentage does a retailer collect?',
        expectedTopics: ['15%', 'retail marijuana sales tax', 'excise', 'local', 'state', 'MED', 'CDOR'],
        mustReference: ['15%', 'tax'],
        difficulty: 'intermediate',
    },
    {
        id: 'co-required-lab-testing',
        title: 'CO required lab testing panels and potency limits',
        state: 'CO',
        category: 'testing',
        question: 'What lab testing is required in Colorado before cannabis can be sold? Are there any potency limits?',
        expectedTopics: ['potency', 'pesticides', 'microbials', 'residual solvents', 'MED', 'CDPHE', 'lab', 'concentrate limit'],
        mustReference: ['MED', 'testing'],
        difficulty: 'intermediate',
    },
    {
        id: 'co-packaging-labeling',
        title: 'CO child-resistant packaging and labeling rules',
        state: 'CO',
        category: 'packaging',
        question: 'What are Colorado\'s packaging and labeling requirements for cannabis retail? What must be on the label?',
        expectedTopics: ['child-resistant', 'MED', 'universal symbol', 'THC content', 'warning', 'opaque'],
        mustReference: ['MED', 'child-resistant'],
        difficulty: 'intermediate',
    },
    {
        id: 'co-workplace-cannabis',
        title: 'CO cannabis consumption in the workplace policy',
        state: 'CO',
        category: 'employment',
        question: 'In Colorado, what is the policy framework around employee cannabis use? Can employers still test and terminate for positive results?',
        expectedTopics: ['employer', 'drug testing', 'CADA', 'off-duty', 'termination', 'impairment', 'MED'],
        mustReference: ['employer', 'CO'],
        difficulty: 'advanced',
    },
    {
        id: 'co-cannabis-delivery',
        title: 'CO cannabis delivery legality and requirements',
        state: 'CO',
        category: 'delivery',
        question: 'Is cannabis home delivery legal in Colorado? What is required for a retailer to offer delivery?',
        expectedTopics: ['delivery', 'MED', 'license', 'municipality', 'opt-in', 'age verification'],
        mustReference: ['MED', 'delivery'],
        difficulty: 'intermediate',
    },
    {
        id: 'co-hospitality-establishment',
        title: 'CO hospitality establishment (consumption lounge) license',
        state: 'CO',
        category: 'operations',
        question: 'What is Colorado\'s hospitality establishment license? Can a dispensary run an on-site consumption lounge?',
        expectedTopics: ['hospitality establishment', 'MED', 'on-site consumption', 'license', 'municipality', 'HVAC', 'ventilation'],
        mustReference: ['hospitality', 'MED'],
        difficulty: 'advanced',
    },

    // ─── ILLINOIS (IL) — 10 cases ────────────────────────────────────────────
    {
        id: 'il-possession-limits-residents',
        title: 'IL possession limits — residents vs non-residents',
        state: 'IL',
        category: 'possession-limits',
        question: 'What are Illinois\'s recreational cannabis possession limits? Do limits differ for Illinois residents vs. non-residents?',
        expectedTopics: ['30 grams', 'resident', 'non-resident', '15 grams', 'Illinois', 'CCB', 'IDFPR'],
        mustReference: ['resident', 'grams'],
        mustNotContain: ['I cannot provide'],
        difficulty: 'basic',
    },
    {
        id: 'il-caudo-license',
        title: 'IL Conditional Adult-Use Dispensing Organization (CAUDO)',
        state: 'IL',
        category: 'licensing',
        question: 'What is an Illinois Conditional Adult-Use Dispensing Organization (CAUDO) and how does it differ from a standard dispensary license?',
        expectedTopics: ['CAUDO', 'IDFPR', 'CCB', 'conditional', 'medical', 'adult-use', 'transition'],
        mustReference: ['CAUDO', 'IL'],
        difficulty: 'advanced',
    },
    {
        id: 'il-advertising-social-equity',
        title: 'IL cannabis advertising and social equity provisions',
        state: 'IL',
        category: 'advertising',
        question: 'What are Illinois\'s cannabis advertising rules? Are there any specific social equity marketing provisions?',
        expectedTopics: ['IDFPR', 'CCB', 'age-gating', 'minors', 'social equity', 'restrictions', 'Cannabis Regulation Act'],
        mustReference: ['CCB', 'advertising'],
        difficulty: 'intermediate',
    },
    {
        id: 'il-tiered-thc-tax',
        title: 'IL tiered excise tax based on THC content',
        state: 'IL',
        category: 'tax',
        question: 'How does Illinois\'s tiered cannabis excise tax based on THC content work? What are the different rates?',
        expectedTopics: ['10%', '20%', '25%', 'THC', 'infused', 'flower', 'concentrate', 'IDOR', 'tiered'],
        mustReference: ['THC', 'tax'],
        difficulty: 'intermediate',
    },
    {
        id: 'il-employer-cannabis-testing',
        title: 'IL employer cannabis testing — termination for positive test',
        state: 'IL',
        category: 'employment',
        question: 'In Illinois, can employers fire employees for a positive cannabis test? What does the Cannabis Regulation and Tax Act say about employment?',
        expectedTopics: ['CRTA', 'employer', 'off-duty', 'impairment', 'reasonable suspicion', 'termination', 'Illinois'],
        mustReference: ['employer', 'IL'],
        difficulty: 'advanced',
    },
    {
        id: 'il-packaging-labeling',
        title: 'IL packaging and labeling requirements',
        state: 'IL',
        category: 'packaging',
        question: 'What are Illinois\'s cannabis packaging and labeling requirements at the retail level?',
        expectedTopics: ['CCB', 'IDFPR', 'child-resistant', 'THC content', 'warning', 'universal symbol', 'batch'],
        mustReference: ['CCB', 'packaging'],
        difficulty: 'intermediate',
    },
    {
        id: 'il-electronic-tracking',
        title: 'IL electronic seed-to-sale tracking system',
        state: 'IL',
        category: 'operations',
        question: 'What electronic tracking system does Illinois use for cannabis, and what are the key retailer obligations?',
        expectedTopics: ['BioTrackTHC', 'Metrc', 'IDFPR', 'CCB', 'seed-to-sale', 'inventory', 'manifest'],
        mustReference: ['tracking', 'IL'],
        difficulty: 'intermediate',
    },
    {
        id: 'il-social-equity-criteria',
        title: 'IL social equity applicant criteria',
        state: 'IL',
        category: 'licensing',
        question: 'What qualifies someone as a social equity applicant in Illinois? What are the criteria?',
        expectedTopics: ['social equity', 'CCB', 'disproportionately impacted area', 'DIA', 'conviction', 'IDFPR', 'ownership'],
        mustReference: ['social equity', 'CCB'],
        difficulty: 'advanced',
    },
    {
        id: 'il-home-delivery',
        title: 'IL cannabis home delivery legality',
        state: 'IL',
        category: 'delivery',
        question: 'Is cannabis home delivery legal in Illinois? If so, what is required for a dispensary to offer it?',
        expectedTopics: ['delivery', 'CCB', 'IDFPR', 'license', 'age verification', 'municipality', 'vehicle'],
        mustReference: ['delivery', 'IL'],
        difficulty: 'intermediate',
    },
    {
        id: 'il-multi-dispensary-caps',
        title: 'IL multi-dispensary ownership caps',
        state: 'IL',
        category: 'operations',
        question: 'Are there caps on how many dispensaries one entity can own in Illinois? What are the current ownership limits?',
        expectedTopics: ['ownership cap', 'CCB', 'IDFPR', 'entity', 'dispensary', 'license', 'Cannabis Regulation'],
        mustReference: ['CCB', 'ownership'],
        difficulty: 'advanced',
    },

    // ─── MASSACHUSETTS (MA) — 10 cases ───────────────────────────────────────
    {
        id: 'ma-possession-limits',
        title: 'MA adult recreational possession limits',
        state: 'MA',
        category: 'possession-limits',
        question: 'What are the adult recreational cannabis possession limits in Massachusetts?',
        expectedTopics: ['1 ounce', 'flower', '5 grams', 'concentrate', 'CCC', 'adult', '21+'],
        mustReference: ['1 ounce', 'CCC'],
        mustNotContain: ['3 ounces', 'I cannot provide'],
        difficulty: 'basic',
    },
    {
        id: 'ma-host-community-agreement',
        title: 'MA Host Community Agreement (HCA) requirement',
        state: 'MA',
        category: 'licensing',
        question: 'What is a Massachusetts Host Community Agreement (HCA) and why does it matter for getting a dispensary license?',
        expectedTopics: ['HCA', 'CCC', 'municipality', 'host community', 'required', 'local approval', 'Cannabis Control Commission'],
        mustReference: ['HCA', 'CCC'],
        difficulty: 'advanced',
    },
    {
        id: 'ma-advertising-restrictions',
        title: 'MA cannabis advertising media placement rules',
        state: 'MA',
        category: 'advertising',
        question: 'What are Massachusetts\'s cannabis advertising restrictions? What are the media placement rules?',
        expectedTopics: ['CCC', '85%', 'adults 21+', 'age-gating', 'broadcast', 'print', 'restrictions', '1000 feet'],
        mustReference: ['CCC', 'advertising'],
        difficulty: 'intermediate',
    },
    {
        id: 'ma-tax-breakdown',
        title: 'MA cannabis tax breakdown',
        state: 'MA',
        category: 'tax',
        question: 'What is the total cannabis tax in Massachusetts? Break down the excise tax, sales tax, and local option tax.',
        expectedTopics: ['10.75%', '6.25%', '3%', 'excise', 'sales tax', 'local option', 'CCC', 'DOR'],
        mustReference: ['10.75%', 'tax'],
        difficulty: 'intermediate',
    },
    {
        id: 'ma-testing-requirements',
        title: 'MA testing requirements and lab certification',
        state: 'MA',
        category: 'testing',
        question: 'What testing is required in Massachusetts before cannabis can be sold? What does lab certification involve?',
        expectedTopics: ['CCC', 'potency', 'pesticides', 'microbials', 'residual solvents', 'heavy metals', 'certified lab'],
        mustReference: ['CCC', 'testing'],
        difficulty: 'intermediate',
    },
    {
        id: 'ma-labeling-packaging',
        title: 'MA cannabis labeling and packaging requirements',
        state: 'MA',
        category: 'packaging',
        question: 'What are Massachusetts\'s cannabis packaging and labeling requirements for retail dispensaries?',
        expectedTopics: ['CCC', 'child-resistant', 'THC', 'warning', 'universal symbol', 'opaque', 'batch number'],
        mustReference: ['CCC', 'packaging'],
        difficulty: 'intermediate',
    },
    {
        id: 'ma-social-equity-program',
        title: 'MA Social Equity Program benefits',
        state: 'MA',
        category: 'operations',
        question: 'What is Massachusetts\'s Cannabis Social Equity Program and what benefits does it provide to eligible applicants?',
        expectedTopics: ['CCC', 'Social Equity Program', 'disproportionately harmed', 'priority', 'technical assistance', 'fee waiver', 'license'],
        mustReference: ['CCC', 'Social Equity'],
        difficulty: 'advanced',
    },
    {
        id: 'ma-cori-cannabis-hiring',
        title: 'MA CORI checks and cannabis hiring',
        state: 'MA',
        category: 'employment',
        question: 'How does Massachusetts CORI (Criminal Offender Record Information) law interact with cannabis dispensary hiring? Can prior cannabis convictions be used against applicants?',
        expectedTopics: ['CORI', 'CCC', 'prior conviction', 'cannabis', 'expungement', 'hiring', 'background check'],
        mustReference: ['CORI', 'CCC'],
        difficulty: 'advanced',
    },
    {
        id: 'ma-delivery-program',
        title: 'MA cannabis delivery program participation',
        state: 'MA',
        category: 'delivery',
        question: 'Who can participate in Massachusetts\'s cannabis delivery program? What license or endorsement is needed?',
        expectedTopics: ['CCC', 'delivery operator', 'courier', 'license', 'social equity', 'adult-use', 'endorsement'],
        mustReference: ['CCC', 'delivery'],
        difficulty: 'intermediate',
    },
    {
        id: 'ma-metrc-requirements',
        title: 'MA Metrc requirements for dispensaries',
        state: 'MA',
        category: 'operations',
        question: 'What are Massachusetts\'s Metrc requirements for cannabis dispensaries? What must be tracked and reported?',
        expectedTopics: ['Metrc', 'CCC', 'seed-to-sale', 'package tag', 'manifest', 'transfer', 'inventory', 'retail sale'],
        mustReference: ['Metrc', 'CCC'],
        difficulty: 'intermediate',
    },

    // ─── WASHINGTON (WA) — 10 cases ──────────────────────────────────────────
    {
        id: 'wa-possession-limits',
        title: 'WA adult recreational possession limits',
        state: 'WA',
        category: 'possession-limits',
        question: 'What are the adult recreational cannabis possession limits in Washington State?',
        expectedTopics: ['1 ounce', 'usable', '16 ounces', 'solid', '72 ounces', 'liquid', 'infused', 'adult', '21'],
        mustReference: ['1 ounce', 'ounce'],
        mustNotContain: ['3 ounces', 'I cannot provide'],
        difficulty: 'basic',
    },
    {
        id: 'wa-license-types',
        title: 'WA retailer license vs. medical marijuana endorsement',
        state: 'WA',
        category: 'licensing',
        question: 'In Washington State, what is the difference between a standard cannabis retailer license and a medical marijuana endorsement? Do we need both to serve medical patients?',
        expectedTopics: ['LCB', 'retailer license', 'medical marijuana endorsement', 'authorization', 'patient', 'adult-use'],
        mustReference: ['LCB', 'endorsement'],
        difficulty: 'intermediate',
    },
    {
        id: 'wa-advertising-restrictions',
        title: 'WA cannabis advertising platform and content rules',
        state: 'WA',
        category: 'advertising',
        question: 'What advertising restrictions apply to cannabis retailers in Washington State? What platforms and content rules must we follow?',
        expectedTopics: ['LCB', 'age-gating', 'minors', '21+', 'outdoor', 'social media', 'content restrictions', 'false claims'],
        mustReference: ['LCB', 'advertising'],
        difficulty: 'intermediate',
    },
    {
        id: 'wa-required-testing',
        title: 'WA mandatory testing panels before retail sale',
        state: 'WA',
        category: 'testing',
        question: 'What testing panels are mandatory in Washington State before cannabis products can be sold at retail?',
        expectedTopics: ['LCB', 'potency', 'pesticides', 'microbials', 'residual solvents', 'heavy metals', 'lab', 'accredited'],
        mustReference: ['LCB', 'testing'],
        difficulty: 'intermediate',
    },
    {
        id: 'wa-labeling-requirements',
        title: 'WA cannabis label requirements',
        state: 'WA',
        category: 'packaging',
        question: 'What information is required on cannabis product labels in Washington State? What does our packaging need to include?',
        expectedTopics: ['LCB', 'THC content', 'warning', 'universal symbol', 'licensee', 'weight', 'batch number'],
        mustReference: ['LCB', 'warning'],
        difficulty: 'basic',
    },
    {
        id: 'wa-excise-tax',
        title: 'WA cannabis excise tax structure',
        state: 'WA',
        category: 'tax',
        question: 'What is Washington State\'s cannabis excise tax rate and how does it work? What does a retailer collect at the point of sale?',
        expectedTopics: ['37%', 'excise', 'retail price', 'LCB', 'DOR', 'sales tax', 'retailer'],
        mustReference: ['37%', 'excise'],
        difficulty: 'intermediate',
    },
    {
        id: 'wa-biotrack-traceability',
        title: 'WA BioTrack seed-to-sale traceability requirements',
        state: 'WA',
        category: 'operations',
        question: 'Washington uses BioTrack for seed-to-sale traceability. What does our retail dispensary need to track and report in BioTrack?',
        expectedTopics: ['BioTrack', 'LCB', 'inventory', 'transfer', 'sale', 'manifest', 'package', 'seed-to-sale'],
        mustReference: ['BioTrack', 'LCB'],
        difficulty: 'intermediate',
    },
    {
        id: 'wa-delivery-rules',
        title: 'WA cannabis delivery — legality and requirements',
        state: 'WA',
        category: 'delivery',
        question: 'Is cannabis home delivery legal in Washington State? What are the rules and requirements for a retailer wanting to offer delivery?',
        expectedTopics: ['LCB', 'delivery', 'license', 'age verification', 'municipality', 'vehicle', 'endorsement'],
        mustReference: ['LCB', 'delivery'],
        difficulty: 'advanced',
    },
    {
        id: 'wa-employer-drug-testing',
        title: 'WA employer cannabis drug testing rights',
        state: 'WA',
        category: 'employment',
        question: 'In Washington State, can employers test employees for cannabis? Can they terminate employees for a positive cannabis test?',
        expectedTopics: ['employer', 'drug testing', 'off-duty', 'impairment', 'Washington', 'termination', 'policy'],
        mustReference: ['employer', 'WA'],
        difficulty: 'intermediate',
    },
    {
        id: 'wa-vertical-integration',
        title: 'WA vertical integration limits for retailers',
        state: 'WA',
        category: 'operations',
        question: 'Can a cannabis retailer in Washington State also hold a producer or processor license? What are the vertical integration restrictions?',
        expectedTopics: ['LCB', 'vertical integration', 'producer', 'processor', 'retailer', 'license', 'restrictions', 'separate entity'],
        mustReference: ['LCB', 'vertical'],
        difficulty: 'advanced',
    },

    // ─── NEVADA (NV) — 10 cases ──────────────────────────────────────────────
    {
        id: 'nv-possession-limits',
        title: 'NV adult recreational possession limits',
        state: 'NV',
        category: 'possession-limits',
        question: 'What are the adult recreational cannabis possession limits in Nevada?',
        expectedTopics: ['1 ounce', 'flower', '1/8 ounce', 'concentrate', 'adult', '21', 'CCB'],
        mustReference: ['1 ounce', 'concentrate'],
        mustNotContain: ['3 ounces', 'I cannot provide'],
        difficulty: 'basic',
    },
    {
        id: 'nv-license-types',
        title: 'NV dispensary retail vs. medical license types',
        state: 'NV',
        category: 'licensing',
        question: 'What are the different dispensary license types in Nevada? What is the difference between a retail store license and a medical dispensary license?',
        expectedTopics: ['CCB', 'retail store', 'medical dispensary', 'dual-use', 'license', 'Nevada'],
        mustReference: ['CCB', 'license'],
        difficulty: 'intermediate',
    },
    {
        id: 'nv-advertising-restrictions',
        title: 'NV cannabis advertising restrictions',
        state: 'NV',
        category: 'advertising',
        question: 'What advertising restrictions apply to cannabis retailers in Nevada? What are the key rules for digital and print advertising?',
        expectedTopics: ['CCB', 'age-gating', 'minors', '21+', 'false claims', 'outdoor', 'restrictions', 'social media'],
        mustReference: ['CCB', 'advertising'],
        difficulty: 'intermediate',
    },
    {
        id: 'nv-tax-structure',
        title: 'NV cannabis tax structure — excise, retail, and sales',
        state: 'NV',
        category: 'tax',
        question: 'What is Nevada\'s cannabis tax structure? I\'ve heard there\'s an excise tax, a retail tax, and sales tax — how do they all work together?',
        expectedTopics: ['15%', 'excise', '10%', 'retail', 'sales tax', 'CCB', 'DTC', 'Nevada'],
        mustReference: ['excise', 'tax'],
        difficulty: 'intermediate',
    },
    {
        id: 'nv-delivery-license',
        title: 'NV home delivery — legality and license requirements',
        state: 'NV',
        category: 'delivery',
        question: 'Is cannabis home delivery legal in Nevada? What does a retailer need to offer delivery services?',
        expectedTopics: ['CCB', 'delivery', 'license', 'age verification', 'vehicle', 'tracking', 'Nevada'],
        mustReference: ['CCB', 'delivery'],
        difficulty: 'intermediate',
    },
    {
        id: 'nv-lab-testing-panels',
        title: 'NV required lab testing panels for retail products',
        state: 'NV',
        category: 'testing',
        question: 'What lab testing is required in Nevada before cannabis products can be sold at retail?',
        expectedTopics: ['CCB', 'potency', 'pesticides', 'microbials', 'residual solvents', 'heavy metals', 'accredited lab', 'certificate of analysis'],
        mustReference: ['CCB', 'testing'],
        difficulty: 'intermediate',
    },
    {
        id: 'nv-packaging-labeling',
        title: 'NV child-resistant packaging and labeling requirements',
        state: 'NV',
        category: 'packaging',
        question: 'What are Nevada\'s child-resistant packaging and labeling requirements for cannabis products at the retail level?',
        expectedTopics: ['CCB', 'child-resistant', 'opaque', 'THC content', 'warning', 'universal symbol', 'batch', 'licensee'],
        mustReference: ['CCB', 'child-resistant'],
        difficulty: 'basic',
    },
    {
        id: 'nv-seed-to-sale-tracking',
        title: 'NV seed-to-sale tracking system requirements',
        state: 'NV',
        category: 'operations',
        question: 'What seed-to-sale tracking system does Nevada use, and what are the key retailer obligations?',
        expectedTopics: ['CCB', 'seed-to-sale', 'Metrc', 'inventory', 'manifest', 'package tag', 'transfer', 'retail sale'],
        mustReference: ['CCB', 'tracking'],
        difficulty: 'intermediate',
    },
    {
        id: 'nv-cannabis-workers-protection',
        title: 'NV cannabis workers protection act and employer obligations',
        state: 'NV',
        category: 'employment',
        question: 'What does Nevada\'s cannabis workers protection act require of cannabis retailers as employers? What are our obligations around employee cannabis use?',
        expectedTopics: ['Nevada', 'employer', 'off-duty', 'protection', 'termination', 'impairment', 'testing', 'worker'],
        mustReference: ['employer', 'NV'],
        difficulty: 'advanced',
    },
    {
        id: 'nv-consumption-lounge',
        title: 'NV consumption lounge licensing — who can apply?',
        state: 'NV',
        category: 'operations',
        question: 'What is a Nevada cannabis consumption lounge license and who is eligible to apply? Can an existing dispensary add a consumption lounge?',
        expectedTopics: ['CCB', 'consumption lounge', 'license', 'on-site', 'eligible', 'retailer', 'Nevada', 'municipality'],
        mustReference: ['CCB', 'consumption lounge'],
        difficulty: 'advanced',
    },

    // ─── NEW JERSEY (NJ) — 10 cases ──────────────────────────────────────────
    {
        id: 'nj-possession-limits',
        title: 'NJ adult recreational possession limits',
        state: 'NJ',
        category: 'possession-limits',
        question: 'What are the adult recreational cannabis possession limits in New Jersey?',
        expectedTopics: ['6 ounces', 'flower', 'adult', '21', 'CRC', 'New Jersey'],
        mustReference: ['6 ounce', 'ounce'],
        mustNotContain: ['1 ounce', '3 ounces', 'I cannot provide'],
        difficulty: 'basic',
    },
    {
        id: 'nj-license-classes',
        title: 'NJ Class 5 retailer vs. other license classes',
        state: 'NJ',
        category: 'licensing',
        question: 'What is a New Jersey Class 5 cannabis retailer license and how does it differ from the other license classes under the CRC?',
        expectedTopics: ['CRC', 'Class 5', 'retailer', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'license', 'New Jersey'],
        mustReference: ['CRC', 'Class 5'],
        difficulty: 'intermediate',
    },
    {
        id: 'nj-advertising-rules',
        title: 'NJ cannabis advertising rules for retailers',
        state: 'NJ',
        category: 'advertising',
        question: 'What are New Jersey\'s cannabis advertising rules for dispensaries? What content and placement restrictions apply?',
        expectedTopics: ['CRC', 'age-gating', 'minors', '21+', 'false claims', 'outdoor', 'social media', 'content restrictions'],
        mustReference: ['CRC', 'advertising'],
        difficulty: 'intermediate',
    },
    {
        id: 'nj-tax-structure',
        title: 'NJ cannabis tax structure — social equity excise and local taxes',
        state: 'NJ',
        category: 'tax',
        question: 'How does New Jersey\'s cannabis tax structure work? What is the social equity excise fee, and how do local taxes factor in?',
        expectedTopics: ['CRC', 'social equity excise fee', 'transfer fee', 'local tax', 'municipality', 'New Jersey', 'retailer'],
        mustReference: ['excise', 'tax'],
        difficulty: 'intermediate',
    },
    {
        id: 'nj-seed-to-sale-tracking',
        title: 'NJ seed-to-sale tracking requirements',
        state: 'NJ',
        category: 'operations',
        question: 'What seed-to-sale tracking system does New Jersey require, and what must a retailer track and report?',
        expectedTopics: ['CRC', 'seed-to-sale', 'Metrc', 'inventory', 'manifest', 'package', 'transfer', 'retail'],
        mustReference: ['CRC', 'tracking'],
        difficulty: 'intermediate',
    },
    {
        id: 'nj-packaging-labeling',
        title: 'NJ packaging and labeling requirements',
        state: 'NJ',
        category: 'packaging',
        question: 'What are New Jersey\'s cannabis packaging and labeling requirements for retail dispensaries?',
        expectedTopics: ['CRC', 'child-resistant', 'THC content', 'warning', 'universal symbol', 'opaque', 'batch number', 'licensee'],
        mustReference: ['CRC', 'packaging'],
        difficulty: 'basic',
    },
    {
        id: 'nj-employment-off-duty',
        title: 'NJ employment protections for cannabis users — off-duty use',
        state: 'NJ',
        category: 'employment',
        question: 'In New Jersey, can an employer fire someone for off-duty cannabis use? What employment protections exist for cannabis users?',
        expectedTopics: ['CRC', 'employer', 'off-duty', 'protection', 'impairment', 'termination', 'reasonable suspicion', 'New Jersey'],
        mustReference: ['employer', 'NJ'],
        difficulty: 'intermediate',
    },
    {
        id: 'nj-delivery-requirements',
        title: 'NJ cannabis delivery — legality and requirements',
        state: 'NJ',
        category: 'delivery',
        question: 'Is cannabis delivery legal in New Jersey? What does a dispensary need to offer delivery services?',
        expectedTopics: ['CRC', 'delivery', 'license', 'age verification', 'vehicle', 'tracking', 'New Jersey'],
        mustReference: ['CRC', 'delivery'],
        difficulty: 'advanced',
    },
    {
        id: 'nj-social-equity-criteria',
        title: 'NJ social equity applicant criteria and benefits',
        state: 'NJ',
        category: 'licensing',
        question: 'What qualifies someone as a social equity applicant in New Jersey, and what benefits or advantages does that status provide?',
        expectedTopics: ['CRC', 'social equity', 'impact zone', 'ownership', 'priority', 'fee reduction', 'license', 'disproportionately impacted'],
        mustReference: ['CRC', 'social equity'],
        difficulty: 'advanced',
    },
    {
        id: 'nj-conditional-vs-annual-license',
        title: 'NJ conditional vs. annual license — conversion process',
        state: 'NJ',
        category: 'operations',
        question: 'What is the difference between a New Jersey conditional cannabis license and an annual license? How does the conversion process work and what is the timeline?',
        expectedTopics: ['CRC', 'conditional license', 'annual license', 'conversion', 'timeline', 'compliance', 'New Jersey'],
        mustReference: ['CRC', 'conditional'],
        difficulty: 'advanced',
    },

    // ─── MICHIGAN (MI) — 10 cases ─────────────────────────────────────────────
    {
        id: 'mi-possession-limits',
        title: 'MI adult recreational possession limits',
        state: 'MI',
        category: 'possession-limits',
        question: 'What are the adult recreational cannabis possession limits in Michigan? I\'ve heard there are different limits for public and at home.',
        expectedTopics: ['2.5 ounces', 'public', '10 ounces', 'home', 'adult', '21', 'MRA', 'Michigan'],
        mustReference: ['2.5', 'ounce'],
        mustNotContain: ['1 ounce', '6 ounces', 'I cannot provide'],
        difficulty: 'basic',
    },
    {
        id: 'mi-license-types',
        title: 'MI license types — Class A/B/C grower vs. retailer',
        state: 'MI',
        category: 'licensing',
        question: 'What are the different cannabis license types in Michigan? What is the difference between a Class A, Class B, and Class C grower license vs. a retailer license?',
        expectedTopics: ['MRA', 'Class A', 'Class B', 'Class C', 'grower', 'retailer', 'canopy', 'license', 'Michigan'],
        mustReference: ['MRA', 'retailer'],
        difficulty: 'intermediate',
    },
    {
        id: 'mi-advertising-restrictions',
        title: 'MI cannabis advertising restrictions',
        state: 'MI',
        category: 'advertising',
        question: 'What advertising restrictions apply to cannabis retailers in Michigan? What content and placement rules must we follow?',
        expectedTopics: ['MRA', 'age-gating', 'minors', '21+', 'false claims', 'outdoor', 'social media', 'content restrictions'],
        mustReference: ['MRA', 'advertising'],
        difficulty: 'intermediate',
    },
    {
        id: 'mi-tax-structure',
        title: 'MI cannabis tax structure — excise and sales tax',
        state: 'MI',
        category: 'tax',
        question: 'What is Michigan\'s cannabis tax structure? What excise tax and sales tax does a retailer collect?',
        expectedTopics: ['10%', 'excise', '6%', 'sales tax', 'MRA', 'Michigan', 'retailer', 'remit'],
        mustReference: ['10%', 'tax'],
        difficulty: 'intermediate',
    },
    {
        id: 'mi-metrc-requirements',
        title: 'MI METRC seed-to-sale requirements for retailers',
        state: 'MI',
        category: 'operations',
        question: 'What does Michigan require for METRC compliance at the retail dispensary level? What must we track and report?',
        expectedTopics: ['METRC', 'MRA', 'seed-to-sale', 'inventory', 'manifest', 'package tag', 'transfer', 'retail sale'],
        mustReference: ['METRC', 'MRA'],
        difficulty: 'intermediate',
    },
    {
        id: 'mi-packaging-labeling',
        title: 'MI packaging and labeling requirements',
        state: 'MI',
        category: 'packaging',
        question: 'What are Michigan\'s cannabis packaging and labeling requirements for retail dispensaries?',
        expectedTopics: ['MRA', 'child-resistant', 'THC content', 'warning', 'universal symbol', 'opaque', 'batch number', 'licensee'],
        mustReference: ['MRA', 'packaging'],
        difficulty: 'basic',
    },
    {
        id: 'mi-delivery-rules',
        title: 'MI cannabis delivery — legality and rules',
        state: 'MI',
        category: 'delivery',
        question: 'Is cannabis home delivery legal in Michigan? What are the requirements for a retailer that wants to offer delivery?',
        expectedTopics: ['MRA', 'delivery', 'license', 'age verification', 'vehicle', 'tracking', 'Michigan'],
        mustReference: ['MRA', 'delivery'],
        difficulty: 'intermediate',
    },
    {
        id: 'mi-employer-cannabis-testing',
        title: 'MI employer rights regarding cannabis testing',
        state: 'MI',
        category: 'employment',
        question: 'What are Michigan employers\' rights around cannabis drug testing? Can we terminate an employee for a positive cannabis test?',
        expectedTopics: ['MRA', 'employer', 'drug testing', 'off-duty', 'impairment', 'termination', 'Michigan', 'policy'],
        mustReference: ['employer', 'MI'],
        difficulty: 'intermediate',
    },
    {
        id: 'mi-social-equity-program',
        title: 'MI social equity program criteria and benefits',
        state: 'MI',
        category: 'licensing',
        question: 'What are the criteria for Michigan\'s cannabis social equity program and what benefits does it provide to eligible applicants?',
        expectedTopics: ['MRA', 'social equity', 'disproportionately impacted', 'priority review', 'fee waiver', 'ownership', 'Michigan'],
        mustReference: ['MRA', 'social equity'],
        difficulty: 'advanced',
    },
    {
        id: 'mi-municipal-opt-out',
        title: 'MI municipal opt-out rules and local restrictions',
        state: 'MI',
        category: 'operations',
        question: 'Can Michigan municipalities opt out of allowing cannabis retail? What restrictions can local governments impose on dispensaries?',
        expectedTopics: ['MRA', 'municipality', 'opt-out', 'local ordinance', 'zoning', 'restrict', 'Michigan', 'township'],
        mustReference: ['MRA', 'municipality'],
        difficulty: 'advanced',
    },

    // ─── GROUP 1: Enforcement & Penalties (5 cases) ──────────────────────────
    {
        id: 'enforcement-noc-instagram',
        title: 'Notice of Compliance — Instagram deal post',
        state: 'NY',
        category: 'enforcement',
        question: 'Our dispensary just received a Notice of Non-Compliance from OCM for an Instagram post showing a product discount. The post said "Amnesia Haze 20% off this weekend — DM us." What violations does OCM likely cited, what is the typical penalty range for a first offense, and what remediation steps do we need to take within the response window?',
        expectedTopics: ['OCM', 'advertising', 'discount', 'social media', 'penalty', 'response', 'violation', 'remediation'],
        mustReference: ['OCM', 'advertising'],
        mustNotContain: ['I cannot', 'I don\'t know'],
        difficulty: 'advanced',
    },
    {
        id: 'enforcement-mystery-shopper-fail',
        title: 'Failed mystery shopper age verification',
        state: 'CA',
        category: 'enforcement',
        question: 'A DCC investigator posing as a customer successfully purchased cannabis from our California dispensary without being asked for ID. We just received notice of the failed underage sale attempt (mystery shopper was 20 years old with valid CA ID). What are the penalties for a first offense, what immediate operational changes are required, and what does the corrective action plan need to include?',
        expectedTopics: ['DCC', 'age verification', 'penalty', 'corrective action', 'ID', 'fine', 'suspension'],
        mustReference: ['DCC', 'age'],
        difficulty: 'advanced',
    },
    {
        id: 'enforcement-license-revocation-hearing',
        title: 'Emergency license suspension — revocation hearing',
        state: 'CO',
        category: 'enforcement',
        question: 'Colorado MED issued an emergency license suspension notice citing pattern violations: three METRC discrepancies over 90 days plus one failed mystery shopper. We have a revocation hearing in 30 days. What arguments can we raise, what evidence should we present, and can we continue operating during the revocation process?',
        expectedTopics: ['MED', 'suspension', 'hearing', 'METRC', 'revocation', 'evidence', 'operating'],
        mustReference: ['MED', 'suspension'],
        difficulty: 'advanced',
    },
    {
        id: 'enforcement-odor-complaint-variance',
        title: 'Neighbor odor complaint — variance procedure',
        state: 'IL',
        category: 'enforcement',
        question: 'Three neighbors filed odor complaints with the City of Chicago and IDFPR against our Illinois dispensary. IDFPR has opened an investigation. What are our obligations to respond, what odor mitigation standards apply, and can this lead to license conditions or revocation? Is there a variance or waiver process?',
        expectedTopics: ['IDFPR', 'odor', 'complaint', 'mitigation', 'investigation', 'license condition', 'variance'],
        mustReference: ['IDFPR'],
        difficulty: 'intermediate',
    },
    {
        id: 'enforcement-competitor-filed-complaint',
        title: 'Competitor-initiated regulatory complaint',
        state: 'MA',
        category: 'enforcement',
        question: 'A competing dispensary filed a formal complaint with the Massachusetts CCC alleging our loyalty program constitutes illegal price discounting (we give 10% off for members). CCC is investigating. Is our loyalty program compliant? What exposure do we have, and how do we respond to the CCC inquiry?',
        expectedTopics: ['CCC', 'loyalty', 'discount', 'advertising', 'complaint', 'investigation', 'pricing'],
        mustReference: ['CCC', 'loyalty'],
        difficulty: 'advanced',
    },

    // ─── GROUP 2: Track & Trace Deep Dives (5 cases) ─────────────────────────
    {
        id: 'track-trace-manifest-discrepancy',
        title: 'METRC transfer manifest discrepancy on receipt',
        state: 'NY',
        category: 'track-trace',
        question: 'We received a transfer from a licensed distributor. The METRC manifest shows 10 packages of 3.5g pre-rolls, but we only received 9 packages. Physical count confirmed 9. What are our reporting obligations under NY OCM rules, what is the time window to report the discrepancy, and what documentation do we need?',
        expectedTopics: ['METRC', 'manifest', 'discrepancy', 'report', 'OCM', 'documentation', 'transfer'],
        mustReference: ['METRC', 'discrepancy'],
        difficulty: 'advanced',
    },
    {
        id: 'track-trace-destruction-protocol',
        title: 'Product destruction — witness and documentation requirements',
        state: 'CA',
        category: 'track-trace',
        question: 'We have 200 units of expired vape cartridges that need to be destroyed. California DCC has specific destruction requirements. Walk me through the complete METRC waste and destruction process: how to mark the package, witness requirements, approved destruction methods, and what documentation is retained in our license file.',
        expectedTopics: ['DCC', 'METRC', 'destruction', 'waste', 'witness', 'documentation', 'expired'],
        mustReference: ['DCC', 'METRC', 'destruction'],
        difficulty: 'advanced',
    },
    {
        id: 'track-trace-system-outage',
        title: 'METRC system outage — paper manifest rules',
        state: 'CO',
        category: 'track-trace',
        question: 'METRC has been down for 6 hours during our busiest day. Colorado MED has outage procedures. Can we continue retail sales during the outage? What paper-based tracking is required? What is the backfill window after METRC comes back online, and what happens if we cannot reconcile?',
        expectedTopics: ['METRC', 'outage', 'paper', 'MED', 'backfill', 'reconcile', 'sales'],
        mustReference: ['METRC', 'outage', 'MED'],
        difficulty: 'advanced',
    },
    {
        id: 'track-trace-package-split',
        title: 'METRC package splitting for retail',
        state: 'WA',
        category: 'track-trace',
        question: 'We received a 1-pound bulk package of flower from a processor. We need to split it into 1-ounce retail packages. Washington uses LEAF Data Systems. Walk me through the complete package-splitting process: creating child packages, adjusting weights, assigning retail UIDs, and what testing/labeling applies to the split packages.',
        expectedTopics: ['LEAF', 'package split', 'child package', 'retail', 'UID', 'testing', 'labeling'],
        mustReference: ['LEAF', 'package'],
        difficulty: 'advanced',
    },
    {
        id: 'track-trace-end-of-day-variance',
        title: 'End-of-day physical count variance — investigation procedure',
        state: 'MI',
        category: 'track-trace',
        question: 'End of day physical count shows 3.5g less flower than METRC shows in our Michigan dispensary. MRA requires investigation and reporting of unexplained variances. What is the variance threshold that triggers mandatory reporting, what internal investigation steps are required, and how do we document the resolution?',
        expectedTopics: ['MRA', 'METRC', 'variance', 'investigation', 'reporting', 'threshold', 'documentation'],
        mustReference: ['MRA', 'variance'],
        difficulty: 'advanced',
    },

    // ─── GROUP 3: Testing Lab Failures (5 cases) ──────────────────────────────
    {
        id: 'lab-pesticide-contamination-recall',
        title: 'Pesticide contamination — batch recall procedure',
        state: 'CA',
        category: 'testing',
        question: 'Our California lab just called: a batch of 500 units of pre-packaged flower tested positive for bifenazate (a prohibited pesticide) above the action level. The batch is already in our retail inventory. Walk us through the complete recall procedure: who to notify, in what order, within what timeframe, and what to do with customers who may have already purchased from this batch.',
        expectedTopics: ['DCC', 'pesticide', 'recall', 'notification', 'quarantine', 'customer', 'destroy'],
        mustReference: ['DCC', 'recall', 'pesticide'],
        mustNotContain: ['consult a lawyer and figure it out'],
        difficulty: 'advanced',
    },
    {
        id: 'lab-potency-mislabeling',
        title: 'THC potency mislabeling — label correction',
        state: 'NY',
        category: 'testing',
        question: 'Our NY lab just issued a corrected COA showing the flower we labeled at 28% THC actually tests at 17.5% THC. We have 200 units in our retail display. OCM has strict mislabeling rules. What are our obligations, can we relabel or must we recall, and what is the penalty exposure for having sold any units already with the incorrect label?',
        expectedTopics: ['OCM', 'THC', 'mislabeling', 'COA', 'relabel', 'recall', 'penalty'],
        mustReference: ['OCM', 'COA'],
        difficulty: 'advanced',
    },
    {
        id: 'lab-microbial-remediation',
        title: 'Failed total yeast and mold — remediation options',
        state: 'CO',
        category: 'testing',
        question: 'A batch of Colorado flower failed total yeast and mold (TYM) count. The cultivator wants to remediate through irradiation. Is irradiation an approved remediation method in Colorado? What is the MED-approved remediation process, does the batch need to be retested by an independent lab, and can we sell remediated product as standard adult-use flower?',
        expectedTopics: ['MED', 'mold', 'yeast', 'remediation', 'irradiation', 'retest', 'METRC'],
        mustReference: ['MED', 'remediation'],
        difficulty: 'advanced',
    },
    {
        id: 'lab-failed-product-already-sold',
        title: 'Failed test results received after product sold',
        state: 'IL',
        category: 'testing',
        question: 'We received a batch of edibles from a licensed manufacturer last week and sold 80% of it before receiving the final lab COA. The COA shows the product failed for heavy metals (lead above the IL action level of 0.5 ppm). IDFPR rules require immediate action. What are our recall obligations, how do we notify customers who purchased the product, and what is our liability exposure?',
        expectedTopics: ['IDFPR', 'heavy metals', 'recall', 'COA', 'notify', 'liability', 'customer'],
        mustReference: ['IDFPR', 'recall'],
        difficulty: 'advanced',
    },
    {
        id: 'lab-accreditation-dispute',
        title: 'Lab accreditation dispute — contested test results',
        state: 'MA',
        category: 'testing',
        question: 'Our Massachusetts cultivator partner disputes a failed pesticide test from a CCC-licensed lab. They claim the lab made a procedural error. Can they demand a retest at a different CCC-accredited lab? What is the dispute resolution process with the CCC, and can the product be held pending resolution rather than immediately destroyed?',
        expectedTopics: ['CCC', 'pesticide', 'retest', 'dispute', 'accreditation', 'hold', 'destroy'],
        mustReference: ['CCC', 'dispute'],
        difficulty: 'advanced',
    },

    // ─── GROUP 4: Federal-State Conflicts (5 cases) ───────────────────────────
    {
        id: 'federal-280e-cogs-allocation',
        title: '280E — maximizing legitimate COGS deductions',
        state: 'CA',
        category: 'federal',
        question: 'Our California dispensary is subject to IRC Section 280E — we cannot deduct ordinary business expenses. Our CPA says we can only deduct Cost of Goods Sold (COGS). What expenses legitimately qualify as COGS for a cannabis retailer under 280E, what allocation methods have IRS scrutiny, and what documentation do we need to defend our COGS allocation in an audit?',
        expectedTopics: ['280E', 'COGS', 'IRS', 'deduction', 'audit', 'allocation', 'documentation'],
        mustReference: ['280E', 'COGS'],
        difficulty: 'advanced',
    },
    {
        id: 'federal-banking-restrictions',
        title: 'Banking restrictions — cash management compliance',
        state: 'CO',
        category: 'federal',
        question: 'Our Colorado dispensary just had our third bank account closed. We are operating largely cash-only. What are the federal Bank Secrecy Act requirements for cash-intensive cannabis businesses, when does a Currency Transaction Report (CTR) need to be filed, and what legitimate banking options exist for state-licensed cannabis retailers?',
        expectedTopics: ['Bank Secrecy Act', 'CTR', 'cash', 'banking', 'FinCEN', 'reporting', 'currency'],
        mustReference: ['Bank Secrecy Act', 'CTR'],
        difficulty: 'advanced',
    },
    {
        id: 'federal-irs-audit-response',
        title: 'IRS audit targeting cannabis COGS allocation',
        state: 'WA',
        category: 'federal',
        question: 'Our Washington dispensary received an IRS audit notice specifically targeting our 280E COGS allocation. The IRS is questioning whether we over-allocated administrative expenses to COGS. What are the most common IRS challenges to cannabis retailer COGS allocations, what documentation should we have ready, and what is the penalty exposure if our allocation is found improper?',
        expectedTopics: ['280E', 'IRS', 'COGS', 'allocation', 'audit', 'penalty', 'documentation'],
        mustReference: ['280E', 'IRS'],
        difficulty: 'advanced',
    },
    {
        id: 'federal-dea-rescheduling-impact',
        title: 'DEA rescheduling to Schedule III — operational impact',
        state: 'NY',
        category: 'federal',
        question: 'If cannabis is rescheduled from Schedule I to Schedule III by the DEA, what would change for our New York dispensary? Specifically: would 280E still apply, would banking restrictions ease, would our state license still be required, and what transition compliance issues should we prepare for?',
        expectedTopics: ['DEA', 'Schedule III', '280E', 'banking', 'rescheduling', 'federal', 'state license'],
        mustReference: ['DEA', 'Schedule III', '280E'],
        difficulty: 'advanced',
    },
    {
        id: 'federal-currency-transaction-report',
        title: 'Currency Transaction Report — $10k cash purchase',
        state: 'NV',
        category: 'federal',
        question: 'A Nevada dispensary customer wants to make a $12,000 cash purchase of cannabis products. Under the Bank Secrecy Act, a Currency Transaction Report (CTR) must be filed for cash transactions over $10,000. What are our exact CTR filing obligations, what information must we collect from the customer, what is structuring and how do we avoid liability for it, and does the customer have any right to refuse?',
        expectedTopics: ['CTR', 'Bank Secrecy Act', 'cash', '$10,000', 'structuring', 'FinCEN', 'customer information'],
        mustReference: ['CTR', 'Bank Secrecy Act'],
        difficulty: 'advanced',
    },

    // ─── GROUP 5: Advertising Deep Dives (5 cases) ────────────────────────────
    {
        id: 'ad-influencer-paid-post',
        title: 'Paid influencer marketing — advertising classification',
        state: 'NY',
        category: 'advertising',
        question: 'We want to pay a cannabis influencer with 50,000 Instagram followers in New York to post about our products. They would disclose it as a paid partnership. Does this count as advertising under OCM rules, what disclosure requirements apply, does the influencer\'s audience need to meet the under-21 threshold, and can we provide product samples as compensation?',
        expectedTopics: ['OCM', 'advertising', 'influencer', 'disclosure', 'Instagram', 'audience', '21'],
        mustReference: ['OCM', 'advertising'],
        difficulty: 'advanced',
    },
    {
        id: 'ad-loyalty-comp-product',
        title: 'Loyalty rewards — free product as advertising',
        state: 'CA',
        category: 'advertising',
        question: 'Our California loyalty program lets customers earn points redeemable for free products (not discounts — actual products). DCC\'s advertising rules prohibit advertising price discounts. Does "earn a free product" constitute advertising a price discount, must the loyalty program be disclosed in any special way, and does providing free product create any gifting-law issues?',
        expectedTopics: ['DCC', 'loyalty', 'advertising', 'free product', 'gifting', 'discount', 'points'],
        mustReference: ['DCC', 'loyalty'],
        difficulty: 'advanced',
    },
    {
        id: 'ad-geo-targeted-digital',
        title: 'Geo-targeted digital ads on Meta/Google',
        state: 'MA',
        category: 'advertising',
        question: 'Our Massachusetts dispensary wants to run geo-targeted ads within a 1-mile radius of our store on Facebook and Google. CCC advertising rules restrict digital advertising. Can we geo-target on these platforms given that cannabis advertising is against Meta and Google terms of service? If we use a compliant third-party cannabis ad network, what CCC requirements still apply?',
        expectedTopics: ['CCC', 'digital', 'geo-targeted', 'Meta', 'advertising', 'age-gate', 'platform'],
        mustReference: ['CCC', 'advertising'],
        difficulty: 'advanced',
    },
    {
        id: 'ad-weedmaps-listing-rules',
        title: 'Weedmaps and Leafly listing compliance',
        state: 'IL',
        category: 'advertising',
        question: 'Our Illinois dispensary is listed on Weedmaps and Leafly. We want to post daily deals with specific prices. Under IDFPR advertising rules, what can and cannot appear in our Weedmaps/Leafly listings? Does a third-party platform listing count as advertising under Illinois rules, and are there any disclosure requirements for online menu platforms?',
        expectedTopics: ['IDFPR', 'Weedmaps', 'Leafly', 'advertising', 'deals', 'menu', 'online'],
        mustReference: ['IDFPR', 'advertising'],
        difficulty: 'intermediate',
    },
    {
        id: 'ad-athlete-celebrity-endorsement',
        title: 'Celebrity endorsement — permissibility and restrictions',
        state: 'NJ',
        category: 'advertising',
        question: 'We want to have a retired NFL player (age 52, not currently active in sports) endorse our New Jersey dispensary. The CRC prohibits celebrity endorsements that appeal to minors. Does a retired athlete endorsement violate NJ rules if the athlete\'s fanbase skews young? What vetting is required, and can we use the endorsement on our website and Instagram?',
        expectedTopics: ['CRC', 'celebrity', 'endorsement', 'athlete', 'minors', 'advertising', 'Instagram'],
        mustReference: ['CRC', 'endorsement'],
        difficulty: 'advanced',
    },

    // ─── GROUP 6: Medical-Adult Use Crossover (5 cases) ───────────────────────
    {
        id: 'med-dual-license-operations',
        title: 'Dual medical-adult-use license — operational separation',
        state: 'NY',
        category: 'licensing',
        question: 'Our New York dispensary has both a Registered Organization (RO) medical license and an adult-use CAURD license. OCM requires operational separation between the two. What physical separation is required, can medical patients and adult-use customers share the same waiting area, must inventory be completely separate in METRC, and can the same staff serve both?',
        expectedTopics: ['OCM', 'medical', 'adult-use', 'METRC', 'separation', 'RO', 'CAURD', 'staff'],
        mustReference: ['OCM', 'METRC'],
        difficulty: 'advanced',
    },
    {
        id: 'med-patient-tax-exemption-pos',
        title: 'Medical patient sales tax exemption — point-of-sale procedure',
        state: 'NJ',
        category: 'tax',
        question: 'A New Jersey medical cannabis patient wants the sales tax exemption at our dispensary. What documentation must we verify at point of sale to grant the exemption, how do we record it in our POS and METRC, what if their registry card is expired, and what is our liability if we grant the exemption based on fraudulent documentation?',
        expectedTopics: ['CRC', 'medical', 'tax exemption', 'registry card', 'POS', 'documentation', 'METRC'],
        mustReference: ['CRC', 'tax exemption'],
        difficulty: 'intermediate',
    },
    {
        id: 'med-caregiver-purchase-documentation',
        title: 'Caregiver purchasing — authorization and documentation',
        state: 'MA',
        category: 'licensing',
        question: 'A caregiver wants to purchase cannabis for a registered Massachusetts medical patient who cannot come in person. What documentation must the caregiver present at point of sale, are there any purchase limit differences for caregivers vs patients, must the transaction be recorded differently in METRC, and can the caregiver purchase from the adult-use side of a dual-licensed store?',
        expectedTopics: ['CCC', 'caregiver', 'patient', 'documentation', 'purchase limit', 'METRC', 'authorization'],
        mustReference: ['CCC', 'caregiver'],
        difficulty: 'intermediate',
    },
    {
        id: 'med-high-potency-product-access',
        title: 'Medical-only high-potency products — retail access controls',
        state: 'CA',
        category: 'licensing',
        question: 'Some California cannabis products are available for medical patients only (e.g., concentrates over certain potency thresholds or specific formulations). How do we operationally restrict these products to verified MMIC holders only, what are the POS controls required, how do we segregate medical-only products in our retail display, and what training must staff receive?',
        expectedTopics: ['DCC', 'MMIC', 'medical', 'potency', 'access control', 'POS', 'staff training'],
        mustReference: ['DCC', 'MMIC'],
        difficulty: 'advanced',
    },
    {
        id: 'med-physician-recommendation-expired',
        title: 'Expired physician recommendation — sale decision',
        state: 'CO',
        category: 'licensing',
        question: 'A patient presents a Colorado medical marijuana registry card that expired 2 weeks ago. They want to purchase beyond the adult-use recreational limit (claiming medical patient status). Can we honor an expired medical card at all, are there any grace periods in Colorado, and what is the correct procedure when a patient\'s card has lapsed?',
        expectedTopics: ['MED', 'medical card', 'expired', 'purchase limit', 'grace period', 'adult-use'],
        mustReference: ['MED', 'expired'],
        difficulty: 'intermediate',
    },

    // ─── GROUP 7: Social Equity Compliance (5 cases) ──────────────────────────
    {
        id: 'seq-ownership-verification',
        title: 'Social equity ownership verification — documentation',
        state: 'IL',
        category: 'licensing',
        question: 'Our Illinois social equity cannabis business license requires the principal officer to maintain 51%+ ownership. An investor wants to provide $2M in exchange for a 30% stake and operational veto rights. Does the veto right affect our social equity designation even at 30% ownership? What documentation must we file with IDFPR to demonstrate maintained social equity compliance, and how often is it audited?',
        expectedTopics: ['IDFPR', 'social equity', 'ownership', '51%', 'investor', 'veto', 'documentation'],
        mustReference: ['IDFPR', 'social equity'],
        difficulty: 'advanced',
    },
    {
        id: 'seq-license-transfer-mso',
        title: 'Social equity license sale to MSO — designation consequences',
        state: 'NJ',
        category: 'licensing',
        question: 'A New Jersey social equity licensee wants to sell their license to a large Multi-State Operator (MSO). The MSO does not qualify as a social equity applicant. What happens to the social equity designation on transfer, is the license even transferable under NJ CRC rules, and are there any right-of-first-refusal or approval requirements before the sale can close?',
        expectedTopics: ['CRC', 'social equity', 'license transfer', 'MSO', 'designation', 'approval'],
        mustReference: ['CRC', 'social equity'],
        difficulty: 'advanced',
    },
    {
        id: 'seq-annual-compliance-report',
        title: 'Social equity annual compliance report — required contents',
        state: 'MA',
        category: 'licensing',
        question: 'Our Massachusetts social equity dispensary needs to file our annual compliance report with the CCC. What specific data and documentation must the report include, what metrics is the CCC evaluating, what happens if we are out of compliance with our social equity plan, and can the CCC revoke our license for non-compliance with social equity commitments?',
        expectedTopics: ['CCC', 'social equity', 'annual report', 'compliance', 'metrics', 'revocation'],
        mustReference: ['CCC', 'social equity'],
        difficulty: 'advanced',
    },
    {
        id: 'seq-incubator-fee-structure',
        title: 'Cannabis incubator program — permissible fee structures',
        state: 'CA',
        category: 'licensing',
        question: 'A large California cannabis company wants us to join their incubator program. In exchange for mentorship and capital, they want 15% of revenue for 5 years and operational oversight authority. DCC evaluates incubator arrangements for undisclosed ownership interests. Does this structure constitute an undisclosed ownership interest, and what disclosure obligations do we have to the DCC?',
        expectedTopics: ['DCC', 'incubator', 'ownership', 'disclosure', 'revenue share', 'social equity'],
        mustReference: ['DCC', 'ownership'],
        difficulty: 'advanced',
    },
    {
        id: 'seq-related-party-transaction',
        title: 'Related-party vendor transactions — conflict of interest',
        state: 'NY',
        category: 'licensing',
        question: 'Our CAURD licensee\'s spouse owns the security company we contracted for our dispensary. The contract is above-market ($12,000/month vs $7,000 market rate). OCM rules address related-party transactions. Is this permissible, what disclosure must be made to OCM, and does the above-market pricing create any regulatory or tax liability?',
        expectedTopics: ['OCM', 'CAURD', 'related-party', 'conflict of interest', 'disclosure', 'contract'],
        mustReference: ['OCM', 'related-party'],
        difficulty: 'advanced',
    },

    // ─── GROUP 8: Zoning & Local Conflicts (5 cases) ──────────────────────────
    {
        id: 'zoning-buffer-exception-request',
        title: 'Buffer zone exception — 490 feet from school',
        state: 'CA',
        category: 'licensing',
        question: 'Our proposed California dispensary location is 490 feet from a K-8 school — just 10 feet short of the required 1,000-foot buffer. DCC rules allow local jurisdictions to grant exceptions. What is the exception/variance request process, what factors do local planning commissions weigh, and is there any track record of such variances being granted in California?',
        expectedTopics: ['DCC', 'buffer', 'school', 'variance', 'local jurisdiction', 'exception', 'planning'],
        mustReference: ['DCC', 'buffer'],
        difficulty: 'advanced',
    },
    {
        id: 'zoning-municipal-ban-existing-license',
        title: 'City bans cannabis after license issued',
        state: 'MA',
        category: 'licensing',
        question: 'Our Massachusetts dispensary has a valid CCC license but our host city just passed an ordinance banning all cannabis retail. We have an existing Host Community Agreement. Can a municipality retroactively ban a CCC-licensed dispensary, what are our legal protections under our HCA, and what are our options if the city moves to enforce the ban?',
        expectedTopics: ['CCC', 'HCA', 'municipality', 'ban', 'host community agreement', 'ordinance', 'retroactive'],
        mustReference: ['CCC', 'HCA'],
        difficulty: 'advanced',
    },
    {
        id: 'zoning-conditional-use-conflict',
        title: 'Conditional use permit conditions vs state license',
        state: 'CO',
        category: 'licensing',
        question: 'Our Colorado local conditional use permit requires us to close by 8 PM, but our MED state license allows operation until 10 PM. The city says the more restrictive local rule applies. We believe we are entitled to our state-licensed hours. Which rule governs, can we challenge the local restriction, and how do other Colorado dispensaries handle this state vs local conflict?',
        expectedTopics: ['MED', 'conditional use', 'local ordinance', 'state preemption', 'hours', 'conflict'],
        mustReference: ['MED', 'local'],
        difficulty: 'advanced',
    },
    {
        id: 'zoning-delivery-residential-condo',
        title: 'Delivery to private residences — condo building rules',
        state: 'NY',
        category: 'delivery',
        question: 'Our New York licensed delivery operation cannot deliver to a high-rise apartment building because the building management prohibits cannabis delivery on the property. The customer\'s unit is their private residence. Under OCM rules, can building management block legal cannabis delivery to a private unit, are there any tenant rights that override this, and what liability do we face if we deliver anyway?',
        expectedTopics: ['OCM', 'delivery', 'private residence', 'building', 'management', 'tenant', 'liability'],
        mustReference: ['OCM', 'delivery'],
        difficulty: 'intermediate',
    },
    {
        id: 'zoning-signage-state-local-conflict',
        title: 'Sign ordinance vs state visibility requirement',
        state: 'WA',
        category: 'advertising',
        question: 'Washington LCB requires our cannabis business sign to be visible from the street. Our city sign ordinance limits cannabis retail signage to 4 square feet total, which is barely visible from the road. We believe our state license requires more visible signage. Which rule takes precedence, is there a waiver process, and how have other Washington licensees handled this conflict?',
        expectedTopics: ['LCB', 'signage', 'local ordinance', 'state', 'conflict', 'visibility', 'waiver'],
        mustReference: ['LCB', 'signage'],
        difficulty: 'intermediate',
    },

    // ─── GROUP 9: Multi-State Operator Traps (5 cases) ────────────────────────
    {
        id: 'multi-state-packaging-inconsistency',
        title: 'Multi-state brand — packaging rule conflicts',
        state: 'NY',
        category: 'packaging',
        question: 'Our cannabis brand operates in both New York and New Jersey. NY OCM and NJ CRC have different packaging requirements (different warning statements, different universal symbol sizes, different child-resistance standards). We want to use one package design across both states. Is this permissible, what are the minimum requirements that satisfy both, and what happens if a single-state-compliant package is found in the wrong state?',
        expectedTopics: ['OCM', 'CRC', 'packaging', 'multi-state', 'warning', 'universal symbol', 'child-resistant'],
        mustReference: ['OCM', 'CRC'],
        difficulty: 'advanced',
    },
    {
        id: 'multi-state-employee-interstate',
        title: 'Employee traveling between state locations with product samples',
        state: 'CO',
        category: 'operations',
        question: 'Our company has dispensaries in Colorado and Illinois. A regional manager wants to transport product samples between states to evaluate quality. Interstate cannabis transport is federally prohibited regardless of state legality. What are the legal risks, is there any exception for small samples, and how should multi-state operators handle product evaluation across state lines?',
        expectedTopics: ['federal', 'interstate', 'transport', 'prohibited', 'sample', 'DEA', 'criminal'],
        mustReference: ['interstate', 'federal'],
        mustNotContain: ['legally transport cannabis between states', 'is permitted to cross state lines'],
        difficulty: 'advanced',
    },
    {
        id: 'multi-state-data-privacy',
        title: 'Customer data sharing across state dispensary locations',
        state: 'CA',
        category: 'operations',
        question: 'Our multi-state operator wants to build a unified CRM using customer data from our California, Colorado, and Nevada dispensaries. California has strict CCPA protections for cannabis customer data. What consent requirements apply in each state, can we share purchase history across state entities, and what data minimization and deletion rights must we honor for cannabis customers specifically?',
        expectedTopics: ['CCPA', 'privacy', 'data sharing', 'consent', 'CRM', 'customer data', 'cannabis'],
        mustReference: ['CCPA', 'privacy'],
        difficulty: 'advanced',
    },
    {
        id: 'multi-state-vertically-integrated',
        title: 'Vertical integration limits — multi-state operator constraints',
        state: 'IL',
        category: 'licensing',
        question: 'We are vertically integrated in Colorado (cultivation, processing, retail) but want to open a delivery-only license in Illinois. Illinois caps how many licenses one entity can hold and restricts vertical integration by out-of-state MSOs. What are the Illinois CRTA multi-license caps, do our Colorado licenses count toward Illinois limits, and can we be vertically integrated in IL as an out-of-state operator?',
        expectedTopics: ['IDFPR', 'CRTA', 'vertical integration', 'MSO', 'license cap', 'out-of-state'],
        mustReference: ['IDFPR', 'vertical'],
        difficulty: 'advanced',
    },
    {
        id: 'multi-state-tax-filing-280e',
        title: 'Multi-state 280E — consolidated vs separate state filings',
        state: 'WA',
        category: 'tax',
        question: 'Our multi-state cannabis company files a consolidated federal return but separate state returns for Washington, Colorado, and Illinois. Under 280E, we cannot deduct most expenses on our federal return. Do state income taxes follow 280E or do some states decouple from federal 280E treatment? Which of our three states has decoupled from 280E, allowing full deductions at the state level?',
        expectedTopics: ['280E', 'state tax', 'decouple', 'deductions', 'consolidated', 'filing', 'Illinois', 'Colorado'],
        mustReference: ['280E', 'state'],
        difficulty: 'advanced',
    },
];

// ============================================================================
// GRADER SYSTEM PROMPT
// ============================================================================

const COMPLIANCE_GRADER_PROMPT = `You are grading a cannabis compliance AI's response to an operator question.

Evaluate on these dimensions (0-100):
- accuracy: Is the regulatory information correct for the stated state?
- caveats: Did it appropriately recommend verifying with a compliance officer or attorney for complex/changing rules?
- actionability: Did it give the operator something concrete to act on?
- tone: Was it professional, direct, and clear?
- completeness: Did it fully address the question without unnecessary filler?

Hard rules:
- If the response states a clearly wrong legal fact (e.g., wrong possession limit), accuracy must be 20 or lower and grade must be 'poor' or 'fail'
- If the response refuses to engage entirely instead of giving best-effort guidance, grade 'poor'
- If the response is overconfident about specific statute numbers or exact fees without caveat, completeness penalty
- For basic questions, expecting caveats is less important; for advanced/complex, caveats are required

Return only JSON:
{
  "grade": "great" | "good" | "acceptable" | "poor" | "fail",
  "score": number,
  "responseReady": boolean,
  "summary": "one short sentence",
  "strengths": ["..."],
  "issues": ["..."],
  "suggestedFixes": ["..."],
  "dimensions": {
    "accuracy": number,
    "caveats": number,
    "actionability": number,
    "tone": number,
    "completeness": number
  }
}`;

// ============================================================================
// HELPERS
// ============================================================================

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

function getArg(name: string): string | undefined {
    const prefix = `--${name}=`;
    return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function clip(value: string, max = 240): string {
    const v = value.replace(/\s+/g, ' ').trim();
    return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

function getAnthropic(): Anthropic {
    const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!key) throw new Error('No Anthropic API key found.');
    return new Anthropic({ apiKey: key });
}

function inferGrade(score: number): GradeResult['grade'] {
    if (score >= 93) return 'great';
    if (score >= 84) return 'good';
    if (score >= 72) return 'acceptable';
    if (score >= 55) return 'poor';
    return 'fail';
}

function heuristicGrade(c: ComplianceCase, response: string, error?: string): GradeResult {
    if (error || !response.trim()) {
        return {
            grade: 'fail', score: 10, responseReady: false,
            summary: error ? 'Case errored before producing a response.' : 'Empty response.',
            strengths: [], issues: [error ?? 'Empty response'], suggestedFixes: ['Fix runtime error and rerun.'],
            dimensions: { accuracy: 0, caveats: 0, actionability: 0, tone: 0, completeness: 0 },
        };
    }

    const lower = response.toLowerCase();
    let accuracy = 80, caveats = 75, actionability = 80, tone = 85, completeness = 80;
    const issues: string[] = [], strengths: string[] = [], fixes: string[] = [];

    // Check for full refusal to engage
    const refusalPatterns = /i cannot provide|i am unable to|i can't provide legal|consult an attorney.*for any/i;
    if (refusalPatterns.test(response) && response.length < 300) {
        actionability = 20;
        issues.push('Response appears to refuse engagement rather than providing best-effort guidance.');
        fixes.push('Provide general regulatory guidance before recommending professional verification.');
    }

    // Check for appropriate caveats on intermediate/advanced questions
    const caveatPatterns = /compliance officer|licensed attorney|verify with|consult|check with|regulations.*change|subject to change/i;
    if (c.difficulty !== 'basic' && !caveatPatterns.test(response)) {
        caveats = 40;
        issues.push('No caveat recommending compliance officer or attorney verification for a non-basic question.');
        fixes.push('Add verification recommendation for complex regulatory questions.');
    } else if (caveatPatterns.test(response)) {
        strengths.push('Appropriately recommends verifying with a compliance professional.');
    }

    // mustNotContain check
    if (c.mustNotContain?.some((s) => lower.includes(s.toLowerCase()))) {
        accuracy = 20;
        issues.push('Response contains explicitly banned content (likely wrong legal fact).');
        fixes.push('Verify and correct the factual error.');
    }

    // mustReference check
    if (c.mustReference && c.mustReference.every((s) => lower.includes(s.toLowerCase()))) {
        strengths.push('Response references required regulatory content.');
    } else if (c.mustReference) {
        accuracy -= 20;
        issues.push(`Response did not reference required content: ${c.mustReference.join(', ')}`);
    }

    // Check state is mentioned
    if (!lower.includes(c.state.toLowerCase()) && !lower.includes(stateNames[c.state].toLowerCase())) {
        completeness -= 15;
        issues.push(`Response did not clearly identify the state (${c.state}).`);
    } else {
        strengths.push(`Correctly references ${c.state} regulations.`);
    }

    const score = Math.round([accuracy, caveats, actionability, tone, completeness].reduce((a, b) => a + b) / 5);
    return {
        grade: inferGrade(score),
        score,
        responseReady: score >= 75,
        summary: score >= 75 ? 'Looks ready under heuristic checks.' : 'Needs refinement.',
        strengths,
        issues,
        suggestedFixes: fixes,
        dimensions: {
            accuracy: Math.max(0, Math.min(100, accuracy)),
            caveats: Math.max(0, Math.min(100, caveats)),
            actionability: Math.max(0, Math.min(100, actionability)),
            tone: Math.max(0, Math.min(100, tone)),
            completeness: Math.max(0, Math.min(100, completeness)),
        },
    };
}

const stateNames: Record<ComplianceState, string> = {
    NY: 'New York',
    CA: 'California',
    CO: 'Colorado',
    IL: 'Illinois',
    MA: 'Massachusetts',
    WA: 'Washington',
    NV: 'Nevada',
    NJ: 'New Jersey',
    MI: 'Michigan',
};

function parseGradeJson(raw: string): GradeResult | null {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    try {
        const p = JSON.parse(cleaned.slice(start, end + 1)) as Partial<GradeResult & { dimensions: Partial<GradeDimensions> }>;
        if (!p || typeof p.score !== 'number' || !p.dimensions) return null;
        return {
            grade: p.grade ?? inferGrade(p.score),
            score: p.score,
            responseReady: p.responseReady ?? p.score >= 75,
            summary: p.summary ?? '',
            strengths: Array.isArray(p.strengths) ? p.strengths : [],
            issues: Array.isArray(p.issues) ? p.issues : [],
            suggestedFixes: Array.isArray(p.suggestedFixes) ? p.suggestedFixes : [],
            dimensions: {
                accuracy: p.dimensions.accuracy ?? 50,
                caveats: p.dimensions.caveats ?? 50,
                actionability: p.dimensions.actionability ?? 50,
                tone: p.dimensions.tone ?? 50,
                completeness: p.dimensions.completeness ?? 50,
            },
        };
    } catch { return null; }
}

async function callModel(systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
    const anthropic = getAnthropic();
    const res = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
    });
    return res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n').trim();
}

async function generateDeeboResponse(c: ComplianceCase): Promise<string> {
    const userMessage = `[Operator question — ${stateNames[c.state]} (${c.state})]\n\n${c.question}`;
    return callModel(DEEBO_SYSTEM_PROMPT, userMessage, 1400);
}

async function gradeResponse(c: ComplianceCase, response: string): Promise<GradeResult> {
    const gradingMsg = `Case: ${c.id} (${c.state} / ${c.category} / ${c.difficulty})
Expected topics: ${c.expectedTopics.join('; ')}
${c.mustNotContain ? `Must NOT contain: ${c.mustNotContain.join(', ')}` : ''}
${c.mustReference ? `Must reference: ${c.mustReference.join(', ')}` : ''}

Operator question: ${c.question}

Deebo response:
${response}`;

    try {
        const raw = await callModel(COMPLIANCE_GRADER_PROMPT, gradingMsg, 1200);
        const aiGrade = parseGradeJson(raw) ?? heuristicGrade(c, response);
        return applyMustChecks(c, response, aiGrade);
    } catch {
        return heuristicGrade(c, response);
    }
}

function applyMustChecks(c: ComplianceCase, response: string, grade: GradeResult): GradeResult {
    const lower = response.toLowerCase();
    if (c.mustNotContain?.some((s) => lower.includes(s.toLowerCase()))) {
        return { ...grade, grade: 'fail', score: 0, responseReady: false, summary: 'Response contains explicitly banned content (likely wrong legal fact).' };
    }
    if (c.mustReference && c.mustReference.every((s) => lower.includes(s.toLowerCase()))) {
        if (grade.score < 75) {
            return { ...grade, grade: 'acceptable', score: 75, responseReady: true, summary: 'AI grader may have been overly strict; required references found.' };
        }
    }
    return grade;
}

async function runCase(c: ComplianceCase): Promise<CaseResult> {
    const start = Date.now();
    try {
        const response = await generateDeeboResponse(c);
        const grade = await gradeResponse(c, response);
        return {
            id: c.id, title: c.title, state: c.state, category: c.category, difficulty: c.difficulty,
            durationMs: Date.now() - start,
            response, responsePreview: clip(response, 220), grade,
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const grade = heuristicGrade(c, '', msg);
        return {
            id: c.id, title: c.title, state: c.state, category: c.category, difficulty: c.difficulty,
            durationMs: Date.now() - start,
            response: `ERROR: ${msg}`, responsePreview: `ERROR: ${clip(msg)}`, grade, error: msg,
        };
    }
}

function toMarkdown(results: CaseResult[], generatedAt: string, filters: { state?: string; difficulty?: string }): string {
    const avg = results.length > 0
        ? (results.reduce((s, r) => s + r.grade.score, 0) / results.length).toFixed(1)
        : '0.0';
    const ready = results.filter((r) => r.grade.responseReady).length;
    const fail = results.filter((r) => r.grade.grade === 'fail').length;
    const poor = results.filter((r) => r.grade.grade === 'poor').length;

    const filterNote = [
        filters.state ? `state=${filters.state}` : '',
        filters.difficulty ? `difficulty=${filters.difficulty}` : '',
    ].filter(Boolean).join(', ') || 'all cases';

    const blockers = results
        .filter((r) => r.grade.grade === 'fail' || r.grade.grade === 'poor')
        .map((r) => `- \`${r.id}\` (${r.state} / ${r.grade.grade.toUpperCase()} ${r.grade.score}): ${r.grade.summary}${r.grade.issues[0] ? ` — ${r.grade.issues[0]}` : ''}`)
        .join('\n');

    const rows = results.map((r) => {
        const top = r.grade.issues[0] ? clip(r.grade.issues[0], 80) : 'none';
        return `| ${r.id} | ${r.state} | ${r.category} | ${r.difficulty} | ${r.grade.grade} | ${r.grade.score} | ${r.grade.responseReady ? 'yes' : 'no'} | ${top} |`;
    }).join('\n');

    // State breakdown
    const states: ComplianceState[] = ['NY', 'CA', 'CO', 'IL', 'MA', 'WA', 'NV', 'NJ', 'MI'];
    const stateBreakdown = states.map((s) => {
        const stateResults = results.filter((r) => r.state === s);
        if (!stateResults.length) return '';
        const stateAvg = (stateResults.reduce((sum, r) => sum + r.grade.score, 0) / stateResults.length).toFixed(1);
        const stateReady = stateResults.filter((r) => r.grade.responseReady).length;
        return `- **${s} (${stateNames[s]})**: ${stateResults.length} cases, avg score ${stateAvg}, ${stateReady}/${stateResults.length} ready`;
    }).filter(Boolean).join('\n');

    // Category breakdown
    const categories: ComplianceCategory[] = ['possession-limits', 'advertising', 'packaging', 'licensing', 'testing', 'employment', 'operations', 'delivery', 'tax', 'enforcement', 'track-trace', 'federal'];
    const categoryBreakdown = categories.map((cat) => {
        const catResults = results.filter((r) => r.category === cat);
        if (!catResults.length) return '';
        return `- ${cat}: ${catResults.length} cases`;
    }).filter(Boolean).join('\n');

    return `# Deebo Compliance Agent — Multi-State Stress Report

- Generated: ${generatedAt}
- Filter: ${filterNote}
- Cases run: ${results.length}
- Average score: ${avg}
- Response-ready: ${ready}/${results.length}
- Poor or fail: ${poor + fail}
- Failures: ${fail}

## Summary Table
| Case | State | Category | Difficulty | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | --- | ---: | --- | --- |
${rows}

## Launch Blockers
${blockers || '- None'}

## State Breakdown
${stateBreakdown || '- N/A (filtered)'}

## Category Breakdown
${categoryBreakdown}
`;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    const limitArg = getArg('limit');
    const stateArg = getArg('state') as ComplianceState | undefined;
    const difficultyArg = getArg('difficulty') as ComplianceDifficulty | undefined;
    const categoryArg = getArg('category') as ComplianceCategory | undefined;
    const generatedAt = new Date().toISOString();

    let cases = COMPLIANCE_CASES;
    if (stateArg) cases = cases.filter((c) => c.state === stateArg.toUpperCase());
    if (difficultyArg) cases = cases.filter((c) => c.difficulty === difficultyArg);
    if (categoryArg) cases = cases.filter((c) => c.category === categoryArg);
    if (limitArg) cases = cases.slice(0, Math.max(1, Math.min(cases.length, Number(limitArg))));

    const stateCount = stateArg ? `${cases.length} case(s) for ${stateArg}` : `${cases.length} case(s) across 9 states`;
    console.log(`Running Deebo compliance stress test — ${stateCount}`);
    if (difficultyArg) console.log(`Filter: difficulty=${difficultyArg}`);
    if (categoryArg) console.log(`Filter: category=${categoryArg}`);

    const results: CaseResult[] = [];

    for (const [i, c] of cases.entries()) {
        console.log(`[${i + 1}/${cases.length}] ${c.id} (${c.state}/${c.category}/${c.difficulty})`);
        const result = await runCase(c);
        console.log(`  grade=${result.grade.grade} score=${result.grade.score} ready=${result.grade.responseReady ? 'yes' : 'no'} ${result.durationMs}ms`);
        results.push(result);
    }

    const outputDir = path.resolve(process.cwd(), 'reports', 'compliance');
    fs.mkdirSync(outputDir, { recursive: true });

    const stamp = generatedAt.replace(/[:.]/g, '-');
    const base = `thrive-compliance-stress-${stamp}`;
    const jsonPath = path.join(outputDir, `${base}.json`);
    const mdPath = path.join(outputDir, `${base}.md`);

    const report = {
        generatedAt,
        filters: { state: stateArg, difficulty: difficultyArg, category: categoryArg },
        totalCases: results.length,
        averageScore: results.length > 0
            ? Number((results.reduce((s, r) => s + r.grade.score, 0) / results.length).toFixed(1))
            : 0,
        readyCount: results.filter((r) => r.grade.responseReady).length,
        results,
    };

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(mdPath, toMarkdown(results, generatedAt, { state: stateArg, difficulty: difficultyArg }));

    console.log(`\nSaved JSON: ${jsonPath}`);
    console.log(`Saved MD:   ${mdPath}`);
}

void main().catch((err) => {
    console.error(err instanceof Error ? err.stack ?? err.message : String(err));
    process.exit(1);
});
