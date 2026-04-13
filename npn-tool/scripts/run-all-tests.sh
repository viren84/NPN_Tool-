#!/bin/bash
# Full API test suite for NPN Filing Tool
# Run: bash scripts/run-all-tests.sh

COOKIE="-b /tmp/npn-cookies.txt"
BASE="http://localhost:3000/api"
PASS=0; FAIL=0; FAILURES=""

post() { printf '%s' "$2" > /tmp/p.json; curl -s -o /tmp/resp.txt -w "%{http_code}" $COOKIE -X POST "$1" -H "Content-Type: application/json" --data @/tmp/p.json; }
put()  { printf '%s' "$2" > /tmp/p.json; curl -s -o /tmp/resp.txt -w "%{http_code}" $COOKIE -X PUT  "$1" -H "Content-Type: application/json" --data @/tmp/p.json; }
get()  { curl -s -o /tmp/resp.txt -w "%{http_code}" $COOKIE "$1"; }
del()  { curl -s -o /tmp/resp.txt -w "%{http_code}" $COOKIE -X DELETE "$1"; }
post_nc() { printf '%s' "$2" > /tmp/p.json; curl -s -o /tmp/resp.txt -w "%{http_code}" -X POST "$1" -H "Content-Type: application/json" --data @/tmp/p.json; }
get_nc()  { curl -s -o /tmp/resp.txt -w "%{http_code}" "$1"; }

t() {
  if [ "$2" = "$3" ]; then PASS=$((PASS+1));
  else FAIL=$((FAIL+1)); FAILURES="$FAILURES"$'\n'"  FAIL: $1 (exp $2, got $3)"; fi
}

echo "============================================================"
echo "  FULL API TEST SUITE — $(date)"
echo "============================================================"

# ---- PHASE 1: AUTH (8) ----
echo ""
echo "[Phase 1] Auth — 8 tests"
t "auth/me authed"              "200"  "$(get $BASE/auth/me)"
t "auth/me no-cookie"           "401"  "$(get_nc $BASE/auth/me)"
t "auth/login valid"            "200"  "$(post_nc $BASE/auth/login '{"username":"testadmin","password":"test1234"}')"
t "auth/login invalid"          "401"  "$(post_nc $BASE/auth/login '{"username":"testadmin","password":"wrong"}')"
t "auth/login missing fields"   "400"  "$(post_nc $BASE/auth/login '{}')"
t "auth/login empty body"       "400"  "$(post_nc $BASE/auth/login '')"
t "auth/register duplicate"     "409"  "$(post_nc $BASE/auth/register '{"username":"testadmin","password":"test1234","name":"D"}')"
t "auth/register short pw"      "400"  "$(post_nc $BASE/auth/register '{"username":"shortpw","password":"1","name":"S"}')"

# ---- PHASE 2: LICENCES CRUD (12) ----
echo ""
echo "[Phase 2] Licences CRUD — 12 tests"
CODE=$(post $BASE/licences '{"licenceNumber":"80005001","productName":"Full-Suite 1"}')
ID1=$(cat /tmp/resp.txt | node -e "try{console.log(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).id||\"\")}catch{}")
t "licences create 201"         "201"  "$CODE"
t "licences created has id"     "yes"  "$([ -n "$ID1" ] && echo yes || echo no)"
t "licences get single"         "200"  "$(get $BASE/licences/$ID1)"
t "licences get list"           "200"  "$(get $BASE/licences)"
t "licences update"             "200"  "$(put $BASE/licences/$ID1 '{"productName":"Updated"}')"
t "licences missing name"       "400"  "$(post $BASE/licences '{"licenceNumber":"99999999"}')"
t "licences empty body"         "400"  "$(post $BASE/licences '')"
t "licences bad json"           "400"  "$(post $BASE/licences '{bad}')"
t "licences bool name"          "400"  "$(post $BASE/licences '{"productName":true}')"
t "licences negative number"    "400"  "$(post $BASE/licences '{"licenceNumber":"-1","productName":"N"}')"
t "licences delete"             "200"  "$(del $BASE/licences/$ID1)"
t "licences delete already gone" "404" "$(del $BASE/licences/$ID1)"

