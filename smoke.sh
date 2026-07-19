#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8000}"
BASE_URL="${BASE_URL%/}"
SMOKE_TMP="$(mktemp -d)"
trap 'rm -rf -- "$SMOKE_TMP"' EXIT

PYTHON_BIN="${PYTHON_BIN:-python3}"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then PYTHON_BIN=python; fi

request() {
  local method="$1" url="$2" output="$3" body="${4:-}"
  local status
  if [[ -n "$body" ]]; then
    status="$(curl --silent --show-error --output "$output" --write-out '%{http_code}' \
      --request "$method" --header 'Content-Type: application/json' --data "$body" "$url")"
  else
    status="$(curl --silent --show-error --output "$output" --write-out '%{http_code}' \
      --request "$method" "$url")"
  fi
  if [[ "$status" -lt 200 || "$status" -ge 300 ]]; then
    echo "FAIL $method $url returned HTTP $status" >&2
    "$PYTHON_BIN" -m json.tool "$output" 2>/dev/null || sed -n '1,20p' "$output" >&2
    exit 1
  fi
}

json_value() {
  "$PYTHON_BIN" -c 'import json,sys; data=json.load(open(sys.argv[1], encoding="utf-8")); print(eval(sys.argv[2], {"data": data}))' "$1" "$2"
}

echo "[1/7] Health"
request GET "$BASE_URL/health" "$SMOKE_TMP/health.json"
[[ "$(json_value "$SMOKE_TMP/health.json" 'data["status"]')" == "ok" ]]

echo "[2/7] Showcase lesson"
request GET "$BASE_URL/api/lessons" "$SMOKE_TMP/lessons.json"
LESSON_ID="$(json_value "$SMOKE_TMP/lessons.json" 'next(x["lesson_id"] for x in data if x["title"] == "Python Lists and Tuples")')"

echo "[3/7] Student session"
request POST "$BASE_URL/api/sessions" "$SMOKE_TMP/session.json" \
  "{\"lesson_id\":\"$LESSON_ID\",\"learner_level\":\"beginner\"}"
SESSION_ID="$(json_value "$SMOKE_TMP/session.json" 'data["session_id"]')"

echo "[4/7] Grounded tutor turn"
request POST "$BASE_URL/api/sessions/$SESSION_ID/chat" "$SMOKE_TMP/chat.json" \
  '{"message":"What is the difference between a list and a tuple?"}'
[[ "$(json_value "$SMOKE_TMP/chat.json" 'len(data["tutor_messages"])')" -ge 1 ]]
[[ "$(json_value "$SMOKE_TMP/chat.json" 'data.get("misconception_update") is None')" == "True" ]]

echo "[5/7] Misconception detection"
request POST "$BASE_URL/api/sessions/$SESSION_ID/chat" "$SMOKE_TMP/wrong.json" \
  '{"message":"A tuple is better because we can modify its values later."}'
[[ "$(json_value "$SMOKE_TMP/wrong.json" 'data["misconception_update"]["status"]')" == "open" ]]
[[ "$(json_value "$SMOKE_TMP/wrong.json" 'sum(x["msg_type"] == "verification_question" for x in data["tutor_messages"])')" == "1" ]]

echo "[6/7] Understanding verification"
request POST "$BASE_URL/api/sessions/$SESSION_ID/chat" "$SMOKE_TMP/verified.json" \
  '{"message":"It raises an error because a tuple is immutable and cannot be changed."}'
[[ "$(json_value "$SMOKE_TMP/verified.json" 'data["misconception_update"]["status"]')" == "resolved" ]]

echo "[7/7] Stored teacher report"
request GET "$BASE_URL/api/lessons/$LESSON_ID/report" "$SMOKE_TMP/report.json"
[[ "$(json_value "$SMOKE_TMP/report.json" 'data["summary"]["resolved"]')" -ge 1 ]]

echo "PASS Pragyanta smoke journey completed at $BASE_URL"
echo "lesson_id=$LESSON_ID"
echo "session_id=$SESSION_ID"
