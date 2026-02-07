/**
 * Brand Guide Repository
 *
 * Firestore data access layer for brand guides.
 * Handles CRUD operations, version history, and related data.
 */

import { Firestore, Timestamp } from '@google-cloud/firestore';
import type {
  BrandGuide,
  BrandGuideFirestore,
  BrandGuideVersion,
  BrandGuideExport,
  BrandAuditReport,
  BrandVoiceABTest,
} from '@/types/brand-guide';
import { logger } from '@/lib/logger';

// ============================================================================
// BRAND GUIDE REPOSITORY
// ============================================================================

export interface BrandGuideRepo {
  // Core CRUD
  create(brandId: string, data: Partial<BrandGuide>): Promise<BrandGuide>;
  getById(brandId: string): Promise<BrandGuide | null>;
  update(brandId: string, updates: Partial<BrandGuide>): Promise<void>;
  delete(brandId: string): Promise<void>;

  // Version History
  createVersion(brandId: string, version: BrandGuideVersion): Promise<void>;
  getVersionHistory(brandId: string): Promise<BrandGuideVersion[]>;
  getVersion(brandId: string, version: number): Promise<BrandGuideVersion | null>;
  rollbackToVersion(brandId: string, version: number): Promise<void>;

  // Exports
  saveExport(brandId: string, exportData: BrandGuideExport): Promise<void>;
  getExports(brandId: string): Promise<BrandGuideExport[]>;

  // Audit Reports
  saveAuditReport(brandId: string, report: BrandAuditReport): Promise<void>;
  getLatestAuditReport(brandId: string): Promise<BrandAuditReport | null>;
  getAuditReports(brandId: string, limit?: number): Promise<BrandAuditReport[]>;

  // A/B Tests
  createABTest(brandId: string, test: BrandVoiceABTest): Promise<string>;
  updateABTest(brandId: string, testId: string, updates: Partial<BrandVoiceABTest>): Promise<void>;
  getABTests(brandId: string): Promise<BrandVoiceABTest[]>;
  getActiveABTests(brandId: string): Promise<BrandVoiceABTest[]>;

  // Queries
  getByBrandId(brandId: string): Promise<BrandGuide[]>;
  listByOrg(orgId: string): Promise<BrandGuide[]>;
  search(query: string): Promise<BrandGuide[]>;
}

