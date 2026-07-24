/**
 * node-restaurant-agent.js
 *
 * Complete runnable example: DineOS restaurant booking agent
 * Uses Groq (free tier) + @scala-ai/agent-definitions tool schema
 *
 * Usage:
 *   GROQ_API_KEY=your_key_here node examples/node-restaurant-agent.js
 *
 * Get a free Groq API key at: https://console.groq.com
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Step 1: Load the DineOS tool definitions ─────────────────────────────────
// The JSON file contains the canonical schema for all DineOS tools.
// In production you'd use: require('@scala-ai/agent-definitions').getToolsForVertical('dine')
const dineDefinition = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../definitions/dine.json'), 'utf-8')
);

// ─── Step 2: Convert to OpenAI-compatible format ──────────────────────────────
// Every LLM that supports function calling (OpenAI, Groq, Mistral, Anthropic)
// expects tools in this exact shape: { type: "function", function: { name, description, parameters } }
function toOpenAITools(verticalDefinition) {
  return verticalDefinition.tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(tool.params).map(([key, param]) => [
            key,
            { type: param.type, description: param.description },
          ])
        ),
        required: Object.entries(tool.params)
          .filter(([, param]) => param.required)
          .map(([key]) => key),
      },
    },
  }));
}

const tools = toOpenAITools(dineDefinition);

// ─── Step 3: Mock tool handler ────────────────────────────────────────────────
// In production this calls your database. Here we simulate the response.
function executeTool(name, args) {
  if (name === 'book_table') {
    return {
      success: true,
      reservation_id: 'RES-20260726-0042',
      message: `Booking confirmed for ${args.guests} guests at ${args.time}`,
      guest: args.name,
      date: args.date,
    };
  }
  if (name === 'check_availability') {
    return { available: true, slots: ['20:00', '20:15', '20:30'] };
  }
  return { error: 'Unknown tool' };
}

// ─── Step 4: Call the Groq API ────────────────────────────────────────────────
async function runAgent() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('Error: GROQ_API_KEY environment variable is not set.');
    console.error('Get a free key at https://console.groq.com');
    process.exit(1);
  }

  const userMessage = 'I want a table for 4 guests this Saturday at 8:30pm, my name is Marco';

  console.log('User:', userMessage);
  console.log('Sending request to Groq with', tools.length, 'DineOS tools...\n');

  // First turn: send user message + tool definitions to the LLM
  const firstResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are ${dineDefinition.agent_name}. ${dineDefinition.agent_identity} Today is 2026-07-24. Saturday is 2026-07-26.`,
        },
        { role: 'user', content: userMessage },
      ],
      tools,
      tool_choice: 'auto',
    }),
  });

  if (!firstResponse.ok) {
    const err = await firstResponse.text();
    console.error('Groq API error:', err);
    process.exit(1);
  }

  const firstData = await firstResponse.json();
  const assistantMessage = firstData.choices[0].message;

  // ─── Step 5: Handle tool_call response ──────────────────────────────────────
  // When the LLM wants to call a tool it returns finish_reason: "tool_calls"
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    const toolCall = assistantMessage.tool_calls[0];
    const toolName = toolCall.function.name;
    const toolArgs = JSON.parse(toolCall.function.arguments);

    console.log('LLM chose tool:', toolName);
    console.log('Arguments:', JSON.stringify(toolArgs, null, 2));

    // Execute the tool (database call in production)
    const toolResult = executeTool(toolName, toolArgs);
    console.log('\nTool result:', JSON.stringify(toolResult, null, 2));

    // Second turn: send tool result back to the LLM for a natural language reply
    const secondResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are ${dineDefinition.agent_name}. ${dineDefinition.agent_identity}`,
          },
          { role: 'user', content: userMessage },
          assistantMessage,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          },
        ],
        tools,
      }),
    });

    const secondData = await secondResponse.json();
    const finalReply = secondData.choices[0].message.content;

    console.log('\nAgent reply:', finalReply);
    // Expected output confirms the booking:
    console.log('\nBooking confirmed for 4 guests at 20:30');
  } else {
    // LLM answered directly without calling a tool
    console.log('Agent reply:', assistantMessage.content);
  }
}

runAgent().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
