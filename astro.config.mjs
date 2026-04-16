import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel'; // Tambahin ini

export default defineConfig({
  integrations: [tailwind()],
  output: 'server', // Tambahin ini (penting buat Vercel)
  adapter: vercel(), // Tambahin ini
  site: 'https://gowkan.vercel.app',
});