import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // a few tests simulate minutes of play: with every file running at once they can pass the default 5 s
    testTimeout: 20_000,
  },
});
