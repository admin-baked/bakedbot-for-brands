#!/bin/bash

# Configure Loyalty Settings for org_thrive_syracuse
# Uses gcloud firestore directly

PROJECT_ID="studio-567050101-bc6e8"
ORG_ID="org_thrive_syracuse"

echo "🎁 Configuring Loyalty Settings"
echo "════════════════════════════════"
echo "Organization: $ORG_ID"
echo ""

# Create temporary JSON file
cat > /tmp/loyalty-settings.json <<'EOF'
{
  "enabled": true,
  "programName": "Rewards Program",
  "pointsPerDollar": 1,
  "dollarPerPoint": 0.01,
  "minPointsToRedeem": 100,
  "maxPointsPerOrder": 5000,
  "tiers": [
    {
      "name": "Bronze",
      "requiredSpend": 0,
      "multiplier": 1,
      "benefits": ["Earn 1 point per dollar"]
    },
    {
      "name": "Silver",
      "requiredSpend": 500,
      "multiplier": 1.2,
      "benefits": ["Earn 1.2 points per dollar", "Birthday bonus"]
    },
    {
      "name": "Gold",
      "requiredSpend": 1000,
      "multiplier": 1.5,
      "benefits": ["Earn 1.5 points per dollar", "Birthday bonus", "Exclusive deals"]
    },
    {
      "name": "Platinum",
      "requiredSpend": 2500,
      "multiplier": 2,
      "benefits": ["Earn 2 points per dollar", "Birthday bonus", "Exclusive deals", "VIP events"]
    }
  ],
  "tierInactivityDays": 180
}
EOF

# Import to Firestore
gcloud firestore import gs://temp-bucket/loyalty-settings \
  --collection-ids=settings \
  --project=$PROJECT_ID \
  --async

# Actually, let's use a direct approach with curl to Firestore REST API
FIRESTORE_URL="https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents/tenants/$ORG_ID/settings/loyalty"

# Get access token
ACCESS_TOKEN=$(gcloud auth application-default print-access-token)

echo "Creating loyalty settings document..."
curl -X PATCH "$FIRESTORE_URL" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/loyalty-settings.json

echo ""
echo "✅ Loyalty settings configured!"

# Cleanup
rm /tmp/loyalty-settings.json
