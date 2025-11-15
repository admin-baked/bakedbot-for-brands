# AI-Powered Codebase Search

This document outlines the architecture and setup for enabling semantic search across the entire application codebase. This powerful tool allows developers to find code based on natural language concepts rather than simple keyword matching.

## 1. Overview

The core idea is to treat our codebase as a set of documents that can be understood by an AI. We accomplish this by generating a "vector embedding" for each source file. An embedding is a numerical representation (a list of numbers) that captures the semantic meaning of the code in that file.

Once we have these embeddings, we can:
1.  Take a developer's natural language query (e.g., "logic for handling user login").
2.  Generate an embedding for that query.
3.  Use a vector search to find the code files whose embeddings are most similar to the query's embedding.

This allows us to find relevant code snippets even if they don't contain the exact keywords in the query.

### Key Benefits

-   **Conceptual Search**: Find code based on what it *does*, not just the words it contains.
-   **Faster Onboarding**: New developers can quickly find relevant parts of the codebase without needing to know the exact file names or function names.
-   **Improved Maintainability**: Easily discover all files related to a specific feature (e.g., "everything related to payment processing") when making changes.

## 2. Architecture

The system consists of three main parts:

1.  **Initialization Script (`scripts/init-code-embeddings.ts`)**:
    -   A one-time, executable script that reads all `.ts` and `.tsx` files in the `src/` directory.
    -   For each file, it generates a vector embedding of its content using a text embedding model.
    -   It stores each embedding along with the file path and content in a new Firestore collection: `codeEmbeddings`.

2.  **Firestore Vector Index**:
    -   A specialized index on the `codeEmbeddings` collection.
    -   This index is required by Firestore to perform high-speed vector similarity searches. It must be created via a `gcloud` command.

3.  **Querying (Future Implementation)**:
    -   A search interface (which could be a CLI tool or a UI in the admin dashboard) would take a user's query, generate an embedding for it, and use Firestore's `findNearest` functionality to find the most relevant files.

## 3. Setup Steps

### Step 1: Create the Firestore Vector Index

You must create a vector index on the `embedding` field in the `codeEmbeddings` collection.

1.  **Open Google Cloud Shell** or a terminal with `gcloud` authenticated to your project.

2.  **Run the following command:**
    ```bash
    gcloud firestore indexes composite create \
      --collection-group=codeEmbeddings \
      --query-scope=COLLECTION \
      --field-config field-path=embedding,vector-config='{"dimension":"768","flat": {}}' \
      --project=studio-567050101-bc6e8
    ```
    *Note: The dimension `768` corresponds to the output size of the `text-embedding-004` model.*

3.  **Wait for the index to build.** This can take 5-10 minutes. You can check the status in the Google Cloud Console under **Firestore > Composite Indexes**. Wait until the status is "Ready".

### Step 2: Generate Initial Embeddings

Run the one-time script to read your local codebase and populate the Firestore collection.

1.  **In your project's root directory, run:**
    ```bash
    npx tsx scripts/init-code-embeddings.ts
    ```

2.  **Monitor the output.** The script will log its progress as it processes each file.
    ```
    🚀 Starting codebase embedding generation...
    Found 58 files to process.
    [1/58] Processing: src/app/page.tsx... ✅
    [2/58] Processing: src/app/layout.tsx... ✅
    ...
    ✅ Code embedding generation complete!
    ```

---

## ✅ Setup Complete!

Your codebase is now indexed and ready for semantic search. The next step would be to build a UI or CLI tool that allows developers to perform queries against the `codeEmbeddings` collection.
