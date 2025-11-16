import { defineConfig } from 'tsdown';

export default defineConfig({
    clean: true,
    dts: true,
    entry: ['src/index.ts'],
    format: ['es'],
    minify: true,
    sourcemap: true,
    target: 'node20',
});
