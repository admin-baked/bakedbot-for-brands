/**
 * @fileoverview One-time script to generate and store embeddings for the entire codebase.
 *
 * This script reads all .ts and .tsx files in the src directory, generates a
 * vector embedding for each file's content using a text embedding model, and
 * stores the result in a 'codeEmbeddings' collection in Firestore.
 *
 * Usage:
 * npx tsx scripts/init-code-embeddings.ts
 */

import { createServerClient } from '@/firebase/server-client';
import admin from 'firebase-admin';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

const SRC_DIR = path.join(process.cwd(), 'src');
const FILE_PATTERN = '**/*.{ts,tsx}';
const EXCLUDE_PATTERNS = ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'];
const EMBEDDING_COLLECTION = 'codeEmbeddings';

/**
 * Generate embedding using Vertex AI REST API with Firebase Admin auth.
 * This is a simplified version for this script's purpose.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8';
  
  const app = admin.app();
  const credential = app.options.credential;
  if (!credential) {
    throw new Error('Firebase Admin SDK credential is not available.');
  }
  const token = await credential.getAccessToken();
  
  if (!token || !token.access_token) {
    throw new Error('Failed to get access token from Firebase Admin');
  }

  const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/text-embedding-004:predict`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ content: text }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Vertex AI API error for text chunk:`, errorText);
    throw new Error(`Vertex AI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.predictions[0].embeddings.values;
}

/**
 * Main function to generate and store embeddings for the codebase.
 */
async function generateCodeEmbeddings() {
  console.log('🚀 Starting codebase embedding generation...');

  try {
    const { firestore } = await createServerClient();
    const files = await glob(FILE_PATTERN, { cwd: SRC_DIR, ignore: EXCLUDE_PATTERNS });
    
    console.log(`Found ${files.length} files to process.`);

    const batch = firestore.batch();
    let batchCounter = 0;

    for (let i = 0; i < files.length; i++) {
      const fileRelativePath = files[i];
      const filePath = path.join(SRC_DIR, fileRelativePath);
      
      process.stdout.write(`[${i + 1}/${files.length}] Processing: ${fileRelativePath}... `);

      try {
        const content = await fs.readFile(filePath, 'utf-8');

        // Skip empty files
        if (!content.trim()) {
            process.stdout.write('⚪️ Skipped (empty)\n');
            continue;
        }

        const embedding = await generateEmbedding(content);

        // Use a hash of the file path as the document ID for idempotency
        const docId = Buffer.from(fileRelativePath).toString('base64');
        const docRef = firestore.collection(EMBEDDING_COLLECTION).doc(docId);

        batch.set(docRef, {
          path: fileRelativePath,
          content: content,
          embedding: embedding,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        batchCounter++;

        // Commit batch every 20 files to avoid exceeding limits
        if (batchCounter >= 20) {
          await batch.commit();
          batchCounter = 0;
        }
        
        process.stdout.write('✅\n');

      } catch (error: any) {
        process.stdout.write(`❌ Error: ${error.message}\n`);
      }
    }

    // Commit any remaining items in the last batch
    if (batchCounter > 0) {
      await batch.commit();
    }

    console.log('✅ Code embedding generation complete!');

  } catch (error) {
    console.error('A fatal error occurred:', error);
    process.exit(1);
  }
}

generateCodeEmbeddings();
