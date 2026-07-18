param(
    [Parameter(Mandatory = $true)][string]$ApiUrl,
    [Parameter(Mandatory = $true)][string]$WebUrl
)

$ErrorActionPreference = "Stop"
$ApiUrl = $ApiUrl.TrimEnd("/")
$WebUrl = $WebUrl.TrimEnd("/")

foreach ($entry in @{ API = $ApiUrl; Web = $WebUrl }.GetEnumerator()) {
    $uri = [Uri]$entry.Value
    if ($uri.Scheme -ne "https" -or $uri.Host -in @("localhost", "127.0.0.1")) {
        throw "$($entry.Key) URL must be public HTTPS"
    }
}

Write-Host "[1/4] Web shell"
$webResponse = Invoke-WebRequest -Uri $WebUrl -Method Get
if ($webResponse.StatusCode -ne 200) { throw "Web returned $($webResponse.StatusCode)" }

Write-Host "[2/4] API health"
$health = Invoke-RestMethod -Uri "$ApiUrl/health" -Method Get
if ($health.status -ne "ok") { throw "API health was not ok" }

Write-Host "[3/4] Seed lesson"
$lessons = Invoke-RestMethod -Uri "$ApiUrl/api/lessons" -Method Get
$seed = $lessons | Where-Object title -eq "Python Lists and Tuples" | Select-Object -First 1
if (-not $seed) { throw "Seed lesson was not found" }

Write-Host "[4/4] Browser CORS preflight"
$headers = @{
    Origin = $WebUrl
    "Access-Control-Request-Method" = "GET"
}
$cors = Invoke-WebRequest -Uri "$ApiUrl/api/lessons" -Method Options -Headers $headers
$allowedOrigin = $cors.Headers["Access-Control-Allow-Origin"]
if ($allowedOrigin -ne $WebUrl -and $allowedOrigin -ne "*") {
    throw "API did not allow the web origin; received '$allowedOrigin'"
}

Write-Host "PASS read-only production smoke completed" -ForegroundColor Green
Write-Host "No sessions, messages, lessons, or reports were created or changed."
