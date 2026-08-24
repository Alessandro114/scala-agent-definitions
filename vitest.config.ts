import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            // Solo il codice che viene pubblicato: examples/ e materiale
            // didattico, non entra nel pacchetto (vedi "files" in package.json)
            // e misurarlo abbasserebbe il numero senza dire niente di utile.
            include: ['src/**/*.ts'],
            reporter: ['text', 'lcov'],
            thresholds: { statements: 100, functions: 100, lines: 100, branches: 94 },
        },
    },
});
