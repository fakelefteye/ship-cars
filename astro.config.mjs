import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  trailingSlash: 'never',
  adapter: vercel(),
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en', 'es', 'it'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});