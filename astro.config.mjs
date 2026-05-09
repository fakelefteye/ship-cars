import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  trailingSlash: 'never',
  adapter: vercel(),
});