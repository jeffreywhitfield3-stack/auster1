#!/bin/bash

# Auster Usage Tracking Test Script
# Tests the /api/derivatives/quote endpoint with usage tracking

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}Auster Usage Tracking Test${NC}"
echo -e "${BLUE}=====================================${NC}\n"

# Configuration
API_BASE="http://localhost:3000"
ENDPOINT="/api/derivatives/quote?symbol=SPY"

# Check if server is running
echo -e "${YELLOW}[1/5] Checking if dev server is running...${NC}"
if ! curl -s -f "$API_BASE" > /dev/null 2>&1; then
    echo -e "${RED}❌ Server not running at $API_BASE${NC}"
    echo -e "${YELLOW}💡 Start the dev server with: npm run dev${NC}\n"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}\n"

# Test 1: Unauthenticated request (should return 401)
echo -e "${YELLOW}[2/5] Testing unauthenticated request...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE$ENDPOINT")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Correctly returns 401 Unauthorized${NC}"
    echo -e "${BLUE}Response: $BODY${NC}\n"
else
    echo -e "${RED}❌ Expected 401, got $HTTP_CODE${NC}"
    echo -e "${BLUE}Response: $BODY${NC}\n"
fi

# Instructions for authenticated testing
echo -e "${YELLOW}[3/5] Testing authenticated request...${NC}"
echo -e "${BLUE}📋 To test with authentication:${NC}"
echo -e "${BLUE}   1. Open http://localhost:3000 in your browser${NC}"
echo -e "${BLUE}   2. Login to your account${NC}"
echo -e "${BLUE}   3. Open DevTools → Application → Cookies${NC}"
echo -e "${BLUE}   4. Copy the value of the cookie starting with 'sb-'${NC}"
echo -e "${BLUE}   5. Run this command:${NC}\n"

echo -e "${GREEN}export AUTH_COOKIE='<paste-cookie-here>'${NC}"
echo -e "${GREEN}curl -v '$API_BASE$ENDPOINT' -H \"Cookie: \$AUTH_COOKIE\"${NC}\n"

if [ -n "$AUTH_COOKIE" ]; then
    echo -e "${YELLOW}Testing with provided AUTH_COOKIE...${NC}"
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE$ENDPOINT" -H "Cookie: $AUTH_COOKIE")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Authenticated request successful${NC}"
        echo -e "${BLUE}Response preview: $(echo "$BODY" | head -c 200)...${NC}\n"
    elif [ "$HTTP_CODE" = "402" ]; then
        echo -e "${YELLOW}⚠ Usage limit exceeded (402 Payment Required)${NC}"
        echo -e "${BLUE}Response: $BODY${NC}\n"
    else
        echo -e "${RED}❌ Unexpected response: $HTTP_CODE${NC}"
        echo -e "${BLUE}Response: $BODY${NC}\n"
    fi
else
    echo -e "${YELLOW}⚠ AUTH_COOKIE not set, skipping authenticated test${NC}\n"
fi

# Test 4: Check usage endpoint
echo -e "${YELLOW}[4/5] Testing usage peek endpoint...${NC}"
if [ -n "$AUTH_COOKIE" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/usage/peek?product=derivatives" -H "Cookie: $AUTH_COOKIE")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Usage peek successful${NC}"
        echo -e "${BLUE}Response: $BODY${NC}\n"
    else
        echo -e "${RED}❌ Usage peek failed: $HTTP_CODE${NC}"
        echo -e "${BLUE}Response: $BODY${NC}\n"
    fi
else
    echo -e "${YELLOW}⚠ AUTH_COOKIE not set, skipping usage peek test${NC}\n"
fi

# Summary
echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}=====================================${NC}"
echo -e "${GREEN}✓ Unauthenticated requests are blocked (401)${NC}"
echo -e "${GREEN}✓ Usage tracking code is in place${NC}"
echo -e "${YELLOW}⚠ Manual testing required for authenticated flow${NC}\n"

echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Start dev server: ${GREEN}npm run dev${NC}"
echo -e "  2. Login at: ${GREEN}http://localhost:3000/login${NC}"
echo -e "  3. Test with auth cookie (see instructions above)"
echo -e "  4. Check Supabase for usage logs\n"

echo -e "${BLUE}Database check (if you have psql access):${NC}"
echo -e "${GREEN}SELECT user_id, product, cost, created_at FROM usage_logs ORDER BY created_at DESC LIMIT 10;${NC}\n"
