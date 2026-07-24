"""
python-beauty-agent.py

Complete runnable example: BeautyOS appointment booking agent
Uses Groq (free tier) + @scala-ai/agent-definitions tool schema

Usage:
    GROQ_API_KEY=your_key_here python3 examples/python-beauty-agent.py

Get a free Groq API key at: https://console.groq.com
"""

import json
import os
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("Install requests: pip install requests")

# ─── Step 1: Load the BeautyOS tool definitions ───────────────────────────────
# The JSON file is the canonical schema; no Python SDK needed.
definitions_path = Path(__file__).parent.parent / "definitions" / "beauty.json"
with open(definitions_path) as f:
    beauty_def = json.load(f)

# ─── Step 2: Convert to OpenAI-compatible format ──────────────────────────────
# Groq, OpenAI, Mistral, and Anthropic all accept this exact shape.
def to_openai_tools(vertical_def):
    tools = []
    for tool in vertical_def["tools"]:
        properties = {}
        required = []
        for key, param in tool["params"].items():
            properties[key] = {
                "type": param["type"],
                "description": param["description"],
            }
            if param["required"]:
                required.append(key)
        tools.append({
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool["description"],
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": required,
                },
            },
        })
    return tools

tools = to_openai_tools(beauty_def)

# ─── Step 3: Mock tool handler ────────────────────────────────────────────────
# In production this calls your database / SCALA backend.
def execute_tool(name, args):
    if name == "book_appointment":
        return {
            "success": True,
            "appointment_id": "APT-20260726-0017",
            "message": f"Appointment confirmed for {args['treatment']} on {args['preferred_date']} at {args['preferred_time']}",
            "client": args["name"],
        }
    if name == "check_availability":
        return {"available": True, "slots": ["10:00", "11:30", "14:00"]}
    if name == "get_price_list":
        return {"haircut": "€35", "manicure": "€25", "facial": "€60"}
    return {"error": "Unknown tool"}

# ─── Step 4: Call the Groq API ────────────────────────────────────────────────
def run_agent():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        sys.exit("Error: GROQ_API_KEY environment variable is not set.\nGet a free key at https://console.groq.com")

    user_message = "I'd like to book a manicure next Saturday at 10am, my name is Sofia"

    print("User:", user_message)
    print(f"Sending request to Groq with {len(tools)} BeautyOS tools...\n")

    system_prompt = (
        f"You are {beauty_def['agent_name']}. "
        f"{beauty_def['agent_identity']} "
        "Today is 2026-07-24. Next Saturday is 2026-07-26."
    )

    # First turn: user message + tool schema → LLM picks a tool to call
    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "tools": tools,
            "tool_choice": "auto",
        },
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    assistant_message = data["choices"][0]["message"]

    # ─── Step 5: Handle tool_call response ────────────────────────────────────
    # When finish_reason is "tool_calls", the LLM wants to invoke a function.
    tool_calls = assistant_message.get("tool_calls", [])
    if tool_calls:
        tool_call = tool_calls[0]
        tool_name = tool_call["function"]["name"]
        tool_args = json.loads(tool_call["function"]["arguments"])

        print("LLM chose tool:", tool_name)
        print("Arguments:", json.dumps(tool_args, indent=2))

        # Execute the tool (real DB call in production)
        tool_result = execute_tool(tool_name, tool_args)
        print("\nTool result:", json.dumps(tool_result, indent=2))

        # Second turn: send result back so LLM can generate a natural language reply
        followup = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                    assistant_message,
                    {
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "content": json.dumps(tool_result),
                    },
                ],
                "tools": tools,
            },
            timeout=30,
        )
        followup.raise_for_status()
        final_reply = followup.json()["choices"][0]["message"]["content"]
        print("\nAgent reply:", final_reply)
    else:
        print("Agent reply:", assistant_message.get("content"))

if __name__ == "__main__":
    run_agent()
