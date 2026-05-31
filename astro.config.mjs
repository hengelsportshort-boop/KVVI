import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://kvvi-production.up.railway.app',
  integrations: [tailwind(), sitemap()],
  output: 'server',
  adapter: node({
    mode: 'middleware',
  }),
  server: {
    host: true,
  },
  devToolbar: {
    enabled: false,
  },
  security: {
    checkOrigin: false,
  },
});