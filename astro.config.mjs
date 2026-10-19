import { defineConfig } from 'astro/config';

export default defineConfig({
  image: {
    // Figma exports are 2x; let Astro emit 1x + 2x webp variants.
    responsiveStyles: false,
  },
});