# ---- PHASE 3: SEARCH + EXPORT + SYNC (10) ----
echo ""
echo "[Phase 3] Search + Export + Sync — 10 tests"
t "search by NPN"               "200"  "$(get "$BASE/search?q=80120933")"
t "search by name"              "200"  "$(get "$BASE/search?q=elder")"
t "search empty query"          "200"  "$(get "$BASE/search?q=")"
t "search XSS chars"            "200"  "$(get "$BASE/search?q=%3Cscript%3E")"
t "export CSV all"              "200"  "$(get $BASE/licences/export)"
t "export Excel"                "200"  "$(get $BASE/licences/export-excel)"

EXIST_ID=$(get $BASE/licences > /dev/null; cat /tmp/resp.txt | node -e "console.log(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\"))[0]?.id||\"\")")
t "export CSV single"           "200"  "$(get $BASE/licences/$EXIST_ID/export)"
SYNC_STATUS=$(curl -s -o /tmp/resp.txt -w "%{http_code}" $COOKIE -X POST $BASE/sync/lnhpd/$EXIST_ID)
t "sync valid"                  "200"  "$SYNC_STATUS"
SYNC_OK=$(cat /tmp/resp.txt | node -e "try{console.log(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).success)}catch{console.log(\"err\")}")
t "sync success flag"           "true"  "$SYNC_OK"
t "sync bad id"                 "404"  "$(curl -s -o /dev/null -w '%{http_code}' $COOKIE -X POST $BASE/sync/lnhpd/00000000-0000-0000-0000-000000000000)"

# ---- PHASE 4: BULK DELETE (5) ----
echo ""
echo "[Phase 4] Bulk Delete — 5 tests"
post $BASE/licences '{"licenceNumber":"80005101","productName":"Bulk 1"}' > /dev/null
BULK1=$(cat /tmp/resp.txt | node -e "try{console.log(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).id)}catch{}")
post $BASE/licences '{"licenceNumber":"80005102","productName":"Bulk 2"}' > /dev/null
BULK2=$(cat /tmp/resp.txt | node -e "try{console.log(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).id)}catch{}")
printf '{"ids":["%s","%s"]}' "$BULK1" "$BULK2" > /tmp/p.json
curl -s -o /tmp/resp.txt $COOKIE -X POST $BASE/licences/bulk-delete -H "Content-Type: application/json" --data @/tmp/p.json
BD_CNT=$(cat /tmp/resp.txt | node -e "try{console.log(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).deleted)}catch{}")
t "bulk delete 2 items"         "2"    "$BD_CNT"
t "bulk delete empty array"     "400"  "$(post $BASE/licences/bulk-delete '{"ids":[]}')"

post $BASE/licences/bulk-delete '{"ids":["00000000-0000-0000-0000-000000000000"]}' > /dev/null
LEAK=$(grep -o 'C:..Users' /tmp/resp.txt | head -1)
t "bulk delete no path leak"    "clean" "$([ -z "$LEAK" ] && echo clean || echo leaked)"
t "bulk delete non-array ids"   "400"  "$(post $BASE/licences/bulk-delete '{"ids":"nope"}')"
t "bulk delete missing ids key" "400"  "$(post $BASE/licences/bulk-delete '{}')"

# ---- PHASE 5: UNAUTHORIZED (10) ----
echo ""
echo "[Phase 5] Unauthorized — 10 tests"
for ep in "/licences" "/search?q=x" "/licences/export" "/licences/export-excel" "/settings" "/company" "/applications" "/ingredients" "/ingredient-submissions" "/audit-log"; do
  t "no-cookie $ep"             "401"  "$(get_nc $BASE$ep)"
done

# ---- PHASE 6: BUG FIXES — 16 new + 3 orig (21) ----
echo ""
echo "[Phase 6] Bug Fixes — 21 tests"

