/**
 * @scala-ai/agent-definitions
 * Open-source AI agent definitions for 20 business verticals.
 * Apache-2.0 License — https://github.com/Alessandro114/scala-agent-definitions
 */
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
            properties: Record<string, {
                type: string;
                description: string;
            }>;
            required: string[];
        };
    };
}
/**
 * Get the full definition for a specific vertical.
 * Returns undefined if the vertical is not found.
 *
 * @example
 * const dine = getVerticalDefinition('dine');
 * console.log(dine?.agent_identity);
 * // "Your Maitre AI. Books tables, kills no-shows, handles reviews."
 */
export declare function getVerticalDefinition(vertical: string): VerticalDefinition | undefined;
/**
 * Get all available vertical keys.
 *
 * @example
 * getAllVerticals();
 * // ['dine', 'beauty', 'property', 'travel', 'clean', ...]
 */
export declare function getAllVerticals(): string[];
/**
 * Get all vertical definitions as an array.
 */
export declare function getAllDefinitions(): VerticalDefinition[];
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
export declare function getToolsForVertical(vertical: string): OpenAIToolDefinition[];
/**
 * Get only the tools for a vertical that match a specific risk level.
 * Useful for building tiered autonomy: e.g., only auto-execute 'low' risk tools.
 *
 * @example
 * const safeDineTools = getToolsByRisk('dine', 'low');
 * // Returns only check_availability, get_menu, get_allergens
 */
export declare function getToolsByRisk(vertical: string, risk_level: 'low' | 'medium' | 'high' | 'critical'): OpenAIToolDefinition[];
/**
 * Get the autonomy level configuration for a vertical.
 *
 * @example
 * getAutonomyLevels('dine');
 * // { '0': { name: 'OFF', behavior: '...' }, '1': ..., '2': ..., '3': ... }
 */
export declare function getAutonomyLevels(vertical: string): Record<string, AutonomyLevel> | undefined;
/**
 * Get the proactive behaviors list for a vertical.
 * These are the things the agent should do WITHOUT being asked.
 *
 * @example
 * getProactiveBehaviors('dine');
 * // ['Send reservation reminder 24h before', 'Detect no-shows...', ...]
 */
export declare function getProactiveBehaviors(vertical: string): string[];
/**
 * Build a system prompt snippet for a given vertical and autonomy level.
 * Inject this into your LLM system prompt to configure agent behavior.
 *
 * @example
 * const systemPrompt = buildAgentSystemPrompt('dine', 2);
 * // Returns a formatted string describing the agent's identity, tools, and autonomy
 */
export declare function buildAgentSystemPrompt(vertical: string, autonomyLevel?: 0 | 1 | 2 | 3): string;
//# sourceMappingURL=index.d.ts.map