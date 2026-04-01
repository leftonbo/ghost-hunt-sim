import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/ghost-hunt-sim/' : '/',
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
}))
