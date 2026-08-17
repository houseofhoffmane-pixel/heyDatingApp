#!/usr/bin/env bash
#
# End-to-end smoke test — walks the golden path against a running server.
#
# Usage:
#   ./scripts/smoke.sh                        # http://localhost:3000
#   BASE=https://your.host ./scripts/smoke.sh
#
# What it does (all against a live API, no browser needed):
#   1. GET /health                            → { ok: true }
#   2. Onboards user A: phone → OTP → all profile fields → complete → active
#   3. Onboards user B the same way (opposite gender, both looking_for=everyone)
#   4. Sets locations 100m apart in NYC
#   5. A opens the feed and finds B
#   6. A likes B (with a photo anchor)
#   7. B opens the feed and finds A
#   8. B likes A back → match!
#   9. A sends a message; B reads it back
#
# Exits 0 on success; non-zero on the first failure and prints the offending
# response body so the terminal shows what's wrong.
#
# Requires: curl, jq. Uses the stub OTP code 123456 — if you changed
# OTP_STUB_CODE in .env, set OTP=... before running.

set -euo pipefail

BASE="${BASE:-http://localhost:3000}/api/v1"
OTP="${OTP:-123456}"
NYC_LAT="40.7194"
NYC_LNG="-73.9963"

RED=$'\033[0;31m'
GRN=$'\033[0;32m'
DIM=$'\033[0;90m'
NC=$'\033[0m'

# --- helpers ----------------------------------------------------
step() { printf "\n${GRN}▶ %s${NC}\n" "$*"; }
say()  { printf "  ${DIM}%s${NC}\n" "$*"; }
die()  { printf "${RED}✗ %s${NC}\n" "$*"; exit 1; }

# call METHOD PATH [BODY] [TOKEN]
call() {
  local method="$1" path="$2" body="${3:-}" token="${4:-}"
  local hdrs=(-H 'content-type: application/json')
  [ -n "$token" ] && hdrs+=(-H "authorization: Bearer $token")

  local url="${BASE}${path}"
  local tmp; tmp=$(mktemp)
  local status
  if [ -n "$body" ]; then
    status=$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" "${hdrs[@]}" -d "$body" "$url")
  else
    status=$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" "${hdrs[@]}" "$url")
  fi
  if [[ "$status" != 2* ]]; then
    printf "${RED}✗ %s %s → %s${NC}\n" "$method" "$path" "$status" >&2
    cat "$tmp" >&2
    rm -f "$tmp"
    exit 1
  fi
  cat "$tmp"; rm -f "$tmp"
}

onboard() {
  local phone="$1" name="$2" gender="$3"

  # 1) OTP request + verify.
  call POST /auth/otp/request "{\"phone_e164\":\"$phone\"}" >/dev/null
  local resp; resp=$(call POST /auth/otp/verify "{\"phone_e164\":\"$phone\",\"code\":\"$OTP\"}")
  local access refresh user_id
  access=$(echo "$resp" | jq -r '.accessToken')
  refresh=$(echo "$resp" | jq -r '.refreshToken')
  user_id=$(echo "$resp" | jq -r '.user.id')
  say "auth: user=$user_id"

  # 2) Name + DOB + rest of the required fields.
  call PATCH /onboarding/profile "{
    \"name\": \"$name\",
    \"dob\": \"1998-06-15\",
    \"ageConfirmed\": true,
    \"gender\": \"$gender\",
    \"lookingFor\": [\"everyone\"],
    \"relationshipIntent\": \"figuring_out\",
    \"heightCm\": 170,
    \"bio\": \"i love long walks to the fridge and back. \"
  }" "$access" >/dev/null

  # 3) Interests: pick the first 3.
  local interests
  interests=$(call GET /onboarding/interests-catalog '' "$access" | jq -c '[.data[0:3][].id]')
  call POST /onboarding/interests "{\"interest_ids\": $interests}" "$access" >/dev/null

  # 4) Prompt: pick the first, canned answer.
  local prompt_id
  prompt_id=$(call GET /onboarding/prompts-catalog '' "$access" | jq -r '.data[0].id')
  call POST /onboarding/prompts "{
    \"items\": [{\"prompt_id\": \"$prompt_id\", \"answer\": \"something specific about myself.\"}]
  }" "$access" >/dev/null

  # 5) 2 photos: bypass upload via signed-url + tiny buffer PUT.
  for i in 0 1; do
    local upresp key uploadUrl
    upresp=$(call POST /photos/upload-url '{"contentType":"image/jpeg"}' "$access")
    uploadUrl=$(echo "$upresp" | jq -r '.uploadUrl')
    key=$(echo "$upresp" | jq -r '.s3Key')
    # 1x1 JPEG stub — content isn't validated in the stub provider.
    printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00' | \
      curl -sS -X PUT -H 'content-type: image/jpeg' --data-binary @- "$uploadUrl" >/dev/null
    call POST /photos/confirm "{\"s3Key\":\"$key\"}" "$access" >/dev/null
  done
  say "photos: 2 uploaded"

  # 6) Complete onboarding → active.
  call POST /onboarding/complete '' "$access" >/dev/null

  # Return tokens + id in shell-parseable form.
  echo "$access|$refresh|$user_id"
}

