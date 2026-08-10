import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: './',
    include: ['src/**/*.spec.ts'],
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  ],
});
