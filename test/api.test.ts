// The package's public API. Every function here is a promise made to whoever
// installs it from npm: changing its behavior breaks someone else's code, which is
// why it must be locked down with tests and not just documented.

import { describe, it, expect } from 'vitest';
import {
    getVerticalDefinition,
    getAllVerticals,
    getAllDefinitions,
    getToolsForVertical,
    getToolsByRisk,
    getAutonomyLevels,
    getProactiveBehaviors,
    buildAgentSystemPrompt,
} from '../src/index.js';

const IGNOTO = 'verticale-che-non-esiste';

describe('getAllVerticals', () => {
    it('li restituisce tutti', () => {
        expect(getAllVerticals().length).toBeGreaterThan(10);
    });

    it('in ordine alfabetico, cosi l elenco e stabile fra una versione e l altra', () => {
        const v = getAllVerticals();
        expect(v).toEqual([...v].sort());
    });

    it('senza duplicati', () => {
        const v = getAllVerticals();
        expect(v.length).toBe(new Set(v).size);
    });

    it('include general, che e il ripiego', () => {
        expect(getAllVerticals()).toContain('general');
    });
});

describe('getVerticalDefinition', () => {
    it('trova un verticale esistente', () => {
        const d = getVerticalDefinition('dine');
        expect(d?.vertical).toBe('dine');
        expect(d?.tools.length).toBeGreaterThan(0);
    });

    it('restituisce undefined per uno ignoto, senza sollevare', () => {
        expect(getVerticalDefinition(IGNOTO)).toBeUndefined();
    });

    it('e sensibile alle maiuscole: DINE non e dine', () => {
        expect(getVerticalDefinition('DINE')).toBeUndefined();
    });

    it('ogni chiave elencata da getAllVerticals si risolve davvero', () => {
        for (const v of getAllVerticals()) {
            expect(getVerticalDefinition(v), v).toBeDefined();
        }
    });

    it('la cache non altera i dati fra due letture', () => {
        expect(getVerticalDefinition('dine')).toEqual(getVerticalDefinition('dine'));
    });
});

describe('getAllDefinitions', () => {
    it('ne restituisce quante sono le chiavi', () => {
        expect(getAllDefinitions().length).toBe(getAllVerticals().length);
    });
});

describe('getToolsForVertical', () => {
    it('produce il formato che le API di function calling si aspettano', () => {
        for (const t of getToolsForVertical('dine')) {
            expect(t.type).toBe('function');
            expect(typeof t.function.name).toBe('string');
            expect(typeof t.function.description).toBe('string');
            expect(t.function.parameters.type).toBe('object');
            expect(Array.isArray(t.function.parameters.required)).toBe(true);
        }
    });

    it('riporta un parametro per ogni parametro dichiarato', () => {
        const def = getVerticalDefinition('dine')!;
        const strumenti = getToolsForVertical('dine');
        for (const originale of def.tools) {
            const convertito = strumenti.find(s => s.function.name === originale.name)!;
            expect(Object.keys(convertito.function.parameters.properties).sort())
                .toEqual(Object.keys(originale.params).sort());
        }
    });

    it('in required finiscono solo i parametri obbligatori', () => {
        const def = getVerticalDefinition('dine')!;
        for (const originale of def.tools) {
            const attesi = Object.entries(originale.params)
                .filter(([, p]) => p.required).map(([k]) => k).sort();
            const convertito = getToolsForVertical('dine')
                .find(s => s.function.name === originale.name)!;
            expect([...convertito.function.parameters.required].sort(), originale.name).toEqual(attesi);
        }
    });

    it('non trascina risk_level e requires_db nello schema mandato all LLM', () => {
        // These are our own metadata: passing them to the API makes it respond
        // with a schema error, or - worse - the model reads them as parameters.
        for (const t of getToolsForVertical('dine')) {
            for (const p of Object.values(t.function.parameters.properties)) {
                expect(Object.keys(p).sort()).toEqual(['description', 'type']);
            }
        }
    });

    it('un verticale ignoto da un elenco vuoto, non un errore', () => {
        expect(getToolsForVertical(IGNOTO)).toEqual([]);
    });

    it('funziona per ogni verticale, non solo per dine', () => {
        for (const v of getAllVerticals()) {
            expect(getToolsForVertical(v).length, v).toBe(getVerticalDefinition(v)!.tools.length);
        }
    });
});