# #1 Company XSS
post $BASE/company '{"legalName":"<script>evil</script>Acme"}' > /dev/null
LEGAL=$(cat /tmp/resp.txt | node -e "try{console.log(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).legalName||\"\")}catch{console.log(\"err\")}")
if echo "$LEGAL" | grep -q '<script>'; then
  t "Bug#1 company XSS stripped" "clean" "leaked"
else
  t "Bug#1 company XSS stripped" "clean" "clean"
fi
put $BASE/company '{"legalName":"UV International Traders Inc"}' > /dev/null

t "Bug#2 scan-folder blocks System32"   "403"  "$(post $BASE/upload/scan-folder '{"folderPath":"C:/Windows/System32"}')"
t "Bug#3 DELETE bad licence 404"        "404"  "$(del $BASE/licences/00000000-0000-0000-0000-000000000000)"
t "Bug#4 PUT bad licence 404"           "404"  "$(put $BASE/licences/00000000-0000-0000-0000-000000000000 '{"productName":"X"}')"
t "Bug#5 empty body 400"                "400"  "$(post $BASE/licences '')"
t "Bug#6 invalid JSON 400"              "400"  "$(post $BASE/licences '{bad}')"
t "Bug#7 bool productName 400"          "400"  "$(post $BASE/licences '{"productName":true}')"
t "Bug#8 numeric password 400"          "400"  "$(post_nc $BASE/auth/login '{"username":"testadmin","password":12345}')"

APP_ID=$(get $BASE/applications > /dev/null; cat /tmp/resp.txt | node -e "console.log(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\"))[0]?.id||\"\")")
t "Bug#9a ingredient DELETE 404"        "404"  "$(del $BASE/applications/$APP_ID/ingredients/00000000-0000-0000-0000-000000000000)"
t "Bug#9b claim DELETE 404"             "404"  "$(del $BASE/applications/$APP_ID/claims/00000000-0000-0000-0000-000000000000)"
t "Bug#9c dosage DELETE 404"            "404"  "$(del $BASE/applications/$APP_ID/dosage/00000000-0000-0000-0000-000000000000)"
t "Bug#9d risk DELETE 404"              "404"  "$(del $BASE/applications/$APP_ID/risk/00000000-0000-0000-0000-000000000000)"
t "Bug#11 invalid app status 400"       "400"  "$(put $BASE/applications/$APP_ID '{"status":"INVALID_X"}')"
t "Bug#13 negative licenceNumber 400"   "400"  "$(post $BASE/licences '{"licenceNumber":"-123","productName":"N"}')"
t "Bug#14 XSS licenceNumber 400"        "400"  "$(post $BASE/licences '{"licenceNumber":"123<x>","productName":"X"}')"
t "Bug#15 short password 400"           "400"  "$(post_nc $BASE/auth/register '{"username":"shortpw2","password":"1","name":"S"}')"
t "Bug#16 empty ingredientName 400"     "400"  "$(post $BASE/ingredient-submissions '{"ingredientName":""}')"
t "Orig#1 missing name 400"             "400"  "$(post $BASE/licences '{"licenceNumber":"99"}')"

post $BASE/licences '{"licenceNumber":"80005901","productName":"<script>evil</script>X"}' > /dev/null
XSS_NAME=$(cat /tmp/resp.txt | node -e "try{console.log(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).productName||\"\")}catch{}")
XSS_ID=$(cat /tmp/resp.txt | node -e "try{console.log(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).id||\"\")}catch{}")
if echo "$XSS_NAME" | grep -q '<'; then
  t "Orig#2 XSS licence stripped" "clean" "leaked"
else
  t "Orig#2 XSS licence stripped" "clean" "clean"
fi
[ -n "$XSS_ID" ] && del $BASE/licences/$XSS_ID > /dev/null

get $BASE/audit-log > /dev/null
AUDIT_OK=$(cat /tmp/resp.txt | node -e "try{const d=JSON.parse(require(\"fs\").readFileSync(0,\"utf8\"));console.log(Array.isArray(d)||d.entries?\"ok\":\"bad\")}catch{console.log(\"err\")}")
t "Orig#3 audit-log endpoint"           "ok"    "$AUDIT_OK"

