$ProjectNumber = "1016399212569"
$KeyId = "fd5587f7-4866-4c77-941b-740afbe43335"
$Url = "https://apikeys.googleapis.com/v2/projects/$ProjectNumber/locations/global/keys/$KeyId"

# 1. Get Access Token
Write-Host "Getting access token..."
$AccessToken = gcloud auth print-access-token
$Headers = @{
    "Authorization" = "Bearer $AccessToken"
    "Content-Type"  = "application/json"
}

# 2. Get current key details (for ETag)
Write-Host "Fetching current key details..."
try {
    $KeyDetails = Invoke-RestMethod -Uri $Url -Method Get -Headers $Headers
    $ETag = $KeyDetails.etag
    Write-Host "Current ETag: $ETag"
}
catch {
    Write-Error "Failed to fetch key details: $_"
    exit 1
}

# 3. Update Key Restrictions
Write-Host "Updating key restrictions..."
$UpdateUrl = "$Url`?updateMask=restrictions"
$Body = @{
    etag         = $ETag
    restrictions = @{
        browserKeyRestrictions = @{
            allowedReferrers = @(
                "https://bakedbot.ai/*",
                "https://*.bakedbot.ai/*",
                "https://bakedbot-for-brands--studio-567050101-bc6e8.us-east4.hosted.app/*",
                "http://localhost:3000/*"
            )
        }
    }
} | ConvertTo-Json -Depth 5

try {
    $Response = Invoke-RestMethod -Uri $UpdateUrl -Method Patch -Headers $Headers -Body $Body
    Write-Host "Successfully updated key restrictions!"
    Write-Host "New Allowed Referrers:"
    $Response.restrictions.browserKeyRestrictions.allowedReferrers
}
catch {
    Write-Error "Failed to update key: $_"
    # Print detailed error if available
    if ($_.Exception.Response) {
        $Stream = $_.Exception.Response.GetResponseStream()
        $Reader = New-Object System.IO.StreamReader($Stream)
        Write-Host $Reader.ReadToEnd()
    }
    exit 1
}
