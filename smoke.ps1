param(
    [string]$BaseUrl = "http://localhost:8000",
    [switch]$ResetDemoData
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd("/")

function Invoke-Step {
    param([string]$Label, [scriptblock]$Action)
    Write-Host $Label
    try { & $Action } catch {
        throw "Smoke test failed: $($_.Exception.Message)"
    }
}

function Reset-DemoRecords {
    Write-Host "Resetting tagged demo records..."
    docker compose exec -T api python -m api.scripts.reset_demo_data
    if ($LASTEXITCODE -ne 0) { throw "Demo reset command failed" }
}

if ($ResetDemoData) { Reset-DemoRecords }

try {

Invoke-Step "[1/7] Health" {
    $script:health = Invoke-RestMethod -Uri "$BaseUrl/health"
    if ($health.status -ne "ok") { throw "Health status was not ok" }
}

Invoke-Step "[2/7] Showcase lesson" {
    $script:lessons = Invoke-RestMethod -Uri "$BaseUrl/api/lessons"
    $script:lesson = $lessons | Where-Object title -eq "Python Lists and Tuples" | Select-Object -First 1
    if (-not $lesson) { throw "Seed lesson 'Python Lists and Tuples' was not found" }
}

Invoke-Step "[3/7] Student session" {
    $body = @{ lesson_id = $lesson.lesson_id; learner_level = "beginner"; is_demo = $true } | ConvertTo-Json
    $script:session = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/sessions" -ContentType "application/json" -Body $body
    if (-not $session.session_id) { throw "Session response had no session_id" }
}

Invoke-Step "[4/7] Grounded tutor turn" {
    $body = @{ message = "What is the difference between a list and a tuple?" } | ConvertTo-Json
    $script:chat = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/sessions/$($session.session_id)/chat" -ContentType "application/json" -Body $body
    if (-not $chat.tutor_messages -or $chat.tutor_messages.Count -lt 1) { throw "Tutor returned no messages" }
    if ($chat.misconception_update) { throw "A direct learner question was incorrectly classified as a misconception" }
}

Invoke-Step "[5/7] Misconception detection" {
    $body = @{ message = "A tuple is better because we can modify its values later." } | ConvertTo-Json
    $script:wrong = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/sessions/$($session.session_id)/chat" -ContentType "application/json" -Body $body
    if ($wrong.misconception_update.status -ne "open") { throw "Known misconception was not opened" }
    if (@($wrong.tutor_messages | Where-Object msg_type -eq "verification_question").Count -ne 1) { throw "Verification question was not returned" }
}

Invoke-Step "[6/7] Understanding verification" {
    $body = @{ message = "It raises an error because a tuple is immutable and cannot be changed." } | ConvertTo-Json
    $script:verified = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/sessions/$($session.session_id)/chat" -ContentType "application/json" -Body $body
    if ($verified.misconception_update.status -ne "resolved") { throw "Known misconception was not resolved" }
}

Invoke-Step "[7/7] Stored teacher report" {
    $script:report = Invoke-RestMethod -Uri "$BaseUrl/api/lessons/$($lesson.lesson_id)/report"
    if ($report.summary.resolved -lt 1) { throw "Resolved misconception was not stored in the report" }
}

Write-Host "PASS Pragyanta smoke journey completed at $BaseUrl" -ForegroundColor Green
Write-Host "lesson_id=$($lesson.lesson_id)"
Write-Host "session_id=$($session.session_id)"
} finally {
    if ($ResetDemoData) { Reset-DemoRecords }
}
