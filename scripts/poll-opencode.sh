#!/bin/bash
# Bug Hunt Poller - Wakes opencode agent every 30 minutes
# Usage: ./poll-opencode.sh [interval_minutes]

INTERVAL=${1:-30}
CRON_SECRET=${CRON_SECRET:-""}
AGENT_URL="https://bakedbot.ai/api/agent-tasks"

echo "🔄 Bug Hunt Poller started (every $INTERVAL minutes)"
echo "Press Ctrl+C to stop"

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$TIMESTAMP] Checking for bug hunt task..."
    
    if [ -n "$CRON_SECRET" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$AGENT_URL" \
            -H "Authorization: Bearer $CRON_SECRET" \
            -H "Content-Type: application/json" \
            -d '{
                "title": "Bug hunt session triggered by poller",
                "body": "Scheduled bug hunt session - continue scanning for vulnerabilities",
                "category": "bug",
                "priority": "high",
                "reportedBy": "poller"
            }')
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        
        if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
            echo "✅ Task created successfully"
        else
            echo "⚠️ Task creation returned: $HTTP_CODE"
        fi
    else
        echo "⚠️ CRON_SECRET not set - skipping agent trigger"
    fi
    
    echo "💤 Sleeping for $INTERVAL minutes..."
    sleep "$((INTERVAL * 60))"
done
