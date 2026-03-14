// @ts-check
import { defineConfig } from 'astro/config';

import vue from '@astrojs/vue';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  trailingSlash: 'always',
  integrations: [vue(), mdx()]
});
