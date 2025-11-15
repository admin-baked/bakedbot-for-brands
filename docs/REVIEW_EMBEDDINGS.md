

# AI Review Embeddings & Semantic Search

This document outlines the architecture and implementation of the product review embedding system, which enables powerful semantic search capabilities across customer feedback.

## 1. Overview

The core idea is to create a single, representative vector embedding for each product based on the *entirety* of its customer reviews. Instead of embedding every single review (which would be costly and complex), we use an AI model to first summarize all reviews for a product into a concise paragraph. Then, we generate one embedding from that summary.

This approach provides a cost-effective, high-level semantic representation of customer sentiment and feedback for each product.

### Key Benefits

-   **Cost-Effective**: Only one embedding is stored per product, regardless of the number of reviews.
-   **High Performance**: Vector search queries a small, dedicated collection (`productReviewEmbeddings`), making it very fast.
-   **Semantic Power**: Enables searching for products based on what customers *say* about them (e.g., "helps with sleep," "tastes like citrus"), not just keyword matching.
-   **Automated**: Cloud Functions ensure that embeddings are automatically regenerated whenever reviews are added, updated, or deleted, keeping the search index fresh.

## 2. Architecture

The system consists of four main components:

1.  **AI Tool: `generateReviewEmbeddings`**:
    -   Fetches all reviews for a specific `productId`.
    -   Uses a Genkit prompt to have an LLM (Gemini 1.5 Flash) summarize the review text.
    -   Uses the `text-embedding-004` model to create a vector embedding from the AI-generated summary.
    -   Saves this embedding, the summary, and the review count to a subcollection on the product document: `products/{productId}/productReviewEmbeddings/summary`.

2.  **Cloud Function: `updateReviewEmbeddingsOnChange`**:
    -   A Firestore-triggered function that listens for any write (`create`, `update`, `delete`) on `products/{productId}/reviews/{reviewId}`.
    -   When triggered, it calls the `generateReviewEmbeddings` tool for the affected `productId`, ensuring the summary and embedding are always up-to-date.

3.  **AI Tool: `findProductsByReviewContent`**:
    -   Takes a natural language query (e.g., "something for pain relief") as input.
    -   Generates an embedding for the user's query.
    -   Performs a vector search (findNearest) against the `productReviewEmbeddings` collection group to find the most semantically similar review summaries.
    -   Returns the full product documents associated with the matching embeddings.

4.  **Initialization Script: `init-review-embeddings.ts`**:
    -   A one-time, executable script (`npx tsx scripts/init-review-embeddings.ts`).
    -   Iterates through all existing products in the `products` collection.
    -   Calls the `generateReviewEmbeddings` tool for each one to backfill the initial embeddings.

## 3. Data Model

The embedding is stored in a subcollection on the `Product` document to keep related data together and allow for easy retrieval.

-   **Product Document**: `/products/{productId}`
-   **Embedding Document**: `/products/{productId}/productReviewEmbeddings/summary`

```json
// /products/{productId}/productReviewEmbeddings/summary
{
  "productId": "prod-123",
  "reviewCount": 25,
  "summary": "Customers consistently praise this product for its relaxing effects, often mentioning that it helps with sleep and anxiety. Many appreciate the subtle, earthy flavor. A few users noted that the effects can take a while to kick in.",
  "updatedAt": "2024-01-01T12:00:00Z",
  "embedding": [0.012, -0.045, ... , 0.033] // 768-dimension vector
}
```

## 4. How to Use

Once the system is set up (see `REVIEW_EMBEDDINGS_SETUP.md`), you can use the `findProductsByReviewContent` tool within any Genkit flow or directly in your application's server-side code.

### Example: Integrating with the Chatbot

The chatbot can now provide much more nuanced recommendations by using this tool.

```typescript
// In your chatbot's recommendation logic:
import { findProductsByReviewContent } from '@/ai/tools';

async function getRecommendations(userQuery: string) {
  // The user might say "find me something that helps with sleep"
  const products = await findProductsByReviewContent.run({
    query: userQuery,
    limit: 3
  });

  if (products.length > 0) {
    // Return the product cards to the user
    return `I found a few products that other customers say are great for that:`;
  } else {
    return "I couldn't find any products where customers mentioned that. Would you like to try another search?";
  }
}
```

