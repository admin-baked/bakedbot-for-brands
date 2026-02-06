/**
 * Seed Firestore with help article metadata
 * Run with: npx tsx scripts/seed-help-articles.ts
 */

import { createServerClient } from '../src/firebase/server-client';
import { articles } from '../src/content/help/_index';

async function seedHelpArticles() {
  console.log('🌱 Seeding help articles to Firestore...\n');

  const { firestore: db } = await createServerClient();
  let successCount = 0;
  let errorCount = 0;

  for (const [key, article] of Object.entries(articles)) {
    try {
      // Replace / with -- for Firestore doc ID (can't contain /)
      const docId = key.replace(/\//g, '--');
      const docRef = db.collection('helpArticles').doc(docId);

      // Check if document already exists
      const existingDoc = await docRef.get();

      if (existingDoc.exists) {
        // Update metadata but preserve views and ratings
        await docRef.update({
          slug: article.slug,
          category: article.category,
          title: article.title,
          description: article.description,
          roles: article.roles,
          tags: article.tags,
          difficulty: article.difficulty,
          estimatedTime: article.estimatedTime,
          filePath: article.filePath,
          lastUpdated: new Date(article.lastUpdated),
          author: article.author,
        });
        console.log(`✅ Updated: ${article.title}`);
      } else {
        // Create new document with initial values
        await docRef.set({
          slug: article.slug,
          category: article.category,
          title: article.title,
          description: article.description,
          roles: article.roles,
          tags: article.tags,
          difficulty: article.difficulty,
          estimatedTime: article.estimatedTime,
          filePath: article.filePath,
          lastUpdated: new Date(article.lastUpdated),
          author: article.author,
          views: 0,
          avgRating: 0,
          totalRatings: 0,
          createdAt: new Date(),
        });
        console.log(`✨ Created: ${article.title}`);
      }

      successCount++;
    } catch (error) {
      console.error(`❌ Error seeding ${key}:`, error);
      errorCount++;
    }
  }

  console.log(`\n✅ Seeding complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Total articles: ${Object.keys(articles).length}`);
}

// Run the seed function
seedHelpArticles()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
