import { defineConfig } from 'vite';
export default defineConfig({build:{outDir:'dist-ha',emptyOutDir:true,lib:{entry:'src/ha/card.ts',formats:['es'],fileName:()=> 'home-floor-studio-card.js'}}});
