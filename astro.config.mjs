import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';

export default defineConfig({
  // Ajoute cette ligne pour activer le mode serveur
  output: 'server',

  adapter: vercel(),
});