describe('getToolsByRisk', () => {
    it.each(['low', 'medium', 'high', 'critical'] as const)('filtra per rischio %s', (rischio) => {
        const def = getVerticalDefinition('dine')!;
        const attesi = def.tools.filter(t => t.risk_level === rischio).map(t => t.name).sort();
        expect(getToolsByRisk('dine', rischio).map(t => t.function.name).sort()).toEqual(attesi);
    });

    it('i quattro livelli insieme danno tutti gli strumenti', () => {
        const tutti = (['low', 'medium', 'high', 'critical'] as const)
            .flatMap(r => getToolsByRisk('dine', r).map(t => t.function.name)).sort();
        expect(tutti).toEqual(getToolsForVertical('dine').map(t => t.function.name).sort());
    });

    it('produce lo stesso formato di getToolsForVertical', () => {
        for (const t of getToolsByRisk('dine', 'low')) {
            expect(t.type).toBe('function');
            expect(t.function.parameters.type).toBe('object');
        }
    });

    it('un verticale ignoto da un elenco vuoto', () => {
        expect(getToolsByRisk(IGNOTO, 'low')).toEqual([]);
    });
});

describe('getAutonomyLevels', () => {
    it('restituisce i quattro livelli', () => {
        const a = getAutonomyLevels('dine')!;
        expect(Object.keys(a).sort()).toEqual(['0', '1', '2', '3']);
    });

    it('undefined per un verticale ignoto', () => {
        expect(getAutonomyLevels(IGNOTO)).toBeUndefined();
    });
});

describe('getProactiveBehaviors', () => {
    it('restituisce l elenco dichiarato', () => {
        expect(getProactiveBehaviors('dine')).toEqual(getVerticalDefinition('dine')!.proactive_behaviors);
    });

    it('elenco vuoto per un verticale ignoto, non undefined', () => {
        // Chi lo usa fa .map() sul risultato: undefined lo farebbe esplodere.
        expect(getProactiveBehaviors(IGNOTO)).toEqual([]);
    });
});

describe('buildAgentSystemPrompt', () => {
    it('contiene identita, strumenti e comportamenti proattivi', () => {
        const def = getVerticalDefinition('dine')!;
        const p = buildAgentSystemPrompt('dine');
        expect(p).toContain(def.agent_name);
        expect(p).toContain(def.agent_identity);
        for (const t of def.tools) expect(p, t.name).toContain(t.name);
        for (const b of def.proactive_behaviors) expect(p).toContain(b);
    });

    it('riporta il rischio accanto a ogni strumento', () => {
        const p = buildAgentSystemPrompt('dine');
        for (const t of getVerticalDefinition('dine')!.tools) {
            expect(p).toContain(`[risk: ${t.risk_level}]`);
        }
    });

    it('il livello predefinito e 2, cioe semi-automatico', () => {
        expect(buildAgentSystemPrompt('dine')).toBe(buildAgentSystemPrompt('dine', 2));
    });

    it.each([0, 1, 2, 3] as const)('il livello %i compare nel testo', (livello) => {
        const atteso = getAutonomyLevels('dine')![String(livello)].name;
        expect(buildAgentSystemPrompt('dine', livello)).toContain(atteso);
    });

    it('stringa vuota per un verticale ignoto, non un prompt inventato', () => {
        expect(buildAgentSystemPrompt(IGNOTO)).toBe('');
    });

    it('non lascia mai undefined nel testo, per nessun verticale', () => {
        for (const v of getAllVerticals()) {
            for (const l of [0, 1, 2, 3] as const) {
                expect(buildAgentSystemPrompt(v, l), `${v} livello ${l}`).not.toContain('undefined');
            }
        }
    });

    it('ripete sempre la regola di non inventare dati', () => {
        for (const v of getAllVerticals()) {
            expect(buildAgentSystemPrompt(v), v).toContain('NEVER invent data');
        }
    });
});