export function makeBrandGuideRepo(firestore: Firestore): BrandGuideRepo {
  const COLLECTION = 'brandGuides';

  /**
   * Convert BrandGuide to Firestore format
   */
  function toFirestore(guide: BrandGuide): BrandGuideFirestore {
    return {
      ...guide,
      createdAt: Timestamp.fromDate(guide.createdAt instanceof Date ? guide.createdAt : new Date()),
      lastUpdatedAt: Timestamp.fromDate(guide.lastUpdatedAt instanceof Date ? guide.lastUpdatedAt : new Date()),
    };
  }

  /**
   * Convert Firestore data to BrandGuide
   */
  function fromFirestore(doc: FirebaseFirestore.DocumentSnapshot): BrandGuide | null {
    if (!doc.exists) return null;

    const data = doc.data() as BrandGuideFirestore;
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      lastUpdatedAt: data.lastUpdatedAt.toDate(),
    };
  }

  /**
   * Create a new brand guide
   */
  async function create(brandId: string, data: Partial<BrandGuide>): Promise<BrandGuide> {
    const now = new Date();

    const guide: BrandGuide = {
      id: brandId,
      brandId,
      brandName: data.brandName || 'Unnamed Brand',

      // Initialize with defaults or provided data
      visualIdentity: data.visualIdentity || {
        logo: { primary: '' },
        colors: {
          primary: { hex: '#2D5016', name: 'Green', usage: 'Primary' },
          secondary: { hex: '#C9A05F', name: 'Gold', usage: 'Secondary' },
          accent: { hex: '#1A1A1A', name: 'Black', usage: 'Accent' },
          text: { hex: '#2C2C2C', name: 'Charcoal', usage: 'Text' },
          background: { hex: '#FFFFFF', name: 'White', usage: 'Background' },
        },
        typography: {
          headingFont: { family: 'Inter', weights: [400, 700], source: 'google' },
          bodyFont: { family: 'Open Sans', weights: [400], source: 'google' },
        },
        spacing: { scale: 8, borderRadius: 'md' },
      },

      voice: data.voice || {
        personality: ['Friendly', 'Professional'],
        tone: 'professional',
        vocabulary: { preferred: [], avoid: [], cannabisTerms: [] },
        writingStyle: {
          sentenceLength: 'medium',
          paragraphLength: 'moderate',
          useEmojis: false,
          useExclamation: false,
          useQuestions: true,
          useHumor: false,
          formalityLevel: 3,
          complexity: 'moderate',
          perspective: 'second-person',
        },
        sampleContent: [],
      },

      messaging: data.messaging || {
        tagline: '',
        positioning: '',
        missionStatement: '',
        valuePropositions: [],
        keyMessages: [],
      },

      compliance: data.compliance || {
        primaryState: 'CA',
        operatingStates: ['CA'],
        requiredDisclaimers: {
          age: 'You must be 21 years or older.',
          health: 'These statements have not been evaluated by the FDA.',
          legal: 'For legal medical use only.',
        },
        stateSpecificRules: [],
        ageGateLanguage: 'You must be 21 years or older to access this website.',
        medicalClaims: 'none',
        contentRestrictions: [],
      },

      assets: data.assets || {
        heroImages: [],
        productPhotography: { style: 'lifestyle', examples: [] },
        templates: {
          instagram: [],
          instagramStory: [],
          facebook: [],
          twitter: [],
          email: [],
          printable: [],
        },
      },

      suggestions: [],
      version: 1,
      versionHistory: [],

      source: data.source || {
        method: 'manual_entry',
      },

      sharing: data.sharing || {
        isPublic: false,
        allowedVendors: [],
        downloadEnabled: false,
        accessControl: 'private',
      },

      completenessScore: calculateCompleteness(data),
      status: data.status || 'draft',
      createdAt: now,
      createdBy: data.createdBy || 'system',
      lastUpdatedAt: now,
      lastUpdatedBy: data.createdBy || 'system',
    };

    // Save to Firestore
    await firestore.collection(COLLECTION).doc(brandId).set(toFirestore(guide));

    logger.info('Brand guide created', { brandId });
    return guide;
  }

  /**
   * Get brand guide by ID
   */
  async function getById(brandId: string): Promise<BrandGuide | null> {
    const doc = await firestore.collection(COLLECTION).doc(brandId).get();
    return fromFirestore(doc);
  }

  /**
   * Update brand guide
   */
  async function update(brandId: string, updates: Partial<BrandGuide>): Promise<void> {
    const updateData: any = {
      ...updates,
      lastUpdatedAt: Timestamp.now(),
    };

    // Convert dates to Timestamps
    if (updates.createdAt) {
      updateData.createdAt = Timestamp.fromDate(
        updates.createdAt instanceof Date ? updates.createdAt : new Date()
      );
    }

    await firestore.collection(COLLECTION).doc(brandId).update(updateData);

    logger.info('Brand guide updated', { brandId });
  }

  /**
   * Delete brand guide
   */
  async function deleteBrandGuide(brandId: string): Promise<void> {
    await firestore.collection(COLLECTION).doc(brandId).delete();
    logger.info('Brand guide deleted', { brandId });
  }

  /**
   * Create version history entry
   */
  async function createVersion(brandId: string, version: BrandGuideVersion): Promise<void> {
    const versionId = `v${version.version}`;
    await firestore
      .collection(COLLECTION)
      .doc(brandId)
      .collection('versions')
      .doc(versionId)
      .set({
        ...version,
        timestamp: Timestamp.fromDate(version.timestamp),
      });

    logger.info('Version created', { brandId, version: version.version });
  }

  /**
   * Get version history
   */
  async function getVersionHistory(brandId: string): Promise<BrandGuideVersion[]> {
    const snapshot = await firestore
      .collection(COLLECTION)
      .doc(brandId)
      .collection('versions')
      .orderBy('version', 'desc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        timestamp: data.timestamp.toDate(),
      } as BrandGuideVersion;
    });
  }

  /**
   * Get specific version
   */
  async function getVersion(brandId: string, version: number): Promise<BrandGuideVersion | null> {
    const doc = await firestore
      .collection(COLLECTION)
      .doc(brandId)
      .collection('versions')
      .doc(`v${version}`)
      .get();

    if (!doc.exists) return null;

    const data = doc.data();
    return {
      ...data,
      timestamp: data!.timestamp.toDate(),
    } as BrandGuideVersion;
  }

  /**
   * Rollback to specific version
   */
  async function rollbackToVersion(brandId: string, versionNum: number): Promise<void> {
    const version = await getVersion(brandId, versionNum);
    if (!version || !version.snapshot) {
      throw new Error(`Version ${versionNum} not found or has no snapshot`);
    }

    // Get current guide to increment version
    const current = await getById(brandId);
    if (!current) {
      throw new Error('Brand guide not found');
    }

    // Create new version before rollback
    await createVersion(brandId, {
      version: current.version + 1,
      timestamp: new Date(),
      updatedBy: 'system',
      changes: [
        {
          field: 'rollback',
          oldValue: current.version,
          newValue: versionNum,
          reason: `Rolled back to version ${versionNum}`,
        },
      ],
      snapshot: version.snapshot,
      isActive: true,
    });

    // Apply rollback
    await update(brandId, {
      ...version.snapshot,
      version: current.version + 1,
      lastUpdatedAt: new Date(),
      lastUpdatedBy: 'system',
    });

    logger.info('Rolled back to version', { brandId, version: versionNum });
  }

  /**
   * Save export record
   */
  async function saveExport(brandId: string, exportData: BrandGuideExport): Promise<void> {
    await firestore
      .collection(COLLECTION)
      .doc(brandId)
      .collection('exports')
      .add({
        ...exportData,
        generatedAt: Timestamp.fromDate(exportData.generatedAt),
        expiresAt: exportData.expiresAt ? Timestamp.fromDate(exportData.expiresAt) : null,
      });

    logger.info('Export saved', { brandId, format: exportData.format });
  }

  /**
   * Get exports
   */
  async function getExports(brandId: string): Promise<BrandGuideExport[]> {
    const snapshot = await firestore
      .collection(COLLECTION)
      .doc(brandId)
      .collection('exports')
      .orderBy('generatedAt', 'desc')
      .limit(20)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        generatedAt: data.generatedAt.toDate(),
        expiresAt: data.expiresAt ? data.expiresAt.toDate() : undefined,
      } as BrandGuideExport;
    });
  }

  /**
   * Save audit report
   */
  async function saveAuditReport(brandId: string, report: BrandAuditReport): Promise<void> {
    await firestore
      .collection(COLLECTION)
      .doc(brandId)
      .collection('audits')
      .doc(report.id)
      .set({
        ...report,
        generatedAt: Timestamp.fromDate(report.generatedAt),
        period: {
          start: Timestamp.fromDate(report.period.start),
          end: Timestamp.fromDate(report.period.end),
        },
      });

    logger.info('Audit report saved', { brandId, reportId: report.id });
  }

  /**
   * Get latest audit report
   */
  async function getLatestAuditReport(brandId: string): Promise<BrandAuditReport | null> {
    const snapshot = await firestore
      .collection(COLLECTION)
      .doc(brandId)
      .collection('audits')
      .orderBy('generatedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const data = snapshot.docs[0].data();
    return {
      ...data,
      generatedAt: data.generatedAt.toDate(),
      period: {
        start: data.period.start.toDate(),
        end: data.period.end.toDate(),
      },
    } as BrandAuditReport;
  }

  /**
   * Get audit reports
   */
  async function getAuditReports(brandId: string, limit: number = 10): Promise<BrandAuditReport[]> {
    const snapshot = await firestore
      .collection(COLLECTION)
      .doc(brandId)
      .collection('audits')
      .orderBy('generatedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        generatedAt: data.generatedAt.toDate(),
        period: {
          start: data.period.start.toDate(),
          end: data.period.end.toDate(),
        },
      } as BrandAuditReport;
    });
  }

  /**
   * Create A/B test
   */
  async function createABTest(brandId: string, test: BrandVoiceABTest): Promise<string> {
    const docRef = await firestore
      .collection(COLLECTION)
      .doc(brandId)
      .collection('abTests')
      .add({
        ...test,
        startDate: Timestamp.fromDate(test.startDate),
        endDate: test.endDate ? Timestamp.fromDate(test.endDate) : null,
      });

    logger.info('A/B test created', { brandId, testId: docRef.id });
    return docRef.id;
  }

  /**
   * Update A/B test
   */
  async function updateABTest(
    brandId: string,
    testId: string,
    updates: Partial<BrandVoiceABTest>
  ): Promise<void> {
    const updateData: any = { ...updates };

    if (updates.startDate) {
      updateData.startDate = Timestamp.fromDate(updates.startDate);
    }
    if (updates.endDate) {
      updateData.endDate = Timestamp.fromDate(updates.endDate);
    }

    await firestore
      .collection(COLLECTION)
      .doc(brandId)
      .collection('abTests')
      .doc(testId)
      .update(updateData);

    logger.info('A/B test updated', { brandId, testId });
  }

  /**
   * Get A/B tests
   */
  async function getABTests(brandId: string): Promise<BrandVoiceABTest[]> {
    const snapshot = await firestore
      .collection(COLLECTION)
      .doc(brandId)
      .collection('abTests')
      .orderBy('startDate', 'desc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        startDate: data.startDate.toDate(),
        endDate: data.endDate ? data.endDate.toDate() : undefined,
      } as BrandVoiceABTest;
    });
  }

  /**
   * Get active A/B tests
   */
  async function getActiveABTests(brandId: string): Promise<BrandVoiceABTest[]> {
    const now = Timestamp.now();
    const snapshot = await firestore
      .collection(COLLECTION)
      .doc(brandId)
      .collection('abTests')
      .where('status', '==', 'running')
      .where('startDate', '<=', now)
      .get();

    return snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          startDate: data.startDate.toDate(),
          endDate: data.endDate ? data.endDate.toDate() : undefined,
        } as BrandVoiceABTest;
      })
      .filter((test) => !test.endDate || test.endDate > new Date());
  }

  /**
   * Get brand guides by brandId
   */
  async function getByBrandId(brandId: string): Promise<BrandGuide[]> {
    const snapshot = await firestore
      .collection(COLLECTION)
      .where('brandId', '==', brandId)
      .orderBy('lastUpdatedAt', 'desc')
      .get();

    return snapshot.docs
      .map((doc) => fromFirestore(doc))
      .filter((guide): guide is BrandGuide => guide !== null);
  }

  /**
   * List brand guides by organization
   */
  async function listByOrg(orgId: string): Promise<BrandGuide[]> {
    const snapshot = await firestore
      .collection(COLLECTION)
      .where('brandId', '==', orgId)
      .get();

    return snapshot.docs
      .map((doc) => fromFirestore(doc))
      .filter((guide): guide is BrandGuide => guide !== null);
  }

  /**
   * Search brand guides
   */
  async function search(query: string): Promise<BrandGuide[]> {
    // Simple search - in production, use Algolia or similar
    const snapshot = await firestore.collection(COLLECTION).get();

    const lowerQuery = query.toLowerCase();
    return snapshot.docs
      .map((doc) => fromFirestore(doc))
      .filter((guide): guide is BrandGuide => guide !== null)
      .filter(
        (guide) =>
          guide.brandName.toLowerCase().includes(lowerQuery) ||
          guide.messaging.tagline?.toLowerCase().includes(lowerQuery) ||
          guide.messaging.positioning?.toLowerCase().includes(lowerQuery)
      );
  }

  /**
   * Calculate completeness score
   */
  function calculateCompleteness(data: Partial<BrandGuide>): number {
    let score = 0;

    // Visual Identity (25 points)
    if (data.visualIdentity?.logo?.primary) score += 5;
    if (data.visualIdentity?.colors) score += 10;
    if (data.visualIdentity?.typography) score += 10;

    // Brand Voice (25 points)
    if (data.voice?.personality && data.voice.personality.length > 0) score += 10;
    if (data.voice?.tone) score += 5;
    if (data.voice?.writingStyle) score += 5;
    if (data.voice?.sampleContent && data.voice.sampleContent.length > 0) score += 5;

    // Messaging (25 points)
    if (data.messaging?.tagline) score += 10;
    if (data.messaging?.positioning) score += 10;
    if (data.messaging?.valuePropositions && data.messaging.valuePropositions.length > 0) score += 5;

    // Compliance (15 points)
    if (data.compliance?.primaryState) score += 5;
    if (data.compliance?.requiredDisclaimers) score += 5;
    if (data.compliance?.ageGateLanguage) score += 5;

    // Assets (10 points)
    if (data.assets?.heroImages && data.assets.heroImages.length > 0) score += 5;
    if (data.assets?.templates) score += 5;

    return Math.min(score, 100);
  }

  return {
    create,
    getById,
    update,
    delete: deleteBrandGuide,
    createVersion,
    getVersionHistory,
    getVersion,
    rollbackToVersion,
    saveExport,
    getExports,
    saveAuditReport,
    getLatestAuditReport,
    getAuditReports,
    createABTest,
    updateABTest,
    getABTests,
    getActiveABTests,
    getByBrandId,
    listByOrg,
    search,
  };
}
