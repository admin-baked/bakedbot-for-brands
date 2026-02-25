/**
 * Packaging Intelligence Types
 *
 * Type contract for Phase 2 packaging analysis system.
 * Target customer: vertically integrated cannabis operators who manufacture their own products.
 * NOT for retailers like Thrive (who carry other brands — use vendor-brands instead).
 *
 * Phase 1 (stub): All analysis functions return null.
 * Phase 2 (future): Gemini Vision extraction + OCR + youth-appeal CV + state overlay validation.
 *
 * Firestore path: tenants/{orgId}/products/{productId}/packaging/{analysisId}
 */

// ─── COA (Certificate of Analysis) ───────────────────────────────────────────

export interface COAData {
  /** THC percentage from lab report (0–100) */
  thcPercent?: number;
  /** CBD percentage from lab report (0–100) */
  cbdPercent?: number;
  /** Delta-8 / Delta-9 / THCA breakdown if present */
  cannabinoids?: { name: string; percent: number }[];
  /** Terpene profile from lab report */
  terpenes?: { name: string; percent: number }[];
  /** ISO-accredited lab name */
  lab?: string;
  /** Test date (ISO string) */
  testDate?: string;
  /** Batch or lot ID from the label */
  batchId?: string;
  /** Pass/fail on residual solvents, pesticides, heavy metals */
  passedTesting?: boolean;
  /** QR code URL found on label linking to COA */
  coaQrUrl?: string;
  /** Confidence that the extracted COA values are accurate (0–100) */
  extractionConfidence: number;
}

// ─── Youth Appeal ─────────────────────────────────────────────────────────────

export type YouthAppealFlagType =
  | 'cartoon_character'
  | 'mascot_figure'
  | 'bright_candy_colors'
  | 'candy_like_name'
  | 'toy_imagery'
  | 'school_reference'
  | 'sports_team'
  | 'celebrity_appeal'
  | 'childlike_font'
  | 'animal_character';

export interface YouthAppealFlag {
  type: YouthAppealFlagType;
  description: string;
  /** Bounding box of the element in the image [x, y, width, height] as 0–1 fractions */
  boundingBox?: [number, number, number, number];
  severity: 'low' | 'medium' | 'high';
  /** Which regulation this violates */
  regulation: string;
}

export interface YouthAppealScore {
  /** 0 = fully compliant, 100 = extreme youth appeal risk */
  score: number;
  /** Overall recommendation */
  recommendation: 'compliant' | 'review' | 'reject';
  flags: YouthAppealFlag[];
  /** Jurisdictions where this packaging would be explicitly prohibited */
  prohibitedIn: string[];
  analyzedAt: Date;
}

// ─── State Compliance Overlay ─────────────────────────────────────────────────

export interface ComplianceWarning {
  text: string;
  /** Whether this warning was found on the packaging */
  present: boolean;
  /** Exact text match found, or closest match */
  foundText?: string;
  required: boolean;
}

export interface StateComplianceOverlay {
  jurisdiction: string;
  /** 0–100; 100 = fully compliant */
  complianceScore: number;
  warnings: ComplianceWarning[];
  /** Required label elements (license number, net weight, etc.) */
  requiredElements: {
    element: string;
    present: boolean;
    foundValue?: string;
  }[];
  /** Specific violations with OCM/state regulation references */
  violations: {
    description: string;
    regulation: string;
    severity: 'minor' | 'major' | 'critical';
  }[];
}

// ─── Main Analysis Record ─────────────────────────────────────────────────────

export type PackagingAnalysisStatus =
  | 'pending'    // submitted for analysis
  | 'processing' // vision model running
  | 'complete'   // analysis done
  | 'failed'     // extraction error
  | 'stub';      // Phase 1 — stub returned null

export interface PackagingAnalysis {
  id: string;
  productId: string;
  orgId: string;
  /** Original packaging image URL (CDN or Firebase Storage) */
  imageUrl: string;
  /** Firebase Storage copy for long-term retention */
  storageUrl?: string;
  status: PackagingAnalysisStatus;
  /** COA data extracted from label or linked QR code */
  coaData?: COAData;
  /** Youth-appeal CV analysis */
  youthAppealScore?: YouthAppealScore;
  /** Per-jurisdiction compliance overlay */
  stateCompliance?: Record<string, StateComplianceOverlay>;
  /** Raw OCR text extracted from the label */
  extractedText?: string[];
  /** Overall confidence across all extractions (0–100) */
  overallConfidence?: number;
  analyzedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Request / Response ───────────────────────────────────────────────────────

export interface AnalyzePackagingRequest {
  productId: string;
  orgId: string;
  imageUrl: string;
  /** Jurisdictions to run state compliance overlay against */
  jurisdictions?: string[];
  /** If true, also attempt to fetch and parse the COA via QR code */
  fetchCoaFromQr?: boolean;
}

export interface AnalyzePackagingResponse {
  success: boolean;
  analysis?: PackagingAnalysis;
  error?: string;
  /** Phase 1: always true until Phase 2 ships */
  isStub: boolean;
}
