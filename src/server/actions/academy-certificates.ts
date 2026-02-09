'use server';

/**
 * Academy Certificate Generation
 *
 * Generates beautiful PDF certificates for completed tracks and master completion.
 * Uses HTML/CSS with Puppeteer or similar for PDF generation.
 */

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore, getAdminStorage } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { AGENT_TRACKS } from '@/lib/academy/curriculum';
import type { AgentTrack } from '@/types/academy';

export interface GenerateCertificateInput {
  trackId?: AgentTrack; // If provided, generates track certificate. If not, generates master certificate.
}

/**
 * Generate Academy Certificate
 *
 * Creates a PDF certificate for either:
 * - A specific agent track (trackId provided)
 * - Master certificate (all tracks complete, no trackId)
 */
export async function generateCertificate(
  input: GenerateCertificateInput
): Promise<{
  success: boolean;
  certificateUrl?: string;
  error?: string;
}> {
  try {
    const authResult = await requireUser();
    if (!authResult.success || !authResult.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const userId = authResult.user.uid;
    const userName = authResult.user.displayName || authResult.user.email || 'Academy Graduate';
    const db = getAdminFirestore();

    // Get user's progress
    const progressDoc = await db
      .collection('users')
      .doc(userId)
      .collection('academy')
      .doc('progress')
      .get();

    if (!progressDoc.exists) {
      return { success: false, error: 'No Academy progress found' };
    }

    const progress = progressDoc.data();

    // Verify completion
    if (input.trackId) {
      // Track certificate
      const completedTracks = progress?.completedTracks || [];
      if (!completedTracks.includes(input.trackId)) {
        return {
          success: false,
          error: 'Track not yet completed. Finish all episodes in this track first.',
        };
      }
    } else {
      // Master certificate - verify all 7 tracks completed
      const completedTracks = progress?.completedTracks || [];
      const allTracks: AgentTrack[] = [
        'smokey',
        'craig',
        'pops',
        'ezal',
        'money-mike',
        'mrs-parker',
        'deebo',
      ];
      const allComplete = allTracks.every((track) => completedTracks.includes(track));

      if (!allComplete) {
        return {
          success: false,
          error: 'Master certificate requires completing all 7 agent tracks.',
        };
      }
    }

    // Generate certificate HTML
    const certificateHtml = generateCertificateHtml({
      userName,
      trackId: input.trackId,
      completionDate: new Date(),
    });

    // For now, return the HTML as a data URL
    // In production, you would use Puppeteer or a PDF library to convert to PDF
    // and upload to Firebase Storage

    // Simple approach: Return HTML that can be printed to PDF
    const certificateId = `${userId}-${input.trackId || 'master'}-${Date.now()}`;

    // Store certificate metadata in Firestore
    await db.collection('academy_certificates').doc(certificateId).set({
      userId,
      userName,
      trackId: input.trackId || 'master',
      generatedAt: new Date(),
      certificateHtml,
    });

    // Return certificate URL (in production, this would be a Storage URL)
    const certificateUrl = `/api/certificates/${certificateId}`;

    logger.info('[ACADEMY_CERTIFICATES] Generated certificate', {
      userId,
      trackId: input.trackId || 'master',
    });

    return {
      success: true,
      certificateUrl,
    };
  } catch (error) {
    logger.error('[ACADEMY_CERTIFICATES] Failed to generate certificate', { error });
    return {
      success: false,
      error: 'Failed to generate certificate',
    };
  }
}

/**
 * Generate Certificate HTML
 *
 * Creates a beautiful, printable certificate using HTML/CSS
 */
function generateCertificateHtml(params: {
  userName: string;
  trackId?: AgentTrack;
  completionDate: Date;
}): string {
  const { userName, trackId, completionDate } = params;

  const trackInfo = trackId ? AGENT_TRACKS[trackId] : null;
  const certificateTitle = trackInfo
    ? `${trackInfo.name} Track Certificate`
    : 'Master Certificate of Completion';
  const description = trackInfo
    ? `has successfully completed the ${trackInfo.name} track of the Cannabis Marketing AI Academy`
    : 'has successfully completed ALL SEVEN tracks of the Cannabis Marketing AI Academy, demonstrating mastery in AI-powered cannabis marketing';

  const dateString = completionDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const trackColor = trackInfo?.color || '#10b981';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${certificateTitle}</title>
  <style>
    @page {
      size: letter landscape;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Georgia', serif;
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfccb 100%);
      width: 11in;
      height: 8.5in;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.75in;
    }

    .certificate {
      background: white;
      width: 100%;
      height: 100%;
      border: 8px solid ${trackColor};
      border-radius: 20px;
      padding: 60px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      position: relative;
      overflow: hidden;
    }

    .certificate::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 120px;
      background: linear-gradient(135deg, ${trackColor} 0%, ${trackColor}dd 100%);
      opacity: 0.1;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      position: relative;
      z-index: 1;
    }

    .logo {
      font-size: 48px;
      font-weight: bold;
      background: linear-gradient(135deg, ${trackColor} 0%, #059669 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 10px;
    }

    .subtitle {
      font-size: 18px;
      color: #666;
      font-style: italic;
    }

    .certificate-title {
      text-align: center;
      font-size: 36px;
      color: ${trackColor};
      margin: 40px 0 30px 0;
      font-weight: bold;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .recipient {
      text-align: center;
      margin: 40px 0;
    }

    .recipient-label {
      font-size: 16px;
      color: #666;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 3px;
    }

    .recipient-name {
      font-size: 48px;
      color: #1a1a1a;
      font-weight: bold;
      margin-bottom: 30px;
      border-bottom: 2px solid ${trackColor};
      display: inline-block;
      padding: 0 40px 10px 40px;
    }

    .description {
      text-align: center;
      font-size: 18px;
      color: #333;
      line-height: 1.8;
      max-width: 700px;
      margin: 0 auto 40px auto;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
    }

    .signature-block {
      text-align: center;
    }

    .signature-line {
      width: 200px;
      border-bottom: 2px solid #333;
      margin-bottom: 10px;
    }

    .signature-label {
      font-size: 14px;
      color: #666;
      font-style: italic;
    }

    .date {
      text-align: center;
    }

    .date-value {
      font-size: 16px;
      color: #333;
      font-weight: 600;
    }

    .date-label {
      font-size: 14px;
      color: #666;
      font-style: italic;
      margin-top: 5px;
    }

    .seal {
      position: absolute;
      bottom: 60px;
      right: 80px;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${trackColor} 0%, #059669 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 4px solid white;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    .seal-text {
      color: white;
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      line-height: 1.3;
    }

    @media print {
      body {
        background: white;
      }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logo">BakedBot AI</div>
      <div class="subtitle">Cannabis Marketing AI Academy</div>
    </div>

    <div class="certificate-title">${certificateTitle}</div>

    <div class="recipient">
      <div class="recipient-label">This certifies that</div>
      <div class="recipient-name">${userName}</div>
    </div>

    <div class="description">
      ${description}, demonstrating expertise in artificial intelligence, marketing automation,
      and data-driven cannabis commerce strategies.
    </div>

    <div class="footer">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Martez Reed</div>
        <div class="signature-label">Founder & CEO</div>
      </div>

      <div class="date">
        <div class="date-value">${dateString}</div>
        <div class="date-label">Date of Completion</div>
      </div>

      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Mrs. Parker</div>
        <div class="signature-label">Academy Director</div>
      </div>
    </div>

    <div class="seal">
      <div class="seal-text">
        CERTIFIED<br>
        ${trackInfo ? trackInfo.name.toUpperCase() : 'MASTER'}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
