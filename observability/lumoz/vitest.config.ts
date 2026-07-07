import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit:observability/lumoz',
    isolate: false,
    globals: true,
    environment: 'node',
  },
});
