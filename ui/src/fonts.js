// Monospace fonts shipped with the workbench, so a terminal can use one whatever is installed on
// the machine running the browser. Only regular and bold, in Latin and Latin Extended, are bundled.
// Each @font-face carries a unicode-range, so a browser fetches a file only once a terminal
// actually draws text in that font, that weight and that range: unused fonts cost the image a
// few hundred KB each and the user nothing. Iosevka is left out on purpose: its huge glyph set
// makes each weight about 1MB, thirty times the others. (DM Mono has no bold, so its 500 stands in for one.)
import '@fontsource/anonymous-pro/latin-400.css';
import '@fontsource/anonymous-pro/latin-700.css';
import '@fontsource/anonymous-pro/latin-ext-400.css';
import '@fontsource/anonymous-pro/latin-ext-700.css';
import '@fontsource/atkinson-hyperlegible-mono/latin-400.css';
import '@fontsource/atkinson-hyperlegible-mono/latin-700.css';
import '@fontsource/atkinson-hyperlegible-mono/latin-ext-400.css';
import '@fontsource/atkinson-hyperlegible-mono/latin-ext-700.css';
import '@fontsource/cascadia-code/latin-400.css';
import '@fontsource/cascadia-code/latin-700.css';
import '@fontsource/cascadia-code/latin-ext-400.css';
import '@fontsource/cascadia-code/latin-ext-700.css';
import '@fontsource/commit-mono/latin-400.css';
import '@fontsource/commit-mono/latin-700.css';
import '@fontsource/courier-prime/latin-400.css';
import '@fontsource/courier-prime/latin-700.css';
import '@fontsource/courier-prime/latin-ext-400.css';
import '@fontsource/courier-prime/latin-ext-700.css';
import '@fontsource/dm-mono/latin-400.css';
import '@fontsource/dm-mono/latin-500.css';
import '@fontsource/dm-mono/latin-ext-400.css';
import '@fontsource/dm-mono/latin-ext-500.css';
import '@fontsource/fira-code/latin-400.css';
import '@fontsource/fira-code/latin-700.css';
import '@fontsource/fira-code/latin-ext-400.css';
import '@fontsource/fira-code/latin-ext-700.css';
import '@fontsource/geist-mono/latin-400.css';
import '@fontsource/geist-mono/latin-700.css';
import '@fontsource/geist-mono/latin-ext-400.css';
import '@fontsource/geist-mono/latin-ext-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-ext-400.css';
import '@fontsource/ibm-plex-mono/latin-ext-700.css';
import '@fontsource/inconsolata/latin-400.css';
import '@fontsource/inconsolata/latin-700.css';
import '@fontsource/inconsolata/latin-ext-400.css';
import '@fontsource/inconsolata/latin-ext-700.css';
import '@fontsource/intel-one-mono/latin-400.css';
import '@fontsource/intel-one-mono/latin-700.css';
import '@fontsource/intel-one-mono/latin-ext-400.css';
import '@fontsource/intel-one-mono/latin-ext-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import '@fontsource/jetbrains-mono/latin-ext-400.css';
import '@fontsource/jetbrains-mono/latin-ext-700.css';
import '@fontsource/monaspace-neon/latin-400.css';
import '@fontsource/monaspace-neon/latin-700.css';
import '@fontsource/noto-sans-mono/latin-400.css';
import '@fontsource/noto-sans-mono/latin-700.css';
import '@fontsource/noto-sans-mono/latin-ext-400.css';
import '@fontsource/noto-sans-mono/latin-ext-700.css';
import '@fontsource/red-hat-mono/latin-400.css';
import '@fontsource/red-hat-mono/latin-700.css';
import '@fontsource/red-hat-mono/latin-ext-400.css';
import '@fontsource/red-hat-mono/latin-ext-700.css';
import '@fontsource/roboto-mono/latin-400.css';
import '@fontsource/roboto-mono/latin-700.css';
import '@fontsource/roboto-mono/latin-ext-400.css';
import '@fontsource/roboto-mono/latin-ext-700.css';
import '@fontsource/source-code-pro/latin-400.css';
import '@fontsource/source-code-pro/latin-700.css';
import '@fontsource/source-code-pro/latin-ext-400.css';
import '@fontsource/source-code-pro/latin-ext-700.css';
import '@fontsource/space-mono/latin-400.css';
import '@fontsource/space-mono/latin-700.css';
import '@fontsource/space-mono/latin-ext-400.css';
import '@fontsource/space-mono/latin-ext-700.css';
import '@fontsource/ubuntu-mono/latin-400.css';
import '@fontsource/ubuntu-mono/latin-700.css';
import '@fontsource/ubuntu-mono/latin-ext-400.css';
import '@fontsource/ubuntu-mono/latin-ext-700.css';
import '@fontsource/victor-mono/latin-400.css';
import '@fontsource/victor-mono/latin-700.css';
import '@fontsource/victor-mono/latin-ext-400.css';
import '@fontsource/victor-mono/latin-ext-700.css';

/** Family names exactly as the @font-face rules above declare them, in the order the picker lists them. */
export const BUNDLED_FONTS = [
  'Anonymous Pro',
  'Atkinson Hyperlegible Mono',
  'Cascadia Code',
  'Commit Mono',
  'Courier Prime',
  'DM Mono',
  'Fira Code',
  'Geist Mono',
  'IBM Plex Mono',
  'Inconsolata',
  'Intel One Mono',
  'JetBrains Mono',
  'Monaspace Neon',
  'Noto Sans Mono',
  'Red Hat Mono',
  'Roboto Mono',
  'Source Code Pro',
  'Space Mono',
  'Ubuntu Mono',
  'Victor Mono',
];

/** The CSS font-family value for a bundled font: quoted, since most of the names have spaces. */
export const bundledFamily = (name) => `"${name}"`;
