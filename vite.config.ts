import { defineConfig } from 'vite';

// GitHub Pages serves this site at /zork-underground-empire/, so the build
// must emit asset URLs under that base path. Without this, /assets/... links
// in the produced dist/index.html would resolve against the GitHub Pages
// apex instead of the project subpath, returning 404s.
export default defineConfig({
  base: '/zork-underground-empire/',
});