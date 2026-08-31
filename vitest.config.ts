import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            // Only the code that gets published: examples/ and teaching
            // material don't ship in the package (see "files" in package.json)
            // and measuring them would lower the number without saying anything useful.
            include: ['src/**/*.ts'],
            reporter: ['text', 'lcov'],
            thresholds: { statements: 100, functions: 100, lines: 100, branches: 94 },
        },
    },
});
