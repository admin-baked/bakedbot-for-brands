/**
 * Brand Voice Analyzer
 *
 * AI-powered analysis of existing brand content to extract and quantify
 * brand voice characteristics, tone patterns, and writing style.
 *
 * Can analyze:
 * - Website content
 * - Social media posts
 * - Email campaigns
 * - Product descriptions
 * - Blog posts
 */

import { callClaude } from '@/ai/claude';
import type {
  BrandVoice,
  BrandPersonalityTrait,
  BrandTone,
  BrandVoiceSample,
} from '@/types/brand-guide';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ContentSample {
  type: 'website' | 'social' | 'email' | 'product' | 'blog';
  platform?: 'instagram' | 'twitter' | 'facebook' | 'linkedin' | 'tiktok';
  text: string;
  url?: string;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
  };
  timestamp?: Date;
}

export interface VoiceAnalysisResult {
  voice: Partial<BrandVoice>;
  insights: {
    dominantTraits: Array<{
      trait: BrandPersonalityTrait;
      confidence: number; // 0-100
      evidence: string[]; // Example phrases
    }>;
    toneConsistency: number; // 0-100
    styleConsistency: number; // 0-100
    recommendations: string[];
  };
  patterns: {
    commonPhrases: string[];
    sentenceStructure: {
      averageLength: number;
      variation: 'low' | 'medium' | 'high';
    };
    vocabularyRichness: number; // 0-100
    readabilityScore: number; // Flesch reading ease
  };
  samples: BrandVoiceSample[];
}

// ============================================================================
// BRAND VOICE ANALYZER
// ============================================================================

export class BrandVoiceAnalyzer {
  /**
   * Analyze content samples to extract brand voice
   */
  async analyzeBrandVoice(
    samples: ContentSample[],
    brandName?: string
  ): Promise<VoiceAnalysisResult> {
    logger.info('Starting brand voice analysis', {
      sampleCount: samples.length,
      brandName,
    });

    try {
      // Step 1: Pre-process samples
      const processedSamples = this.preprocessSamples(samples);

      // Step 2: Analyze with AI
      const aiAnalysis = await this.performAIAnalysis(
        processedSamples,
        brandName
      );

      // Step 3: Extract patterns
      const patterns = this.analyzePatterns(processedSamples);

      // Step 4: Generate insights
      const insights = this.generateInsights(aiAnalysis, patterns);

      // Step 5: Create voice samples
      const voiceSamples = this.createVoiceSamples(samples);

      return {
        voice: aiAnalysis.voice,
        insights,
        patterns,
        samples: voiceSamples,
      };
    } catch (error) {
      logger.error('Brand voice analysis failed', { error });
      throw new Error(`Voice analysis failed: ${(error as Error).message}`);
    }
  }

  /**
   * Analyze tone consistency across samples
   */
  async analyzeToneConsistency(samples: ContentSample[]): Promise<{
    overallTone: BrandTone;
    consistency: number; // 0-100
    variations: Array<{
      sample: string;
      detectedTone: BrandTone;
      confidence: number;
    }>;
  }> {
    const tones = await Promise.all(
      samples.map(async (sample) => {
        const detected = await this.detectTone(sample.text);
        return {
          sample: sample.text.substring(0, 100),
          detectedTone: detected.tone,
          confidence: detected.confidence,
        };
      })
    );

    // Find most common tone
    const toneCounts = new Map<BrandTone, number>();
    tones.forEach((t) => {
      toneCounts.set(t.detectedTone, (toneCounts.get(t.detectedTone) || 0) + 1);
    });

    const overallTone = [...toneCounts.entries()].reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    // Calculate consistency (% matching overall tone)
    const matchingCount = tones.filter(
      (t) => t.detectedTone === overallTone
    ).length;
    const consistency = (matchingCount / tones.length) * 100;

    return {
      overallTone,
      consistency,
      variations: tones,
    };
  }

