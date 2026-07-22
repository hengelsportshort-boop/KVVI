import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://kvvi.onrender.com',
  integrations: [tailwind(), sitemap({
    filter: (page) => !page.includes('/admin/'),
    serialize: (item) => {
      if (item.url === 'https://kvvi.onrender.com/') {
        item.priority = 1.0;
        item.changefreq = 'daily';
      } else {
        item.priority = 0.7;
        item.changefreq = 'weekly';
      }
      return item;
    }
  })],
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