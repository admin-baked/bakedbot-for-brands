/**
 * Deebo Compliance Agent — Multi-State Stress Test
 *
 * Tests the BakedBot Deebo compliance enforcer across 5 US cannabis markets:
 * NY, CA, CO, IL, MA. Phase 3 of the stress test expansion toward national coverage.
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

type ComplianceState = 'NY' | 'CA' | 'CO' | 'IL' | 'MA';
type ComplianceCategory =
    | 'possession-limits'
    | 'advertising'
    | 'packaging'
    | 'licensing'
    | 'testing'
    | 'employment'
    | 'operations'
    | 'delivery'
    | 'tax';
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
// 50 COMPLIANCE CASES — 10 per state
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
    const states: ComplianceState[] = ['NY', 'CA', 'CO', 'IL', 'MA'];
    const stateBreakdown = states.map((s) => {
        const stateResults = results.filter((r) => r.state === s);
        if (!stateResults.length) return '';
        const stateAvg = (stateResults.reduce((sum, r) => sum + r.grade.score, 0) / stateResults.length).toFixed(1);
        const stateReady = stateResults.filter((r) => r.grade.responseReady).length;
        return `- **${s} (${stateNames[s]})**: ${stateResults.length} cases, avg score ${stateAvg}, ${stateReady}/${stateResults.length} ready`;
    }).filter(Boolean).join('\n');

    // Category breakdown
    const categories: ComplianceCategory[] = ['possession-limits', 'advertising', 'packaging', 'licensing', 'testing', 'employment', 'operations', 'delivery', 'tax'];
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

    const stateCount = stateArg ? `${cases.length} case(s) for ${stateArg}` : `${cases.length} case(s) across 5 states`;
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