# ---- PHASE 7: EDGE CASES (10) ----
echo ""
echo "[Phase 7] Edge Cases — 10 tests"

# Long name (500 chars) — should succeed
LONG=$(node -e "console.log('x'.repeat(500))")
printf '{"licenceNumber":"80006001","productName":"%s"}' "$LONG" > /tmp/p.json
CODE=$(curl -s -o /tmp/resp.txt -w "%{http_code}" $COOKIE -X POST $BASE/licences -H "Content-Type: application/json" --data @/tmp/p.json)
LONG_ID=$(cat /tmp/resp.txt | node -e "try{console.log(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).id||\"\")}catch{}")
t "edge long name 500 chars"    "201"  "$CODE"
[ -n "$LONG_ID" ] && del $BASE/licences/$LONG_ID > /dev/null

t "edge whitespace name"        "400"  "$(post $BASE/licences '{"licenceNumber":"80006002","productName":"   "}')"
t "edge array in name"          "400"  "$(post $BASE/licences '{"productName":["arr"]}')"
t "edge object in name"         "400"  "$(post $BASE/licences '{"productName":{"o":1}}')"

# Unicode round-trip
post $BASE/licences '{"licenceNumber":"80006003","productName":"Açaí 🌿 漢字"}' > /dev/null
UNI_ID=$(cat /tmp/resp.txt | node -e "try{console.log(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).id||\"\")}catch{}")
UNI_NAME=$(cat /tmp/resp.txt | node -e "try{console.log(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).productName||\"\")}catch{}")
t "edge unicode stored"         "Açaí 🌿 漢字"  "$UNI_NAME"
[ -n "$UNI_ID" ] && del $BASE/licences/$UNI_ID > /dev/null

# Leading zeros
post $BASE/licences '{"licenceNumber":"00012345","productName":"LZ"}' > /dev/null
LZ_NUM=$(cat /tmp/resp.txt | node -e "try{console.log(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).licenceNumber||\"\")}catch{}")
LZ_ID=$(cat /tmp/resp.txt | node -e "try{console.log(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).id||\"\")}catch{}")
t "edge leading zeros preserved" "00012345" "$LZ_NUM"
[ -n "$LZ_ID" ] && del $BASE/licences/$LZ_ID > /dev/null

t "edge double-delete 404"      "404"  "$(del $BASE/licences/00000000-0000-0000-0000-000000000000)"
t "edge update deleted 404"     "404"  "$(put $BASE/licences/00000000-0000-0000-0000-000000000000 '{"productName":"X"}')"

# Malformed cookie
t "edge malformed cookie"       "401"  "$(curl -s -o /dev/null -w '%{http_code}' -H 'Cookie: session=garbage' $BASE/auth/me)"

# ---- PHASE 8: DATA INTEGRITY (6) ----
echo ""
echo "[Phase 8] Data Integrity — 6 tests"

get $BASE/licences > /dev/null
DUPES=$(cat /tmp/resp.txt | node -e "const d=JSON.parse(require(\"fs\").readFileSync(0,\"utf8\"));const ids=d.filter(l=>l.lnhpdId).map(l=>l.lnhpdId);console.log(ids.filter((id,i)=>ids.indexOf(id)!==i).length)")
t "DI-02 no duplicate lnhpdId"  "0"    "$DUPES"