# --- run --------------------------------------------------------

step "0. health"
call GET /health >/dev/null
say "server up"

step "1. onboard user A (woman)"
IFS='|' read -r A_TOK A_REF A_ID <<<"$(onboard '+15550100001' 'AlexTest' 'woman')"
call PUT /me/location "{\"lat\":$NYC_LAT,\"lng\":$NYC_LNG}" "$A_TOK" >/dev/null
say "A=$A_ID"

step "2. onboard user B (man)"
IFS='|' read -r B_TOK B_REF B_ID <<<"$(onboard '+15550100002' 'BlakeTest' 'man')"
call PUT /me/location "{\"lat\":$NYC_LAT,\"lng\":$NYC_LNG}" "$B_TOK" >/dev/null
say "B=$B_ID"

step "3. A opens feed — expect B present"
FEED_A=$(call GET '/discovery/feed?limit=20' '' "$A_TOK")
echo "$FEED_A" | jq -e --arg id "$B_ID" '.data | map(.userId) | any(. == $id)' >/dev/null \
  || die "B not in A's feed. Reason: $(echo "$FEED_A" | jq -r '.meta.reason // "unknown"')"
B_PHOTO=$(echo "$FEED_A" | jq -r --arg id "$B_ID" '.data[] | select(.userId==$id) | .photos[0].id')
say "B present, photo0=$B_PHOTO"

step "4. A likes B on that photo"
LR=$(call POST /likes "{
  \"toUserId\":\"$B_ID\",
  \"anchorType\":\"photo\",
  \"anchorPhotoId\":\"$B_PHOTO\"
}" "$A_TOK")
[ "$(echo "$LR" | jq -r '.matched')" = "false" ] || die "A→B liked but already matched — was DB not fresh?"
say "one-way like landed"

step "5. B opens feed — expect A present + theyLikedYou=true"
FEED_B=$(call GET '/discovery/feed?limit=20' '' "$B_TOK")
echo "$FEED_B" | jq -e --arg id "$A_ID" '.data[] | select(.userId==$id) | .theyLikedYou == true' >/dev/null \
  || die "A not surfaced as they-liked-you in B's feed"
A_PHOTO=$(echo "$FEED_B" | jq -r --arg id "$A_ID" '.data[] | select(.userId==$id) | .photos[0].id')

step "6. B likes A back → match"
BR=$(call POST /likes "{
  \"toUserId\":\"$A_ID\",
  \"anchorType\":\"photo\",
  \"anchorPhotoId\":\"$A_PHOTO\"
}" "$B_TOK")
[ "$(echo "$BR" | jq -r '.matched')" = "true" ] || die "B→A didn't yield a match"
MATCH_ID=$(echo "$BR" | jq -r '.matchId')
say "match=$MATCH_ID"

step "7. A sends a message"
call POST "/matches/$MATCH_ID/messages" "{
  \"body\":\"hey B — smoke test says hi\",
  \"kind\":\"text\",
  \"clientId\":\"smoke-1\"
}" "$A_TOK" >/dev/null

step "8. B reads the thread"
MSGS=$(call GET "/matches/$MATCH_ID/messages?limit=50" '' "$B_TOK")
COUNT=$(echo "$MSGS" | jq '.data | length')
[ "$COUNT" -ge 1 ] || die "B sees no messages"
say "B sees $COUNT message(s)"

step "9. B marks read"
call POST "/matches/$MATCH_ID/read" '{}' "$B_TOK" >/dev/null

printf "\n${GRN}✓ golden path OK.${NC}\n"
