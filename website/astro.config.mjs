import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'

export default defineConfig({
  site: 'https://zhishuda.com',
  integrations: [tailwind()]
})
