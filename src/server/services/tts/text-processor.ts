/**
 * TTS Text Processor
 *
 * Transforms text for natural-sounding speech synthesis.
 * Handles cannabis-specific terminology, prices, percentages, etc.
 */

import { ProcessedText, BrandVoiceConfig } from './types';

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

/**
 * Process text for TTS output.
 * Transforms markdown, expands abbreviations, handles numbers, etc.
 */
export async function processTextForTTS(
  text: string,
  brandConfig?: BrandVoiceConfig
): Promise<ProcessedText> {
  const transformations: string[] = [];
  let processed = text;

  // 1. Remove markdown formatting
  const beforeMarkdown = processed;
  processed = removeMarkdown(processed);
  if (processed !== beforeMarkdown) {
    transformations.push('removed_markdown');
  }

  // 2. Expand abbreviations
  const beforeAbbrev = processed;
  processed = expandAbbreviations(processed);
  if (processed !== beforeAbbrev) {
    transformations.push('expanded_abbreviations');
  }

  // 3. Convert prices to spoken form
  const beforePrices = processed;
  processed = convertPrices(processed);
  if (processed !== beforePrices) {
    transformations.push('converted_prices');
  }

  // 4. Convert percentages to spoken form
  const beforePercent = processed;
  processed = convertPercentages(processed);
  if (processed !== beforePercent) {
    transformations.push('converted_percentages');
  }

  // 5. Handle cannabis-specific terms
  const beforeCannabis = processed;
  processed = handleCannabisTerms(processed);
  if (processed !== beforeCannabis) {
    transformations.push('cannabis_terms');
  }

  // 6. Apply brand vocabulary
  if (brandConfig?.vocabulary?.length) {
    const beforeVocab = processed;
    processed = applyBrandVocabulary(processed, brandConfig.vocabulary);
    if (processed !== beforeVocab) {
      transformations.push('brand_vocabulary');
    }
  }

  // 7. Add natural pauses
  const beforePauses = processed;
  processed = addNaturalPauses(processed);
  if (processed !== beforePauses) {
    transformations.push('added_pauses');
  }

  // 8. Clean up whitespace
  processed = processed.replace(/\s+/g, ' ').trim();

  // Estimate duration (150 words per minute average)
  const words = processed.split(/\s+/).filter(Boolean).length;
  const estimatedDuration = (words / 150) * 60;

  return {
    original: text,
    processed,
    transformations,
    estimatedDuration,
  };
}

// ============================================================================
// TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Remove markdown formatting for clean speech.
 */
