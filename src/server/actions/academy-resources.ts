'use server';

/**
 * Academy Resource Download Actions
 *
 * Handles secure resource downloads from Firebase Storage.
 * Generates signed URLs with expiration for PDFs, Excel files, etc.
 */

import { getAdminStorage } from '@/firebase/admin';
import { z } from 'zod';

// Validation schemas
const GetResourceDownloadUrlSchema = z.object({
  resourceId: z.string().min(1, 'Resource ID is required'),
  leadId: z.string().optional(),
});

export type GetResourceDownloadUrlInput = z.infer<typeof GetResourceDownloadUrlSchema>;

export interface GetResourceDownloadUrlResult {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  fileType?: string;
  error?: string;
}

/**
 * Generate a signed download URL for an Academy resource
 *
 * Maps resourceId to Firebase Storage path and generates a signed URL
 * with 1-hour expiration for security.
 *
 * @param input - Resource ID and optional lead ID for tracking
 * @returns Download URL or error
 */
export async function getResourceDownloadUrl(
  input: GetResourceDownloadUrlInput
): Promise<GetResourceDownloadUrlResult> {
  try {
    // Validate input
    const validated = GetResourceDownloadUrlSchema.parse(input);
    const { resourceId, leadId } = validated;

    // Map resource ID to storage path
    const storagePath = getStoragePath(resourceId);
    if (!storagePath) {
      return {
        success: false,
        error: 'Invalid resource ID',
      };
    }

    // Get Firebase Storage bucket
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const file = bucket.file(storagePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      console.error(`Resource file not found: ${storagePath}`);
      return {
        success: false,
        error: 'Resource file not found. Please contact support.',
      };
    }

    // Generate signed URL (expires in 1 hour)
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    // Extract file info
    const fileName = storagePath.split('/').pop() || 'download';
    const fileType = fileName.split('.').pop()?.toUpperCase() || 'FILE';

    // Log download request (optional - for analytics)
    if (leadId) {
      console.log(`Resource download: ${resourceId} by lead ${leadId}`);
    }

    return {
      success: true,
      downloadUrl: signedUrl,
      fileName,
      fileType,
    };
  } catch (error) {
    console.error('Error generating resource download URL:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      };
    }

    return {
      success: false,
      error: 'Failed to generate download URL. Please try again.',
    };
  }
}

/**
 * Map resource ID to Firebase Storage path
 *
 * Resource IDs from curriculum map to specific files in academy/ folder.
 * Returns null if resource ID is invalid.
 */
function getStoragePath(resourceId: string): string | null {
  // Resource ID format: {type}-{slug}
  // e.g., 'checklist-ai-readiness', 'template-email-campaign', 'guide-seo-2026'

  const resourcePaths: Record<string, string> = {
    // Episode 1 Resources
    'checklist-ai-readiness': 'academy/checklists/ai-readiness-checklist.pdf',
    'template-persona-worksheet':
      'academy/templates/customer-persona-worksheet.xlsx',

    // Episode 2 Resources
    'checklist-menu-audit': 'academy/checklists/menu-audit-checklist.pdf',
    'guide-seo-2026': 'academy/guides/cannabis-seo-guide-2026.pdf',

    // Episode 3 Resources
    'template-segment-calculator':
      'academy/templates/segment-calculator.xlsx',

    // Episode 4 Resources (Deebo - Compliance)
    'checklist-compliance': 'academy/checklists/compliance-checklist.pdf',

    // Episode 5 Resources (Smokey - Budtender)
    'template-product-knowledge':
      'academy/templates/product-knowledge-quiz.xlsx',

    // Episode 6 Resources (Craig - Marketer)
    'checklist-campaign-planning':
      'academy/checklists/campaign-planning-checklist.pdf',
    'template-email-campaign': 'academy/templates/email-campaign-template.xlsx',
    'template-content-calendar':
      'academy/templates/social-media-content-calendar.xlsx',

    // Episode 7 Resources (Pops - Analyst)
    'template-budget-calculator':
      'academy/templates/marketing-budget-calculator.xlsx',

    // Episode 8 Resources (Ezal - Lookout)
    'guide-competitive-intelligence':
      'academy/guides/competitive-intelligence-playbook.pdf',

    // Episode 9 Resources (Money Mike - Loyalty)
    'template-loyalty-roi': 'academy/templates/loyalty-roi-calculator.xlsx',

    // Episode 10 Resources (Mrs. Parker - Memory)
    'guide-email-marketing': 'academy/guides/email-marketing-guide.pdf',

    // Episode 11 Resources (Deebo Returns - Operations)
    'checklist-operations': 'academy/checklists/operations-checklist.pdf',

    // Episode 12 Resources (Integration)
    'guide-integration': 'academy/guides/full-stack-integration-guide.pdf',

    // Additional standalone resources
    'checklist-social-audit':
      'academy/checklists/social-media-audit-checklist.pdf',
    'guide-instagram': 'academy/guides/instagram-best-practices.pdf',
  };

  return resourcePaths[resourceId] || null;
}

/**
 * Bulk download URL generation (for dashboard resource library)
 *
 * Generates signed URLs for multiple resources at once.
 * Useful for displaying a full resource library with download links.
 */
export async function getBulkResourceDownloadUrls(
  resourceIds: string[]
): Promise<{
  success: boolean;
  resources?: Array<{
    resourceId: string;
    downloadUrl: string;
    fileName: string;
    fileType: string;
  }>;
  error?: string;
}> {
  try {
    const results = await Promise.allSettled(
      resourceIds.map((id) => getResourceDownloadUrl({ resourceId: id }))
    );

    const resources = results
      .map((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          return {
            resourceId: resourceIds[index],
            downloadUrl: result.value.downloadUrl!,
            fileName: result.value.fileName!,
            fileType: result.value.fileType!,
          };
        }
        return null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return {
      success: true,
      resources,
    };
  } catch (error) {
    console.error('Error generating bulk download URLs:', error);
    return {
      success: false,
      error: 'Failed to generate download URLs',
    };
  }
}
