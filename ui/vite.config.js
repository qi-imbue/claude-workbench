import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

/** Measure glyphs in xterm's DOM renderer to the subpixel, not to the whole pixel.
 *
 *  xterm sizes a glyph by laying out 32 of them and dividing `offsetWidth` by 32, but offsetWidth
 *  is rounded to an integer: Monaco at 17px is 10.2px a glyph, and 326 / 32 says 10.1875. The
 *  renderer then pads every glyph with letter-spacing to make up the difference to the cell, so
 *  each one comes out wider than its cell -- and Firefox rounds that padding up to its 1/60px
 *  layout unit -- until a wide terminal's last column runs a few pixels past the row and gets
 *  clipped. Still there in 6.1's betas. The build fails if the line ever changes, so an xterm
 *  upgrade can't drop the fix silently. */
function xtermSubpixelGlyphWidth() {
  const measure = 'return i.textContent=t.repeat(32),i.offsetWidth/32';
  return {
    name: 'xterm-subpixel-glyph-width',
    transform(code, id) {
      if (!/[\\/]@xterm[\\/]xterm[\\/]lib[\\/]xterm\.mjs$/.test(id)) return null;
      if (!code.includes(measure)) {
        throw new Error('xterm-subpixel-glyph-width: WidthCache._measure has changed; recheck the patch');
      }
      return code.replace(measure, 'return i.textContent=t.repeat(32),i.getBoundingClientRect().width/32');
    },
  };
}

/** Drop fontsource's .woff fallbacks, keeping only .woff2.
 *
 *  Every @font-face lists a .woff after its .woff2 for browsers too old to read woff2, which no
 *  browser that runs this app is. Left in, they roughly double what the bundled fonts add to the
 *  image, for files that are never fetched. Fails the build if nothing matched, so a change to
 *  fontsource's CSS can't quietly bring them back. */
function woff2Only() {
  const fallback = /,\s*url\([^)]*\.woff\) format\('woff'\)/g;
  return {
    name: 'woff2-only',
    enforce: 'pre',
    transform(code, id) {
      if (!/[\\/]@fontsource[\\/][^\\/]+[\\/][^\\/]+\.css$/.test(id)) return null;
      const stripped = code.replace(fallback, '');
      if (stripped === code) throw new Error(`woff2-only: no .woff fallback found in ${id}; recheck the pattern`);
      return stripped;
    },
  };
}

// Built assets land in the directory Litestar serves as /static/ui, under fixed names: the page is
// a Jinja template that references them by name, and the server sends no-store for /static.
export default defineConfig({
  plugins: [solid(), xtermSubpixelGlyphWidth(), woff2Only()],
  // The server mounts the fonts directory at /fonts, outside no-store /static (see app.py).
  experimental: {
    renderBuiltUrl: (filename) => (filename.startsWith('fonts/') ? `/${filename}` : { relative: true }),
  },
  build: {
    outDir: '../src/server/static/ui',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.jsx',
      output: {
        entryFileNames: 'bundle.js',
        chunkFileNames: '[name].js',
        // Fonts keep their own names, which say which font and weight each file is, plus a content
        // hash: the server caches them for a year, which is only safe if a changed file gets a new
        // name.
        assetFileNames: (info) =>
          /\.woff2$/.test(info.names?.[0] ?? '') ? 'fonts/[name]-[hash][extname]' : 'bundle.[ext]',
      },
    },
  },
});
