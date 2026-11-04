import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        plan2024: resolve(import.meta.dirname, 'plan-2024.html'),
        plan1982: resolve(import.meta.dirname, 'plan-1982.html'),
        planRrhh2024: resolve(import.meta.dirname, 'plan-rrhh-2024.html'),
        planRrhh1982: resolve(import.meta.dirname, 'plan-rrhh-1982.html'),
      },
    },
  },
});