"use strict";
/**
 * @scala-ai/agent-definitions
 * Open-source AI agent definitions for 20 business verticals.
 * Apache-2.0 License — https://github.com/Alessandro114/scala-agent-definitions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVerticalDefinition = getVerticalDefinition;
exports.getAllVerticals = getAllVerticals;
exports.getAllDefinitions = getAllDefinitions;
exports.getToolsForVertical = getToolsForVertical;
exports.getToolsByRisk = getToolsByRisk;
exports.getAutonomyLevels = getAutonomyLevels;
exports.getProactiveBehaviors = getProactiveBehaviors;
exports.buildAgentSystemPrompt = buildAgentSystemPrompt;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ─── Internal cache ───────────────────────────────────────────────────────────
const DEFINITIONS_DIR = path.join(__dirname, '..', 'definitions');
let _cache = null;
function loadAll() {
    if (_cache)
        return _cache;
    _cache = new Map();
    const files = fs.readdirSync(DEFINITIONS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
        const raw = fs.readFileSync(path.join(DEFINITIONS_DIR, file), 'utf-8');
        const def = JSON.parse(raw);
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
function getVerticalDefinition(vertical) {
    return loadAll().get(vertical);
}
/**
 * Get all available vertical keys.
 *
 * @example
 * getAllVerticals();
 * // ['dine', 'beauty', 'property', 'travel', 'clean', ...]
 */
function getAllVerticals() {
    return Array.from(loadAll().keys()).sort();
}
/**
 * Get all vertical definitions as an array.
 */
function getAllDefinitions() {
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
function getToolsForVertical(vertical) {
    const def = loadAll().get(vertical);
    if (!def)
        return [];
    return def.tools.map(tool => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: 'object',
                properties: Object.fromEntries(Object.entries(tool.params).map(([key, param]) => [
                    key,
                    { type: param.type, description: param.description },
                ])),
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
function getToolsByRisk(vertical, risk_level) {
    const def = loadAll().get(vertical);
    if (!def)
        return [];
    const filtered = def.tools.filter(t => t.risk_level === risk_level);
    return filtered.map(tool => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: 'object',
                properties: Object.fromEntries(Object.entries(tool.params).map(([key, param]) => [
                    key,
                    { type: param.type, description: param.description },
                ])),
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
function getAutonomyLevels(vertical) {
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
function getProactiveBehaviors(vertical) {
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
function buildAgentSystemPrompt(vertical, autonomyLevel = 2) {
    const def = loadAll().get(vertical);
    if (!def)
        return '';
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
