// I 21 file JSON sono il prodotto: il codice e solo il modo di leggerli.
// Un errore qui non da un'eccezione — da a un LLM uno strumento malformato,
// che e il tipo di guasto che si manifesta come "l'agente si comporta in modo
// strano" e che nessuno riesce a riprodurre.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const CARTELLA = join(RADICE, 'definitions');

const FILE = readdirSync(CARTELLA).filter(f => f.endsWith('.json'));
const DEFINIZIONI = FILE.map(f => ({
    file: f,
    chiave: f.replace(/\.json$/, ''),
    dati: JSON.parse(readFileSync(join(CARTELLA, f), 'utf8')),
}));

// `general` e il ripiego, non un verticale vendibile: i conteggi pubblici lo
// escludono, ed e cosi che il badge dichiara 20 su 21 file.
const VERTICALI = DEFINIZIONI.filter(d => d.chiave !== 'general');

const RISCHI = ['low', 'medium', 'high', 'critical'];

describe('i file ci sono e si leggono', () => {
    it('ce n e piu di uno (se va a zero, il percorso e sbagliato)', () => {
        expect(FILE.length).toBeGreaterThan(1);
    });

    it('ogni file e JSON valido', () => {
        for (const f of FILE) {
            expect(() => JSON.parse(readFileSync(join(CARTELLA, f), 'utf8')), f).not.toThrow();
        }
    });
});

describe('ogni definizione e ben formata', () => {
    it.each(DEFINIZIONI)('$file dichiara i campi obbligatori', ({ dati, file }) => {
        for (const campo of ['vertical', 'agent_name', 'agent_identity', 'description', 'tools']) {
            expect(dati[campo], `${file} manca ${campo}`).toBeDefined();
        }
        expect(Array.isArray(dati.tools), file).toBe(true);
    });

    // Il caricatore indicizza per `vertical`, non per nome file: se i due
    // divergono, getVerticalDefinition('dine') non trova dine.json e
    // l'errore e silenzioso — restituisce undefined, non solleva.
    it.each(DEFINIZIONI)('$file: la chiave vertical corrisponde al nome del file', ({ dati, chiave, file }) => {
        expect(dati.vertical, file).toBe(chiave);
    });

    it.each(DEFINIZIONI)('$file: nessun testo obbligatorio e vuoto', ({ dati, file }) => {
        for (const campo of ['agent_name', 'agent_identity', 'description']) {
            expect(String(dati[campo]).trim(), `${file}.${campo}`).not.toBe('');
        }
    });

    it('nessuna chiave vertical duplicata fra i file', () => {
        const chiavi = DEFINIZIONI.map(d => d.dati.vertical);
        expect(chiavi.length).toBe(new Set(chiavi).size);
    });
});

describe('gli strumenti', () => {
    it.each(DEFINIZIONI)('$file: ogni strumento ha nome, descrizione, rischio e parametri', ({ dati, file }) => {
        for (const t of dati.tools) {
            const dove = `${file} → ${t.name ?? '(senza nome)'}`;
            expect(typeof t.name, dove).toBe('string');
            expect(String(t.name).trim(), dove).not.toBe('');
            expect(typeof t.description, dove).toBe('string');
            expect(String(t.description).trim(), dove).not.toBe('');
            expect(RISCHI, `${dove}: risk_level "${t.risk_level}" non e fra ${RISCHI.join('|')}`)
                .toContain(t.risk_level);
            expect(typeof t.params, dove).toBe('object');
        }
    });

    it.each(DEFINIZIONI)('$file: nomi di strumento unici dentro il verticale', ({ dati, file }) => {
        const nomi = dati.tools.map((t: { name: string }) => t.name);
        const doppi = nomi.filter((n: string, i: number) => nomi.indexOf(n) !== i);
        expect(doppi, file).toEqual([]);
    });

    // Il parametro finisce dritto nello schema che si manda all'LLM: un `type`
    // sbagliato lo fa rifiutare dall'API, e un `required` non booleano
    // finisce silenziosamente fra i campi facoltativi.
    it.each(DEFINIZIONI)('$file: ogni parametro ha type, description e required booleano', ({ dati, file }) => {
        for (const t of dati.tools) {
            for (const [nome, p] of Object.entries(t.params as Record<string, {
                type: string; description: string; required: unknown;
            }>)) {
                const dove = `${file} → ${t.name}.${nome}`;
                expect(typeof p.type, dove).toBe('string');
                expect(String(p.type).trim(), dove).not.toBe('');
                expect(typeof p.description, dove).toBe('string');
                expect(typeof p.required, `${dove}: required deve essere booleano`).toBe('boolean');
            }
        }
    });

    it('ogni verticale ha almeno uno strumento', () => {
        const vuoti = VERTICALI.filter(d => d.dati.tools.length === 0).map(d => d.file);
        expect(vuoti).toEqual([]);
    });
});

