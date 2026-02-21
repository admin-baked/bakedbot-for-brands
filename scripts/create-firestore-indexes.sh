#!/bin/bash

# Create Firestore Indexes for Revenue Systems
# Last updated: 2026-02-21

set -e

PROJECT_ID="studio-567050101-bc6e8"

echo "Creating Firestore indexes for revenue systems..."
echo ""

# Create temporary index specification file
cat > /tmp/firestore-indexes.json <<'EOF'
{
  "indexes": [
    {
      "collectionGroup": "customers",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "orgId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "tierUpdatedAt",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "__name__",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "customers",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "orgId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "daysSinceLastOrder",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "__name__",
          "order": "ASCENDING"
        }
      ]
    }
  ]
}
EOF

echo "📊 Index 1: Tier Advancement"
echo "   Collection: customers"
echo "   Fields: orgId, tierUpdatedAt, __name__"
echo ""

echo "📊 Index 2: Churn Prediction"
echo "   Collection: customers"
echo "   Fields: orgId, daysSinceLastOrder, __name__"
echo ""

# Deploy indexes using firebase CLI (simpler)
firebase deploy --only firestore:indexes --project=$PROJECT_ID

echo ""
echo "✅ Index creation initiated!"
echo ""
echo "Note: Indexes typically take 2-5 minutes to build."
echo "Check status: https://console.firebase.google.com/project/$PROJECT_ID/firestore/indexes"
echo ""
echo "To verify when ready:"
echo "  gcloud firestore indexes list --project=$PROJECT_ID"

# Cleanup
rm /tmp/firestore-indexes.json
