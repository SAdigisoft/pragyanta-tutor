param(
    [string]$ApiUrl = "https://pragyanta-api.example.com",
    [string]$WebUrl = "https://pragyanta-web.example.com"
)

$ErrorActionPreference = "Stop"
$script:failed = $false
$repoRoot = Split-Path -Parent $PSScriptRoot

function Pass([string]$Message) { Write-Host "PASS $Message" -ForegroundColor Green }
function Fail([string]$Message) {
    Write-Host "FAIL $Message" -ForegroundColor Red
    $script:failed = $true
}

function Test-PublicHttpsUrl([string]$Name, [string]$Value) {
    $parsed = $null
    if (-not [Uri]::TryCreate($Value, [UriKind]::Absolute, [ref]$parsed)) {
        Fail "$Name must be an absolute URL"
        return
    }
    if ($parsed.Scheme -ne "https") { Fail "$Name must use HTTPS"; return }
    if ($parsed.Host -in @("localhost", "127.0.0.1") -or $parsed.Host.EndsWith(".example.com")) {
        Fail "$Name still uses a placeholder or local host"
        return
    }
    Pass "$Name is a public HTTPS URL"
}

Test-PublicHttpsUrl "API URL" $ApiUrl
Test-PublicHttpsUrl "Web URL" $WebUrl

$requiredFiles = @(
    "render.yaml",
    "api/Dockerfile",
    "api/requirements.txt",
    "alembic.ini",
    "web/package-lock.json"
)
foreach ($relativePath in $requiredFiles) {
    if (Test-Path (Join-Path $repoRoot $relativePath)) { Pass "$relativePath exists" }
    else { Fail "$relativePath is missing" }
}

$migrationText = (Get-Content (Join-Path $repoRoot "alembic/versions/*.py") -Raw)
if ($migrationText -match "CREATE EXTENSION IF NOT EXISTS vector") {
    Pass "initial migration enables pgvector"
} else {
    Fail "no migration enables the vector extension"
}

$mainText = Get-Content (Join-Path $repoRoot "api/main.py") -Raw
if ($mainText -notmatch 'CORS_ORIGINS') {
    Fail "API does not read CORS_ORIGINS"
} else {
    Pass "API CORS origins are environment-configurable"
}

$databaseText = Get-Content (Join-Path $repoRoot "api/database.py") -Raw
if ($databaseText -match 'postgresql\+psycopg' -and $databaseText -notmatch 'replace|startswith') {
    Fail "managed postgresql:// URLs are not normalized to the installed Psycopg 3 driver"
} else {
    Pass "managed database URLs are compatible with the installed driver"
}

Push-Location $repoRoot
try {
    $trackedFiles = @(git ls-files)
} finally {
    Pop-Location
}
$trackedEnv = $trackedFiles | Where-Object {
    $_ -match '(^|/)(\.env|[^/]+\.env)$' -and $_ -notmatch '\.example$'
}
if ($trackedEnv) { Fail "a non-example environment file is tracked: $($trackedEnv -join ', ')" }
else { Pass "no secret-bearing environment file is tracked" }

$candidateFiles = Get-ChildItem $repoRoot -Recurse -File | Where-Object {
    $_.FullName -notmatch '[\\/](\.git|node_modules|dist|\.venv)[\\/]'
}
$openAiSecretPattern = "sk-" + "[A-Za-z0-9_-]{20,}"
$openAiMatches = $candidateFiles | Select-String -Pattern $openAiSecretPattern
if ($openAiMatches) { Fail "a value resembling an OpenAI secret exists in the repository" }
else { Pass "no value resembling an OpenAI secret was found" }

if ($script:failed) {
    Write-Host "Readiness checks failed. See deploy/DEPLOYMENT.md." -ForegroundColor Red
    exit 1
}

Write-Host "Deployment configuration is ready for a credentialed deploy." -ForegroundColor Green
