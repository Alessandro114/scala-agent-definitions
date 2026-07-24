# Contributing to @scala-ai/agent-definitions

Thank you for contributing. This package is the open-source tool schema layer for the [SCALA AI OS](https://get-scala.com) platform.

## How to Add a New Vertical

1. Create `definitions/<vertical-key>.json` following the schema below.
2. Add your vertical to the table in `README.md`.
3. Open a pull request against `main`.

The vertical key must be lowercase, alphanumeric, max 20 characters (e.g. `dine`, `beauty`, `landiq`).

## JSON Schema for a Vertical Definition

```json
{
  "vertical": "string — unique key",
  "agent_name": "string — display name (e.g. DineOS Agent)",
  "agent_identity": "string — one-sentence persona",
  "description": "string — what this vertical covers",
  "tools": [
    {
      "name": "snake_case_tool_name",
      "description": "What this tool does",
      "risk_level": "low | medium | high | critical",
      "requires_db": true,
      "params": {
        "param_name": {
          "type": "string | number | boolean",
          "required": true,
          "description": "Human-readable description"
        }
      }
    }
  ],
  "autonomy_levels": {
    "0": { "name": "OFF",       "behavior": "Agent disabled" },
    "1": { "name": "OBSERVE",   "behavior": "Agent suggests, human approves all" },
    "2": { "name": "SEMI-AUTO", "behavior": "Low-risk actions auto-execute, others queued" },
    "3": { "name": "FULL-AUTO", "behavior": "All actions auto-execute except high/critical" }
  },
  "proactive_behaviors": [
    "List of things the agent does without being asked"
  ]
}
```

### Risk Level Guide

| Level | Use when |
|-------|----------|
| `low` | Read-only: checking availability, fetching menus, searching |
| `medium` | Creates a record: booking, appointment, ticket |
| `high` | Financial or destructive: cancellations with fees, refunds |
| `critical` | Irreversible system actions |

## Submitting a Pull Request

- One vertical per PR.
- Run `npm run build` to confirm TypeScript compiles cleanly.
- Add a brief description of the vertical's use case.
- PRs that add handler implementations (database logic) will not be merged — this repo is schema-only by design.

## Code of Conduct

This project follows the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
