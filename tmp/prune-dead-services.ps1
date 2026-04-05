$json = Get-Content 'tmp\dead_services.json' | ConvertFrom-Json
$dead = $json.dead
foreach ($f in $dead) {
    $path = Join-Path 'src\server\services' $f
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Output "Deleted $path"
    }
    
    $testName = $f.Replace('.ts', '.test.ts')
    $testPath = Join-Path 'src\server\services\__tests__' $testName
    if (Test-Path $testPath) {
        Remove-Item $testPath -Force
        Write-Output "Deleted test $testPath"
    }
}
