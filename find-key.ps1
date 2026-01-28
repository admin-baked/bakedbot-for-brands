$TargetKeyString = "YOUR_API_KEY_HERE" # DO NOT COMMIT REAL KEYS
$Keys = Get-Content keys.json | ConvertFrom-Json

$Match = $Keys | Where-Object { $_.keyString -eq $TargetKeyString }

if ($Match) {
    Write-Host "Found matching key!"
    Write-Host "DisplayName: $($Match.displayName)"
    Write-Host "Name: $($Match.name)"
    Write-Host "UID: $($Match.uid)"
}
else {
    Write-Error "No key found matching $TargetKeyString"
    # Print all keys to debug
    $Keys | Select-Object displayName, uid, keyString | Format-Table
}
