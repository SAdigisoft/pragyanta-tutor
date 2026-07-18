param(
    [string]$BaseUrl = "http://localhost:8000"
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd("/")

function Invoke-Step {
    param([string]$Label, [scriptblock]$Action)
    Write-Host $Label
    try { & $Action } catch {
        Write-Error "Smoke test failed: $($_.Exception.Message)"
        exit 1
    }
}

Invoke-Step "[1/5] Health" {
    $script:health = Invoke-RestMethod -Uri "$BaseUrl/health"
    if ($health.status -ne "ok") { throw "Health status was not ok" }
}

Invoke-Step "[2/5] Seed lesson" {
    $script:lessons = Invoke-RestMethod -Uri "$BaseUrl/api/lessons"
    $script:lesson = $lessons | Where-Object title -eq "Python Lists and Tuples" | Select-Object -First 1
    if (-not $lesson) { throw "Seed lesson 'Python Lists and Tuples' was not found" }
}

Invoke-Step "[3/5] Student session" {
    $body = @{ lesson_id = $lesson.lesson_id; learner_level = "beginner" } | ConvertTo-Json
    $script:session = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/sessions" -ContentType "application/json" -Body $body
    if (-not $session.session_id) { throw "Session response had no session_id" }
}

Invoke-Step "[4/5] Grounded tutor turn" {
    $body = @{ message = "What is the difference between a list and a tuple?" } | ConvertTo-Json
    $script:chat = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/sessions/$($session.session_id)/chat" -ContentType "application/json" -Body $body
    if (-not $chat.tutor_messages -or $chat.tutor_messages.Count -lt 1) { throw "Tutor returned no messages" }
    if ($chat.misconception_update) { throw "A direct learner question was incorrectly classified as a misconception" }
}

Invoke-Step "[5/5] Teacher report" {
    $script:report = Invoke-RestMethod -Uri "$BaseUrl/api/lessons/$($lesson.lesson_id)/report"
    if ($null -eq $report.summary.total) { throw "Report response had no summary" }
}

Write-Host "PASS Pragyanta smoke journey completed at $BaseUrl" -ForegroundColor Green
Write-Host "lesson_id=$($lesson.lesson_id)"
Write-Host "session_id=$($session.session_id)"
