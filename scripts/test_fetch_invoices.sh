#!/bin/bash

# Test script for buyer-initiated fetch invoices API
# Checks invoice data structure and consistency

BASE_URL="https://kratest.pesaflow.com/api/ussd/buyer-initiated/fetch"
HEADER="x-forwarded-for: triple_2_ussd"
PHONE="254745050238"

echo "=========================================="
echo "Invoice Data Structure Test"
echo "Phone: $PHONE"
echo "=========================================="
echo ""

# Test different status/actor combinations
test_combinations=(
  "accepted:buyer"
  "accepted:supplier"
  "awaiting_approval:buyer"
  "awaiting_approval:supplier"
)

for combo in "${test_combinations[@]}"; do
  status="${combo%:*}"
  actor="${combo#*:}"
  
  echo ""
  echo "========================================"
  echo "STATUS: $status | ACTOR: $actor"
  echo "========================================"
  
  URL="${BASE_URL}/${PHONE}?page=1&page_size=3&status=${status}&actor=${actor}&source=whatsapp"
  
  response=$(curl -s --location "$URL" --header "$HEADER")
  
  # Get count
  count=$(echo "$response" | jq '.invoices.total_entries // 0' 2>/dev/null)
  echo "Total entries: $count"
  echo ""
  
  # Show first invoice structure
  if [ "$count" != "0" ] && [ "$count" != "null" ]; then
    echo "First invoice fields:"
    echo "$response" | jq '.invoices.entries[0] | keys' 2>/dev/null
    echo ""
    echo "First invoice data:"
    echo "$response" | jq '.invoices.entries[0]' 2>/dev/null
    echo ""
    
    # Check consistency - list all unique field names across invoices
    echo "All fields present in all invoices:"
    echo "$response" | jq '[.invoices.entries[] | keys] | add | unique' 2>/dev/null
  fi
done

echo ""
echo "=========================================="
echo "FIELD ANALYSIS"
echo "=========================================="
echo ""

# Get one invoice and analyze all fields
URL="${BASE_URL}/${PHONE}?page=1&page_size=1&status=accepted&actor=buyer&source=whatsapp"
response=$(curl -s --location "$URL" --header "$HEADER")

echo "Sample Invoice Structure:"
echo "$response" | jq '.invoices.entries[0]' 2>/dev/null

echo ""
echo "Items structure (if present):"
echo "$response" | jq '.invoices.entries[0].items' 2>/dev/null

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