describe('livelli di autonomia e comportamenti proattivi', () => {
    it.each(VERTICALI)('$file: dichiara i quattro livelli, da 0 a 3', ({ dati, file }) => {
        expect(dati.autonomy_levels, file).toBeDefined();
        for (const l of ['0', '1', '2', '3']) {
            expect(dati.autonomy_levels[l], `${file}: manca il livello ${l}`).toBeDefined();
            expect(typeof dati.autonomy_levels[l].name, `${file}.${l}.name`).toBe('string');
            expect(typeof dati.autonomy_levels[l].behavior, `${file}.${l}.behavior`).toBe('string');
        }
    });

    it.each(VERTICALI)('$file: i comportamenti proattivi sono testi non vuoti', ({ dati, file }) => {
        expect(Array.isArray(dati.proactive_behaviors), file).toBe(true);
        for (const b of dati.proactive_behaviors) {
            expect(typeof b, file).toBe('string');
            expect(String(b).trim(), file).not.toBe('');
        }
    });
});

describe('il README dice la verita sui numeri', () => {
    // Il badge diceva 79 strumenti quando ne esistevano 84. Nessuno se ne
    // accorge finche non lo conta, e chi legge il repo si fida.
    const readme = readFileSync(join(RADICE, 'README.md'), 'utf8');

    it('il numero di verticali nel badge corrisponde ai file, escluso general', () => {
        const m = /verticals-(\d+)/.exec(readme);
        expect(m, 'badge dei verticali non trovato nel README').not.toBeNull();
        expect(Number(m![1])).toBe(VERTICALI.length);
    });

    it('il numero di strumenti nel badge corrisponde a quelli reali, escluso general', () => {
        const reali = VERTICALI.reduce((n, d) => n + d.dati.tools.length, 0);
        const m = /tools-(\d+)/.exec(readme);
        expect(m, 'badge degli strumenti non trovato nel README').not.toBeNull();
        expect(Number(m![1])).toBe(reali);
    });
});

describe('e lo dice anche fuori dai badge', () => {
    const readme = readFileSync(join(RADICE, 'README.md'), 'utf8');
    const reali = VERTICALI.reduce((n, d) => n + d.dati.tools.length, 0);

    // Il numero compariva due volte: nel badge e nella tabella dei repo in
    // fondo. Correggere solo il badge lascia la seconda bugia in piedi, ed e
    // quella che legge chi arriva in fondo alla pagina, cioe chi e interessato.
    it('ogni "N tool definitions" nel testo riporta il numero vero', () => {
        const citazioni = [...readme.matchAll(/(\d+)\s+(?:AI\s+)?tool definitions/gi)].map(m => Number(m[1]));
        expect(citazioni.length, 'nessuna citazione trovata: il README e cambiato forma').toBeGreaterThan(0);
        for (const n of citazioni) expect(n).toBe(reali);
    });

    it('ogni "N verticals" nel testo riporta il numero vero', () => {
        const citazioni = [...readme.matchAll(/(\d+)\s+(?:business\s+)?verticals\b/gi)].map(m => Number(m[1]));
        for (const n of citazioni) expect(n).toBe(VERTICALI.length);
    });
});
