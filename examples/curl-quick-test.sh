#!/usr/bin/env bash
# curl-quick-test.sh
#
# Quick test: send a Groq API request with DineOS tool definitions
# and verify the LLM returns a book_table tool call.
#
# Usage:
#   export GROQ_API_KEY=your_key_here
#   bash examples/curl-quick-test.sh
#
# Get a free Groq API key at: https://console.groq.com

set -euo pipefail

if [ -z "${GROQ_API_KEY:-}" ]; then
  echo "Error: GROQ_API_KEY is not set."
  echo "  export GROQ_API_KEY=your_key_here"
  exit 1
fi

echo "Sending DineOS booking request to Groq..."
echo ""

curl -s https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer ${GROQ_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [
      {
        "role": "system",
        "content": "You are DineOS Agent. Your Maitre AI. Books tables, kills no-shows, handles reviews. Today is 2026-07-24, this Saturday is 2026-07-26."
      },
      {
        "role": "user",
        "content": "I want a table for 4 guests this Saturday at 8:30pm, name is Marco"
      }
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "book_table",
          "description": "Book a table at the restaurant",
          "parameters": {
            "type": "object",
            "properties": {
              "date":   { "type": "string", "description": "Reservation date (YYYY-MM-DD)" },
              "time":   { "type": "string", "description": "Reservation time (HH:MM)" },
              "guests": { "type": "string", "description": "Number of guests" },
              "name":   { "type": "string", "description": "Guest name" },
              "phone":  { "type": "string", "description": "Guest phone number" },
              "notes":  { "type": "string", "description": "Special requests or dietary needs" }
            },
            "required": ["date", "time", "guests", "name"]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "check_availability",
          "description": "Check table availability for a given date, time and party size",
          "parameters": {
            "type": "object",
            "properties": {
              "date":   { "type": "string", "description": "Date to check (YYYY-MM-DD)" },
              "time":   { "type": "string", "description": "Time to check (HH:MM)" },
              "guests": { "type": "string", "description": "Number of guests" }
            },
            "required": ["date", "time", "guests"]
          }
        }
      }
    ],
    "tool_choice": "auto"
  }' | python3 -m json.tool

# Expected: choices[0].message.tool_calls[0].function.name == "book_table"
#           with arguments containing date "2026-07-26", time "20:30", guests "4", name "Marco"