function removeMarkdown(text: string): string {
  let result = text;

  // Remove headers
  result = result.replace(/^#{1,6}\s+/gm, '');

  // Remove bold/italic
  result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
  result = result.replace(/\*([^*]+)\*/g, '$1');
  result = result.replace(/__([^_]+)__/g, '$1');
  result = result.replace(/_([^_]+)_/g, '$1');

  // Remove strikethrough
  result = result.replace(/~~([^~]+)~~/g, '$1');

  // Remove inline code
  result = result.replace(/`([^`]+)`/g, '$1');

  // Remove links but keep text
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove images
  result = result.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1 image');

  // Remove code blocks
  result = result.replace(/```[\s\S]*?```/g, '');

  // Remove horizontal rules
  result = result.replace(/^[-*_]{3,}$/gm, '');

  // Remove bullet points
  result = result.replace(/^[\s]*[-*+]\s+/gm, '');

  // Remove numbered lists (keep the text)
  result = result.replace(/^[\s]*\d+\.\s+/gm, '');

  return result;
}

/**
 * Expand common abbreviations.
 */
function expandAbbreviations(text: string): string {
  const abbreviations: Record<string, string> = {
    'vs.': 'versus',
    'vs': 'versus',
    'e.g.': 'for example',
    'i.e.': 'that is',
    'etc.': 'and so on',
    'approx.': 'approximately',
    'min.': 'minutes',
    'max.': 'maximum',
    'avg.': 'average',
    'qty.': 'quantity',
    'qty': 'quantity',
    'mg': 'milligrams',
    'g': 'grams',
    'oz': 'ounces',
    'ml': 'milliliters',
  };

  let result = text;
  for (const [abbr, full] of Object.entries(abbreviations)) {
    const regex = new RegExp(`\\b${abbr.replace('.', '\\.')}\\b`, 'gi');
    result = result.replace(regex, full);
  }

  return result;
}

/**
 * Convert prices to spoken form.
 * $25.99 -> "twenty-five dollars and ninety-nine cents"
 * $25 -> "twenty-five dollars"
 */
function convertPrices(text: string): string {
  // Handle prices with cents
  let result = text.replace(/\$(\d+)\.(\d{2})/g, (_, dollars, cents) => {
    const d = parseInt(dollars, 10);
    const c = parseInt(cents, 10);
    if (c === 0) {
      return `${numberToWords(d)} dollars`;
    }
    return `${numberToWords(d)} dollars and ${numberToWords(c)} cents`;
  });

  // Handle whole dollar prices
  result = result.replace(/\$(\d+)(?!\.\d)/g, (_, dollars) => {
    const d = parseInt(dollars, 10);
    return `${numberToWords(d)} dollars`;
  });

  return result;
}

/**
 * Convert percentages to spoken form.
 * 24.5% -> "twenty-four point five percent"
 */
function convertPercentages(text: string): string {
  return text.replace(/(\d+(?:\.\d+)?)\s*%/g, (_, num) => {
    const n = parseFloat(num);
    if (Number.isInteger(n)) {
      return `${numberToWords(n)} percent`;
    }
    const [whole, decimal] = num.split('.');
    return `${numberToWords(parseInt(whole, 10))} point ${decimal.split('').map((d: string) => numberToWords(parseInt(d, 10))).join(' ')} percent`;
  });
}

/**
 * Handle cannabis-specific terminology.
 */
function handleCannabisTerms(text: string): string {
  let result = text;

  // Expand THC/CBD to spell out
  result = result.replace(/\bTHC\b/g, 'T H C');
  result = result.replace(/\bCBD\b/g, 'C B D');
  result = result.replace(/\bCBN\b/g, 'C B N');
  result = result.replace(/\bCBG\b/g, 'C B G');
  result = result.replace(/\bTHCA\b/g, 'T H C A');

  // Fractions
  result = result.replace(/\b1\/8(?:th)?\b/gi, 'an eighth');
  result = result.replace(/\b1\/4(?:th)?\b/gi, 'a quarter');
  result = result.replace(/\b1\/2\b/gi, 'a half');
  result = result.replace(/\b3\.5\s*g(?:rams?)?\b/gi, 'an eighth');
  result = result.replace(/\b7\s*g(?:rams?)?\b/gi, 'a quarter ounce');
  result = result.replace(/\b14\s*g(?:rams?)?\b/gi, 'a half ounce');
  result = result.replace(/\b28\s*g(?:rams?)?\b/gi, 'an ounce');

  // Hyphenated words
  result = result.replace(/pre-roll/gi, 'pre roll');
  result = result.replace(/pre-rolls/gi, 'pre rolls');
  result = result.replace(/full-spectrum/gi, 'full spectrum');
  result = result.replace(/broad-spectrum/gi, 'broad spectrum');

  // Common brand pronunciations
  result = result.replace(/\bStiiizy\b/gi, 'Steezy');

  return result;
}

/**
 * Apply brand-specific vocabulary transformations.
 */
function applyBrandVocabulary(
  text: string,
  vocabulary: NonNullable<BrandVoiceConfig['vocabulary']>
): string {
  let result = text;

  for (const { word, pronunciation } of vocabulary) {
    if (pronunciation) {
      const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
      result = result.replace(regex, pronunciation);
    }
  }

  return result;
}

/**
 * Add natural pauses for better speech flow.
 */
function addNaturalPauses(text: string): string {
  let result = text;

  // Longer pause after periods (already handled by TTS, but we can hint)
  result = result.replace(/\.\s+/g, '. ');

  // Pause after colons
  result = result.replace(/:\s+/g, ': ');

  // Pause after commas in lists
  result = result.replace(/,\s+/g, ', ');

  return result;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert number to spoken words (simplified).
 */
function numberToWords(n: number): string {
  if (n < 0) return 'negative ' + numberToWords(-n);
  if (n === 0) return 'zero';

  const ones = [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen',
  ];

  const tens = [
    '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
  ];

  if (n < 20) return ones[n];

  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return tens[t] + (o ? '-' + ones[o] : '');
  }

  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return ones[h] + ' hundred' + (r ? ' ' + numberToWords(r) : '');
  }

  if (n < 1000000) {
    const t = Math.floor(n / 1000);
    const r = n % 1000;
    return numberToWords(t) + ' thousand' + (r ? ' ' + numberToWords(r) : '');
  }

  // For very large numbers, just return the digits
  return n.toString();
}

/**
 * Escape special regex characters.
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
