# @scala-ai/agent-definitions

![License](https://img.shields.io/badge/license-Apache%202.0-blue) ![Verticals](https://img.shields.io/badge/verticals-20-green) ![Tools](https://img.shields.io/badge/tools-79-orange)

**Open-source AI agent definitions for 20 business verticals.**

Define what your AI agent can do — bookings, CRM, inventory, reviews, and more — using a standard schema compatible with OpenAI, Groq, Mistral, Anthropic, and any LLM that supports function calling.

This package is the open-source core of [S.C.A.L.A.](https://get-scala.com) — the agentic AI platform for business. The tool _definitions_ are free and Apache-2.0. The production handlers, autonomy engine, and hosted platform are available at [get-scala.com](https://get-scala.com).

---

## What is this?

When you build an AI agent, you need to define:

1. **What tools exist** — what the agent can _do_ (book a table, check stock, open a ticket)
2. **What parameters each tool takes** — the schema for function calling
3. **How risky each action is** — so you can decide what runs autonomously vs. what needs human approval
4. **What the agent's identity is** — the persona trained for that vertical
5. **What the agent does proactively** — without being asked

This package gives you all of that, pre-built, for 20 business verticals. Ready to drop into any LLM.

---

## Install

```bash
npm install @scala-ai/agent-definitions
```

No dependencies. Reads JSON files from disk.

---

## Quick Start

### Run the example in 2 minutes

```bash
git clone https://github.com/Alessandro114/scala-agent-definitions
cd scala-agent-definitions
export GROQ_API_KEY=your_key_here   # free at console.groq.com
node examples/node-restaurant-agent.js
# → Booking confirmed for 4 guests at 20:30
```

---

### 10-line restaurant booking agent

```typescript
import OpenAI from 'openai';
import { getToolsForVertical, buildAgentSystemPrompt } from '@scala-ai/agent-definitions';

const client = new OpenAI();

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: buildAgentSystemPrompt('dine', 2) },
    { role: 'user', content: 'I want a table for 4 this Saturday at 8pm, name is Marco' },
  ],
  tools: getToolsForVertical('dine'),
  tool_choice: 'auto',
});

console.log(response.choices[0].message.tool_calls);
// → [{ function: { name: 'book_table', arguments: '{"date":"2026-07-26","time":"20:00","guests":"4","name":"Marco"}' } }]
```

### Works with Groq too

```typescript
import Groq from 'groq-sdk';
import { getToolsForVertical } from '@scala-ai/agent-definitions';

const groq = new Groq();

const response = await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Check if Saturday 8pm has availability for 4 people' }],
  tools: getToolsForVertical('dine'),
});
```

### Get only safe tools for auto-execution

```typescript
import { getToolsByRisk } from '@scala-ai/agent-definitions';

// Low-risk only: check availability, get menu, get allergens
// These are safe to execute without human approval
const safeTools = getToolsByRisk('dine', 'low');

// Medium-risk: book_table, etc.
// These create records — require autonomy level >= 2
const actionTools = getToolsByRisk('dine', 'medium');
```

### Get agent identity and proactive behaviors

```typescript
import { getVerticalDefinition, getProactiveBehaviors } from '@scala-ai/agent-definitions';

const agent = getVerticalDefinition('beauty');
console.log(agent?.agent_identity);
// "Your Receptionist AI. Books appointments, suggests treatments, manages waitlists."

const proactive = getProactiveBehaviors('beauty');
// ['Send appointment reminder 24h before', 'Suggest rebooking 4 weeks after last visit', ...]
```

---

## API

### `getVerticalDefinition(vertical: string): VerticalDefinition | undefined`

Returns the full definition for a vertical including tools, autonomy levels, and proactive behaviors.

### `getAllVerticals(): string[]`

Returns all available vertical keys: `['ad', 'agency', 'beauty', 'clean', ...]`

### `getAllDefinitions(): VerticalDefinition[]`

Returns all definitions as an array.

### `getToolsForVertical(vertical: string): OpenAIToolDefinition[]`

Returns all tools for a vertical in OpenAI function-calling format. Compatible with OpenAI, Groq, Mistral, Anthropic, and any standard LLM API.

### `getToolsByRisk(vertical, risk_level): OpenAIToolDefinition[]`

Returns only tools matching the given risk level (`'low'`, `'medium'`, `'high'`, `'critical'`). Use this to implement tiered autonomy.

### `getAutonomyLevels(vertical: string): Record<string, AutonomyLevel>`

Returns the 4 autonomy levels (0–3) for a vertical.

### `getProactiveBehaviors(vertical: string): string[]`

Returns the list of proactive behaviors the agent should trigger without being asked.

### `buildAgentSystemPrompt(vertical: string, autonomyLevel: 0|1|2|3): string`

Builds a ready-to-use system prompt for a given vertical and autonomy level. Inject into your LLM's system message.

---

## 20 Verticals

| Key | Agent Name | Identity | Tools |
|-----|-----------|----------|-------|
| `dine` | DineOS Agent | Your Maitre AI. Books tables, kills no-shows, handles reviews. | 4 |
| `beauty` | BeautyOS Agent | Your Receptionist AI. Books appointments, suggests treatments, manages waitlists. | 4 |
| `property` | PropertyOS Agent | Your Real Estate Agent AI. Matches leads, schedules visits, closes deals. | 4 |
| `travel` | TravelOS Agent | Your Travel Agent AI. Builds itineraries, sends quotes, follows up. | 4 |
| `clean` | CleanOS Agent | Your Dispatcher AI. Assigns teams, tracks quality, enforces SLA. | 4 |
| `dermaly` | DermalyOS Agent | Your Clinical Assistant AI. Books visits, collects consent, follows up post-treatment. | 4 |
| `motor` | MotorOS Agent | Your Service Advisor AI. Books services, tracks repairs, upsells maintenance. | 5 |
| `network` | NetworkOS Agent | Your Network Coach AI. Tracks commissions, onboards members, nudges inactives. | 4 |
| `praxis` | PraxisOS Agent | Your Office Manager AI. Tracks deadlines, onboards clients, drafts invoices. | 4 |
| `studio` | StudioOS Agent | Your Site Manager AI. Tracks SAL, logs hours, alerts on deadlines. | 4 |
| `agency` | AgencyOS Agent | Your Project Manager AI. Assigns tasks, tracks hours, reports to clients. | 4 |
| `shop` | ShopOS Agent | Your Sales Associate AI. Finds products, manages stock, runs loyalty. | 4 |
| `wellness` | WellnessOS Agent | Your Fitness Manager AI. Books classes, manages memberships, tracks check-ins. | 4 |
| `franchise` | FranchiseOS Agent | Your Franchisor AI. Benchmarks locations, enforces compliance, calculates royalties. | 4 |
| `reputation` | ReputationOS Agent | Your PR Manager AI. Monitors reviews, responds fast, protects your brand. | 3 |
| `project` | ProjectOS Agent | Your PM AI. Assigns tasks, flags risks, keeps projects on budget. | 3 |
| `ad` | AdOS Agent | Your Media Buyer AI. Creates campaigns, optimizes bids, reports ROI. | 3 |
| `service` | ServiceOS Agent | Your Facility Manager AI. Opens tickets, dispatches techs, predicts failures. | 4 |
| `landiq` | LandIQ Agent | Your Urban Analyst AI. Calculates volumetrics, runs DCF, generates feasibility. | 5 |
| `general` | SCALA General Agent | Your AI Employee. Answers questions, books demos, starts trials. | 4 |

---

## Risk Classification

Every tool has a `risk_level`. Use this to implement autonomy guardrails:

| Risk | Examples | When to auto-execute |
|------|----------|---------------------|
| `low` | check_availability, get_menu, search_listings | Always safe — no side effects |
| `medium` | book_table, book_appointment, create_ticket, reserve_product | Auto-execute at autonomy level 2+ |
| `high` | (reserved for financial/destructive actions) | Always require human approval |
| `critical` | (reserved for irreversible system actions) | Never auto-execute |

---

## Autonomy Levels

Every vertical supports 4 autonomy levels:

| Level | Name | Behavior |
|-------|------|----------|
| `0` | OFF | Agent disabled |
| `1` | OBSERVE | Agent suggests, human approves everything |
| `2` | SEMI-AUTO | Low-risk actions run automatically, medium+ queued for approval |
| `3` | FULL-AUTO | All actions run automatically except high/critical risk |

---

## The Full Platform

This package gives you the definitions. To get a production AI agent with:

- Real database handlers for every tool
- WhatsApp, Telegram, Email, and Web channels
- Built-in CRM and lead management
- 4-level autonomy engine with audit log
- Multi-tenant, multi-vertical, enterprise-ready

Visit [get-scala.com](https://get-scala.com) — 14-day free trial, no credit card.

---

## Why Not LangChain / CrewAI / AutoGen?

| | @scala-ai/agent-definitions | LangChain | CrewAI | AutoGen |
|---|---|---|---|---|
| **Scope** | Vertical-specific (restaurants, beauty, real estate, …) | Generic framework | Generic multi-agent | Generic multi-agent |
| **Tool schema** | Pre-built, production-tested per vertical | Build your own | Build your own | Build your own |
| **Risk levels** | Built-in (`low` / `medium` / `high` / `critical`) | Manual | Manual | Manual |
| **Autonomy model** | 4 levels included | Not provided | Not provided | Not provided |
| **Proactive behaviors** | Defined per vertical | Not provided | Not provided | Not provided |
| **Dependencies** | Zero | Heavy | Heavy | Heavy |
| **Format** | OpenAI-compatible JSON | Python-first | Python-first | Python-first |

Use this package when you know the vertical upfront and want battle-tested tool definitions out of the box. Use LangChain/CrewAI/AutoGen when you need a generic orchestration framework.

---

## Examples

| File | What it shows |
|------|---------------|
| [`examples/node-restaurant-agent.js`](examples/node-restaurant-agent.js) | Full Node.js agent: load schema, call Groq, handle tool_call, confirm booking |
| [`examples/python-beauty-agent.py`](examples/python-beauty-agent.py) | Same flow in Python for BeautyOS appointment booking |
| [`examples/curl-quick-test.sh`](examples/curl-quick-test.sh) | One-liner curl test to verify tool calling works with your API key |

---

## Built With

These definitions power [SCALA AI OS](https://get-scala.com) — the agentic AI platform for business.

---

## Contributing

Tool definitions, new verticals, and translations are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the JSON schema and PR process.

The handler implementations (what happens when a tool is called) are proprietary and not part of this package. This is by design: the _interface_ is open, the _engine_ is SCALA's.

---

## License

Apache-2.0 — free to use in commercial and open-source projects.

```
Copyright 2026 SCALA AI (get-scala.com)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0
```
