# Query Firestore via REST API to check build monitor records

$projectId = "studio-567050101-bc6e8"
$collection = "firebase_build_monitor"

# Get access token
$tokenResponse = gcloud auth application-default print-access-token 2>$null
$accessToken = $tokenResponse.Trim()

if (-not $accessToken) {
    Write-Error "Failed to get access token"
    exit 1
}

Write-Host "📊 Querying firebase_build_monitor collection..."
Write-Host ""

# Query recent builds
$url = "https://firestore.googleapis.com/v1/projects/$projectId/databases/(default)/documents/$collection?pageSize=20"

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -ErrorAction Stop

    if ($response.documents) {
        Write-Host "✅ Found $($response.documents.Count) records`n"

        foreach ($doc in $response.documents) {
            $fields = $doc.fields
            $commitHash = $fields.commitHash.stringValue
            $status = $fields.status.stringValue
            $timestamp = $fields.timestamp.timestampValue
            $notifiedEmail = $fields.notificationsSent.mapValue.fields.email.booleanValue
            $notifiedSlack = $fields.notificationsSent.mapValue.fields.slack.booleanValue

            Write-Host "[RECORD] $commitHash | $status"
            Write-Host "  Time: $timestamp"
            Write-Host "  Email: $(if($notifiedEmail) {'✅'} else {'❌'})"
            Write-Host "  Slack: $(if($notifiedSlack) {'✅'} else {'❌'})"
            if ($fields.errorMessage) {
                $errorMsg = $fields.errorMessage.stringValue
                Write-Host "  Error: $($errorMsg.Substring(0, [Math]::Min(100, $errorMsg.Length)))"
            }
            Write-Host ""
        }
    } else {
        Write-Host "⚠️  No documents found"
    }
} catch {
    Write-Error "Query failed: $($_.Exception.Message)"
    exit 1
}