get $BASE/licences > /dev/null
BADJSON=$(cat /tmp/resp.txt | node -e "
const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
const F=['medicinalIngredientsJson','nonMedIngredientsJson','claimsJson','risksJson','dosesJson','routesJson'];
let bad=0;
for(const l of d) for(const f of F) try{if(l[f])JSON.parse(l[f])}catch{bad++};
console.log(bad);
")
t "DI-03 all JSON fields parse" "0"    "$BADJSON"

get $BASE/settings > /dev/null
MASKED=$(cat /tmp/resp.txt | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const k=d.claudeApiKey||'';console.log(k.includes('•')||k.includes('*')||k===''?'yes':'no')")
t "DI-05 API key masked"        "yes"  "$MASKED"

get $BASE/audit-log > /dev/null
LOG_OK=$(cat /tmp/resp.txt | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const c=Array.isArray(d)?d.length:(d.entries?.length||0);console.log(c>0?'yes':'empty')}catch{console.log('err')}")
t "DI-04 audit log has entries" "yes"  "$LOG_OK"

t "DI-07 duplicate user 409"    "409"  "$(post_nc $BASE/auth/register '{"username":"testadmin","password":"test1234","name":"D"}')"

# Sensitive API key not leaked in plaintext
get $BASE/settings > /dev/null
RAW=$(cat /tmp/resp.txt | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const k=d.claudeApiKey||'';console.log(k.startsWith('sk-ant-api')?'exposed':'masked')")
t "DI-sec API key format"       "masked" "$RAW"

# ---- PHASE 9: SECURITY (4) ----
echo ""
echo "[Phase 9] Security — 4 tests"

SQL_STATUS=$(get "$BASE/search?q=%27%20OR%201%3D1%20--")
t "sec SQL injection safe"      "200"  "$SQL_STATUS"
SQL_COUNT=$(cat /tmp/resp.txt | node -e "try{console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).results?.length||0)}catch{console.log(-1)}")
t "sec SQL returns 0 results"   "0"    "$SQL_COUNT"

t "sec path traversal blocked"  "404"  "$(get "$BASE/files/view?path=../../../etc/passwd")"

# CSRF protection: session cookie required
t "sec state-change needs cookie" "401" "$(post_nc $BASE/licences '{"productName":"hack"}')"

# ---- PHASE 10: REGRESSION PIPELINES (6) ----
echo ""
echo "[Phase 10] Cross-System Regression — 6 tests"

get $BASE/licences/export > /dev/null
PIPE=$(cat /tmp/resp.txt | node -e "
try{
  const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
  const anyWithData=(d.licences||[]).some(l=>l.medicinalIngredients?.length>0 && l.claims?.length>0);
  console.log(anyWithData?'ok':'empty');
}catch{console.log('err')}
")
t "R-01 sync→export pipeline"   "ok"   "$PIPE"

SYNC_NPN=$(get $BASE/licences > /dev/null; cat /tmp/resp.txt | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.find(l=>l.lnhpdId)?.licenceNumber||'')")
HC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://health-products.canada.ca/lnhpd-bdpsnh/info?licence=$SYNC_NPN&lang=en")
t "R-03 HC page loads"          "200"  "$HC_STATUS"

BEFORE=$(get $BASE/licences > /dev/null; cat /tmp/resp.txt | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).length)")
post $BASE/licences '{"licenceNumber":"80010001","productName":"R04 Temp"}' > /dev/null
TEMP_ID=$(cat /tmp/resp.txt | node -e "try{console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).id)}catch{}")
MID=$(get $BASE/licences > /dev/null; cat /tmp/resp.txt | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).length)")
t "R-04 count +1 after create"  "$((BEFORE+1))"  "$MID"
[ -n "$TEMP_ID" ] && del $BASE/licences/$TEMP_ID > /dev/null
AFTER=$(get $BASE/licences > /dev/null; cat /tmp/resp.txt | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).length)")
t "R-04 count restored"         "$BEFORE"  "$AFTER"

# R-06 app GET/export
APP_ID=$(get $BASE/applications > /dev/null; cat /tmp/resp.txt | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8'))[0]?.id||'')")
t "R-06 app GET"                "200"  "$(get $BASE/applications/$APP_ID)"
t "R-06 app export (POST)"      "200"  "$(curl -s -o /dev/null -w '%{http_code}' $COOKIE -X POST $BASE/applications/$APP_ID/export)"

# ---- FINAL REPORT ----
echo ""
echo "============================================================"
echo "  FINAL RESULTS"
echo "============================================================"
echo "  TOTAL:  $((PASS + FAIL))"
echo "  PASSED: $PASS"
echo "  FAILED: $FAIL"
if [ -n "$FAILURES" ]; then
  echo ""
  echo "FAILURES:"
  echo "$FAILURES"
fi
echo "============================================================"

# Exit code
[ $FAIL -eq 0 ]