  /**
   * Compare two brand voices
   */
  compareBrandVoices(
    voice1: Partial<BrandVoice>,
    voice2: Partial<BrandVoice>
  ): {
    similarity: number; // 0-100
    differences: string[];
    recommendations: string[];
  } {
    const differences: string[] = [];
    let matchScore = 0;
    let totalChecks = 0;

    // Compare personalities
    if (voice1.personality && voice2.personality) {
      const commonTraits = voice1.personality.filter((t) =>
        voice2.personality?.includes(t)
      );
      const traitSimilarity =
        (commonTraits.length /
          Math.max(voice1.personality.length, voice2.personality.length)) *
        100;
      matchScore += traitSimilarity;
      totalChecks++;

      if (traitSimilarity < 50) {
        differences.push(
          `Personality traits differ significantly: ${voice1.personality.join(', ')} vs ${voice2.personality.join(', ')}`
        );
      }
    }

    // Compare tones
    if (voice1.tone && voice2.tone) {
      if (voice1.tone === voice2.tone) {
        matchScore += 100;
      } else {
        differences.push(`Tone differs: ${voice1.tone} vs ${voice2.tone}`);
      }
      totalChecks++;
    }

    // Compare writing styles
    if (voice1.writingStyle && voice2.writingStyle) {
      let styleMatches = 0;
      let styleChecks = 0;

      if (voice1.writingStyle.sentenceLength === voice2.writingStyle.sentenceLength) {
        styleMatches++;
      }
      styleChecks++;

      if (voice1.writingStyle.useEmojis === voice2.writingStyle.useEmojis) {
        styleMatches++;
      }
      styleChecks++;

      if (
        voice1.writingStyle.formalityLevel === voice2.writingStyle.formalityLevel
      ) {
        styleMatches++;
      }
      styleChecks++;

      const styleSimilarity = (styleMatches / styleChecks) * 100;
      matchScore += styleSimilarity;
      totalChecks++;

      if (styleSimilarity < 50) {
        differences.push('Writing style characteristics differ');
      }
    }

    const similarity = totalChecks > 0 ? matchScore / totalChecks : 0;

    // Generate recommendations
    const recommendations: string[] = [];
    if (similarity < 70) {
      recommendations.push(
        'Consider standardizing brand voice across all channels'
      );
    }
    if (differences.length > 0) {
      recommendations.push('Review and align the identified differences');
    }

    return {
      similarity,
      differences,
      recommendations,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Preprocess content samples
   */
  private preprocessSamples(samples: ContentSample[]): ContentSample[] {
    return samples
      .filter((s) => s.text.length > 20) // Filter very short samples
      .map((s) => ({
        ...s,
        text: s.text.trim(),
      }))
      .slice(0, 50); // Limit to 50 samples
  }

  /**
   * Perform AI analysis of content
   */
  private async performAIAnalysis(
    samples: ContentSample[],
    brandName?: string
  ): Promise<{
    voice: Partial<BrandVoice>;
    traits: Array<{
      trait: BrandPersonalityTrait;
      confidence: number;
      evidence: string[];
    }>;
  }> {
    const contentSamples = samples.map((s) => s.text).join('\n\n---\n\n');

    const prompt = `Analyze the following content samples from ${brandName || 'a brand'} and extract detailed brand voice characteristics.

Content samples:
${contentSamples.substring(0, 8000)}

Analyze and extract:
1. Personality traits (from: Friendly, Professional, Playful, Sophisticated, Educational, Trustworthy, Innovative, Authentic, Empowering, Wellness-focused)
2. Overall tone (professional, casual, playful, sophisticated, educational, empathetic, authoritative)
3. Writing style characteristics
4. Vocabulary patterns
5. Cannabis-specific terminology usage

For each personality trait you identify, provide:
- Confidence level (0-100)
- Evidence phrases that demonstrate the trait

Return ONLY a valid JSON object with this exact structure:
{
  "voice": {
    "personality": ["Trait1", "Trait2", "Trait3"],
    "tone": "casual|professional|playful|sophisticated|educational|empathetic|authoritative",
    "writingStyle": {
      "sentenceLength": "short|medium|long|varied",
      "paragraphLength": "concise|moderate|detailed",
      "useEmojis": true|false,
      "emojiFrequency": "rare|occasional|frequent",
      "useExclamation": true|false,
      "useQuestions": true|false,
      "useHumor": true|false,
      "formalityLevel": 1-5,
      "complexity": "simple|moderate|advanced",
      "perspective": "first-person|second-person|third-person|mixed"
    },
    "vocabulary": {
      "preferred": [
        {"term": "Flower", "instead": "Bud", "context": "Product references"}
      ],
      "avoid": [
        {"term": "Weed", "reason": "Too casual"}
      ],
      "cannabisTerms": [
        {"term": "Terpene", "definition": "Aromatic compounds", "audience": "all"}
      ]
    }
  },
  "traits": [
    {
      "trait": "Friendly",
      "confidence": 85,
      "evidence": ["phrase 1", "phrase 2", "phrase 3"]
    }
  ]
}`;

    try {
      const response = await callClaude({
        userMessage: prompt,
        systemPrompt:
          'You are an expert brand voice analyst. Analyze writing patterns and return ONLY valid JSON.',
        maxTokens: 3000,
      });

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      return analysis;
    } catch (error) {
      logger.error('AI voice analysis failed', { error });
      throw error;
    }
  }

  /**
   * Detect tone in a text sample
   */
  private async detectTone(text: string): Promise<{
    tone: BrandTone;
    confidence: number;
  }> {
    // Simple heuristic-based detection for now
    // In production, use a more sophisticated AI model

    const lowerText = text.toLowerCase();

    const toneIndicators = {
      professional: ['we', 'our', 'quality', 'service', 'ensure', 'provide'],
      casual: ['hey', 'cool', 'awesome', 'totally', 'yeah'],
      playful: ['!', '😊', '🌿', 'fun', 'love'],
      sophisticated: ['exemplifies', 'curated', 'artisanal', 'refined'],
      educational: ['learn', 'understand', 'knowledge', 'information'],
      empathetic: ['you', 'your', 'help', 'support', 'care'],
      authoritative: ['must', 'should', 'expert', 'proven', 'tested'],
    };

    const scores = new Map<BrandTone, number>();

    for (const [tone, indicators] of Object.entries(toneIndicators)) {
      let score = 0;
      for (const indicator of indicators) {
        if (lowerText.includes(indicator)) {
          score++;
        }
      }
      scores.set(tone as BrandTone, score);
    }

    const [detectedTone, score] = [...scores.entries()].reduce((a, b) =>
      a[1] > b[1] ? a : b
    );

    const confidence = Math.min((score / 10) * 100, 100);

    return { tone: detectedTone, confidence };
  }

  /**
   * Analyze linguistic patterns
   */
  private analyzePatterns(samples: ContentSample[]): VoiceAnalysisResult['patterns'] {
    const allText = samples.map((s) => s.text).join(' ');
    const sentences = allText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = allText.split(/\s+/);

    // Sentence length analysis
    const sentenceLengths = sentences.map((s) => s.split(/\s+/).length);
    const avgSentenceLength =
      sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const sentenceVariation = this.calculateVariation(sentenceLengths);

    // Extract common phrases (3-word sequences)
    const phrases = this.extractCommonPhrases(allText);

    // Vocabulary richness (unique words / total words)
    const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
    const vocabularyRichness = (uniqueWords.size / words.length) * 100;

    // Readability (simplified Flesch)
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    const readabilityScore = Math.max(
      0,
      206.835 -
        1.015 * (words.length / sentences.length) -
        84.6 * (syllables / words.length)
    );

    return {
      commonPhrases: phrases,
      sentenceStructure: {
        averageLength: Math.round(avgSentenceLength),
        variation: sentenceVariation,
      },
      vocabularyRichness: Math.round(vocabularyRichness),
      readabilityScore: Math.round(readabilityScore),
    };
  }

  /**
   * Generate insights from analysis
   */
  private generateInsights(
    aiAnalysis: {
      voice: Partial<BrandVoice>;
      traits: Array<{
        trait: BrandPersonalityTrait;
        confidence: number;
        evidence: string[];
      }>;
    },
    patterns: VoiceAnalysisResult['patterns']
  ): VoiceAnalysisResult['insights'] {
    const recommendations: string[] = [];

    // Check tone consistency
    const toneConsistency = 85; // Placeholder - would calculate from samples

    // Check style consistency
    const styleConsistency = 80; // Placeholder

    // Generate recommendations
    if (toneConsistency < 70) {
      recommendations.push(
        'Tone varies across content. Consider creating style guidelines.'
      );
    }

    if (patterns.vocabularyRichness < 30) {
      recommendations.push(
        'Limited vocabulary diversity. Consider expanding word choices.'
      );
    }

    if (patterns.readabilityScore < 50) {
      recommendations.push(
        'Content may be difficult to read. Consider simplifying language.'
      );
    }

    if (patterns.sentenceStructure.variation === 'low') {
      recommendations.push(
        'Sentence structure is repetitive. Vary sentence lengths for better flow.'
      );
    }

    return {
      dominantTraits: aiAnalysis.traits,
      toneConsistency,
      styleConsistency,
      recommendations,
    };
  }

  /**
   * Create voice samples from content
   */
  private createVoiceSamples(samples: ContentSample[]): BrandVoiceSample[] {
    return samples
      .slice(0, 10)
      .map((sample) => ({
        type: this.mapContentTypeToSampleType(sample.type),
        content: sample.text,
        context: sample.platform
          ? `Posted on ${sample.platform}`
          : `From ${sample.type}`,
        aiGenerated: false,
      }));
  }

  /**
   * Map content type to voice sample type
   */
  private mapContentTypeToSampleType(
    type: ContentSample['type']
  ): BrandVoiceSample['type'] {
    switch (type) {
      case 'social':
        return 'social_post';
      case 'product':
        return 'product_description';
      case 'email':
        return 'email';
      case 'blog':
        return 'blog';
      default:
        return 'social_post';
    }
  }

  /**
   * Extract common 3-word phrases
   */
  private extractCommonPhrases(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const phrases = new Map<string, number>();

    for (let i = 0; i < words.length - 2; i++) {
      const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (phrase.length > 10) {
        // Minimum phrase length
        phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
      }
    }

    // Return top 10 most common phrases
    return [...phrases.entries()]
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase]) => phrase);
  }

  /**
   * Calculate variation in a number array
   */
  private calculateVariation(numbers: number[]): 'low' | 'medium' | 'high' {
    if (numbers.length < 2) return 'low';

    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance =
      numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = (stdDev / mean) * 100;

    if (coefficientOfVariation < 20) return 'low';
    if (coefficientOfVariation < 40) return 'medium';
    return 'high';
  }

  /**
   * Count syllables in a word (simplified)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

let analyzerInstance: BrandVoiceAnalyzer | null = null;

export function getBrandVoiceAnalyzer(): BrandVoiceAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new BrandVoiceAnalyzer();
  }
  return analyzerInstance;
}
