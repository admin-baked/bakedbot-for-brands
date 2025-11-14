
# Quick Setup Guide: Review Embeddings & Semantic Search

Follow these steps to enable semantic search on product reviews.

---

### **Step 1: Create the Firestore Vector Index**

First, you need to tell Firestore to create a vector index on the `embedding` field within the `productReviewEmbeddings` collection group.

1.  **Open Google Cloud Shell** or use a terminal with `gcloud` authenticated to your project.

2.  **Run the following command:**
    ```bash
    gcloud firestore indexes composite create \
      --collection-group=productReviewEmbeddings \
      --query-scope=COLLECTION \
      --field-config field-path=embedding,vector-config='{"dimension":"768","flat": {}}' \
      --project=studio-567050101-bc6e8
    ```

3.  **Wait for the index to build.** This can take 5-10 minutes. You can check the status in the Google Cloud Console under **Firestore > Composite Indexes**. Wait until the status is "Ready" before proceeding.

---

### **Step 2: Deploy the Cloud Functions**

Next, deploy the two Cloud Functions responsible for automatically updating and manually refreshing the embeddings.

1.  **Open a terminal** in your project's root directory.

2.  **Deploy the `onWrite` trigger function:**
    ```bash
    firebase deploy --only functions:updateReviewEmbeddingsOnChange
    ```

3.  **Deploy the manual refresh function:**
    ```bash
    firebase deploy --only functions:refreshAllReviewEmbeddings
    ```

---

### **Step 3: Generate Initial Embeddings for Existing Products**

Finally, run the one-time script to create embeddings for all the products that are already in your database.

1.  **In the same terminal, run the script:**
    ```bash
    npx tsx scripts/init-review-embeddings.ts
    ```

2.  **Monitor the output.** The script will log its progress for each product. It will look something like this:
    ```
    Starting one-time initialization of review embeddings...
    Found 50 products to process.
    - Processing product: prod-123
      ✅ Success! Generated embedding for 25 reviews.
    - Processing product: prod-456
      ⚪️ Skipped (no reviews found).
    - Processing product: prod-789
      ✅ Success! Generated embedding for 12 reviews.
    ...
    Initialization complete. All products have been processed.
    ```

---

## **✅ Setup Complete!**

Your application is now equipped with semantic search on product reviews. The `findProductsByReviewContent` tool is ready to be used in your AI flows.

    