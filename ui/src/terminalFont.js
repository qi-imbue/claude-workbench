import { BUNDLED_FONTS, bundledFamily } from './fonts';

// The default font follows iTerm2's text settings, as far as a browser can: Monaco at 17 (the
// size is DEFAULT_TERMINAL_FONT_SIZE in ui_settings.py). Monaco is the one that matters -- it's on
// every Mac -- and the rest are for everyone else. It is also every chosen font's fallback: the
// bundled fonts only carry alphabets, so the box drawing and symbols Claude Code's UI is made of
// come from here, and these fonts have them where a bare `monospace` often doesn't.
const DEFAULT_STACK = 'Monaco, Menlo, "DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace';

// The glyph xterm measures a cell with. Loading for it alone fetches just the basic Latin file of
// each weight; the browser fetches any other range itself, once text in it is drawn.
const MEASURED_GLYPH = 'W';

const withFallback = (family) => (family ? `${family}, ${DEFAULT_STACK}` : DEFAULT_STACK);

const bundledName = (family) => BUNDLED_FONTS.find((name) => bundledFamily(name) === family) ?? null;

/** Load both faces the terminal draws with. xterm measures one glyph to size every cell, and a
 *  webfont isn't fetched until something asks for it -- so a terminal that measured before it
 *  arrived would lay out the fallback font's cells for good. */
function loadFaces(fontFamily, size) {
  return Promise.all([
    document.fonts.load(`${size}px ${fontFamily}`, MEASURED_GLYPH),
    document.fonts.load(`bold ${size}px ${fontFamily}`, MEASURED_GLYPH),
  ]);
}

/** A font's natural line box as fractions of its size: what xterm makes a row of, before any
 *  lineHeight. Measured the way xterm's DOM renderer measures it, off a span at `normal` height. */
async function naturalMetrics(fontFamily) {
  await loadFaces(fontFamily, 100);
  const span = document.createElement('span');
  span.style.cssText = `position:absolute;visibility:hidden;white-space:pre;line-height:normal;font:100px ${fontFamily}`;
  span.textContent = MEASURED_GLYPH;
  document.body.appendChild(span);
  const height = span.getBoundingClientRect().height / 100;
  span.remove();
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `100px ${fontFamily}`;
  const m = ctx.measureText(MEASURED_GLYPH);
  return { height, ascentShare: m.fontBoundingBoxAscent / (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent) };
}

/** The bundled font's own @font-face rules, from the stylesheet fonts.js put on the page. */
function faceRules(name) {
  const rules = [];
  for (const sheet of document.styleSheets) {
    let list;
    try {
      list = sheet.cssRules;
    } catch (_) {
      continue; // a cross-origin sheet; ours are all same-origin
    }
    for (const rule of list) {
      if (rule instanceof CSSFontFaceRule && rule.style.getPropertyValue('font-family').replace(/["']/g, '') === name) {
        rules.push(rule);
      }
    }
  }
  return rules;
}

const aliases = new Map();

/** A copy of a bundled font whose line box is exactly `percent` of its size.
 *
 *  The bundled fonts declare tall line metrics -- they're made for editors, which want air between
 *  lines -- and xterm can only add to a font's height (its lineHeight is at least 1), never take
 *  away. So the copy carries ascent/descent overrides instead: the same files, reporting the line
 *  box asked for, split between ascent and descent as the font splits it so glyphs stay centred. */
function bundledAlias(name, percent) {
  const key = `${name}|${percent}`;
  if (!aliases.has(key)) {
    aliases.set(
      key,
      (async () => {
        const rules = faceRules(name);
        if (rules.length === 0) throw new Error(`no @font-face rules for ${name}`);
        const { ascentShare } = await naturalMetrics(bundledFamily(name));
        const alias = `wb ${name} ${percent}`;
        for (const rule of rules) {
          const face = new FontFace(alias, rule.style.getPropertyValue('src'), {
            weight: rule.style.getPropertyValue('font-weight') || 'normal',
            style: rule.style.getPropertyValue('font-style') || 'normal',
            unicodeRange: rule.style.getPropertyValue('unicode-range') || 'U+0-10FFFF',
            ascentOverride: `${percent * ascentShare}%`,
            descentOverride: `${percent * (1 - ascentShare)}%`,
            lineGapOverride: '0%',
          });
          document.fonts.add(face);
        }
        return alias;
      })(),
    );
  }
  return aliases.get(key);
}

/** xterm's font options for the saved settings, with every face they need already loaded.
 *
 *  Never rejects: a font that can't be set up falls back to the default stack at its natural
 *  spacing, which beats a terminal that never opens. */
export async function resolveTerminalFont({ size, family, lineHeight, letterSpacing }) {
  const target = lineHeight / 100;
  let fontFamily = withFallback(family);
  let xtermLineHeight = 1;
  try {
    const name = bundledName(family);
    if (name) {
      fontFamily = withFallback(`"${await bundledAlias(name, lineHeight)}"`);
    } else {
      // An installed font has no file to copy with new metrics, so it can only be spaced out.
      const { height } = await naturalMetrics(fontFamily);
      xtermLineHeight = Math.max(1, target / height);
    }
    await loadFaces(fontFamily, size);
  } catch (err) {
    console.warn('could not set up the terminal font; using the default', err);
    fontFamily = DEFAULT_STACK;
    xtermLineHeight = 1;
  }
  return { fontFamily, fontSize: size, lineHeight: xtermLineHeight, letterSpacing };
}
