/**
 * @scala-ai/agent-definitions
 * Open-source AI agent definitions for 20 business verticals.
 * Apache-2.0 License — https://github.com/Alessandro114/scala-agent-definitions
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParamDefinition {
  type: string;
  required: boolean;
  description: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  requires_db: boolean;
  params: Record<string, ParamDefinition>;
}

export interface AutonomyLevel {
  name: string;
  behavior: string;
}

export interface VerticalDefinition {
  vertical: string;
  agent_name: string;
  agent_identity: string;
  description: string;
  tools: ToolDefinition[];
  autonomy_levels: Record<string, AutonomyLevel>;
  proactive_behaviors: string[];
}

/**
 * OpenAI-compatible tool definition (works with Groq, Mistral, Anthropic, etc.)
 * See: https://platform.openai.com/docs/guides/function-calling
 */
export interface OpenAIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
}

// ─── Internal cache ───────────────────────────────────────────────────────────

const DEFINITIONS_DIR = path.join(__dirname, '..', 'definitions');

let _cache: Map<string, VerticalDefinition> | null = null;

function loadAll(): Map<string, VerticalDefinition> {
  if (_cache) return _cache;

  _cache = new Map();

  const files = fs.readdirSync(DEFINITIONS_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const raw = fs.readFileSync(path.join(DEFINITIONS_DIR, file), 'utf-8');
    const def: VerticalDefinition = JSON.parse(raw);
    _cache.set(def.vertical, def);
  }

  return _cache;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the full definition for a specific vertical.
 * Returns undefined if the vertical is not found.
 *
 * @example
 * const dine = getVerticalDefinition('dine');
 * console.log(dine?.agent_identity);
 * // "Your Maitre AI. Books tables, kills no-shows, handles reviews."
 */
export function getVerticalDefinition(vertical: string): VerticalDefinition | undefined {
  return loadAll().get(vertical);
}

/**
 * Get all available vertical keys.
 *
 * @example
 * getAllVerticals();
 * // ['dine', 'beauty', 'property', 'travel', 'clean', ...]
 */
export function getAllVerticals(): string[] {
  return Array.from(loadAll().keys()).sort();
}

/**
 * Get all vertical definitions as an array.
 */
export function getAllDefinitions(): VerticalDefinition[] {
  return Array.from(loadAll().values());
}

/**
 * Convert tool definitions for a vertical into OpenAI-compatible function-calling format.
 * Compatible with: OpenAI, Groq, Mistral, Anthropic tool_use, and any LLM supporting function calling.
 *
 * @example
 * import OpenAI from 'openai';
 * const client = new OpenAI();
 *
 * const tools = getToolsForVertical('dine');
 * const response = await client.chat.completions.create({
 *   model: 'gpt-4o',
 *   messages: [{ role: 'user', content: 'Book a table for 4 tonight at 8pm' }],
 *   tools,
 * });
 */
export function getToolsForVertical(vertical: string): OpenAIToolDefinition[] {
  const def = loadAll().get(vertical);
  if (!def) return [];

  return def.tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object' as const,
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

/**
 * Get only the tools for a vertical that match a specific risk level.
 * Useful for building tiered autonomy: e.g., only auto-execute 'low' risk tools.
 *
 * @example
 * const safeDineTools = getToolsByRisk('dine', 'low');
 * // Returns only check_availability, get_menu, get_allergens
 */
export function getToolsByRisk(
  vertical: string,
  risk_level: 'low' | 'medium' | 'high' | 'critical'
): OpenAIToolDefinition[] {
  const def = loadAll().get(vertical);
  if (!def) return [];

  const filtered = def.tools.filter(t => t.risk_level === risk_level);

  return filtered.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object' as const,
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

/**
 * Get the autonomy level configuration for a vertical.
 *
 * @example
 * getAutonomyLevels('dine');
 * // { '0': { name: 'OFF', behavior: '...' }, '1': ..., '2': ..., '3': ... }
 */
export function getAutonomyLevels(vertical: string): Record<string, AutonomyLevel> | undefined {
  return loadAll().get(vertical)?.autonomy_levels;
}

/**
 * Get the proactive behaviors list for a vertical.
 * These are the things the agent should do WITHOUT being asked.
 *
 * @example
 * getProactiveBehaviors('dine');
 * // ['Send reservation reminder 24h before', 'Detect no-shows...', ...]
 */
export function getProactiveBehaviors(vertical: string): string[] {
  return loadAll().get(vertical)?.proactive_behaviors ?? [];
}

/**
 * Build a system prompt snippet for a given vertical and autonomy level.
 * Inject this into your LLM system prompt to configure agent behavior.
 *
 * @example
 * const systemPrompt = buildAgentSystemPrompt('dine', 2);
 * // Returns a formatted string describing the agent's identity, tools, and autonomy
 */
export function buildAgentSystemPrompt(vertical: string, autonomyLevel: 0 | 1 | 2 | 3 = 2): string {
  const def = loadAll().get(vertical);
  if (!def) return '';

  const autonomy = def.autonomy_levels[String(autonomyLevel)];
  const toolList = def.tools
    .map(t => `- ${t.name}(${Object.keys(t.params).join(', ')}): ${t.description} [risk: ${t.risk_level}]`)
    .join('\n');

  return `You are ${def.agent_name}.
Identity: ${def.agent_identity}
Vertical: ${def.description}

Autonomy Mode: ${autonomy?.name ?? 'SEMI-AUTO'} — ${autonomy?.behavior ?? ''}

Available tools:
${toolList}

Proactive behaviors (trigger without being asked):
${def.proactive_behaviors.map(b => `- ${b}`).join('\n')}

Rules:
- NEVER invent data. If a tool exists for the user's request, call it.
- Low-risk tools: execute immediately.
- Medium-risk tools: execute if autonomy level >= 2, otherwise confirm with user.
- High/critical-risk tools: always confirm with user regardless of autonomy level.
- If a tool fails, offer to connect the user with a human team member.`;
}
