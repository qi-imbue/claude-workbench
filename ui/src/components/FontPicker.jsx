import { For, Show } from 'solid-js';

import { BUNDLED_FONTS, bundledFamily } from '../fonts';
import { saveTerminalFont, terminalFont } from '../store';

const DEFAULT_CHOICE = '';
const CUSTOM_CHOICE = '__custom__';
const SIZES = [10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28];

/** The terminal font and size, beside the colour scheme. A custom family is anything installed on
 *  the machine running the browser, so unlike the bundled ones it is typed in rather than listed. */
export function FontPicker() {
  const family = () => terminalFont().family;
  const isBundled = (value) => BUNDLED_FONTS.some((name) => bundledFamily(name) === value);
  const choice = () => {
    if (family() === null) return DEFAULT_CHOICE;
    return BUNDLED_FONTS.find((name) => bundledFamily(name) === family()) ?? CUSTOM_CHOICE;
  };
  // A size saved some other way (the API takes 6-48) still shows as itself.
  const sizes = () => (SIZES.includes(terminalFont().size) ? SIZES : [...SIZES, terminalFont().size].sort((a, b) => a - b));

  async function save(patch, select) {
    try {
      await saveTerminalFont(patch);
    } catch (err) {
      window.alert(err.message || String(err));
    }
    // Back to what is in effect, whether the save landed or not: a cancelled or rejected custom
    // font must not leave "Custom…" showing.
    select.value = 'terminal_font_size' in patch ? String(terminalFont().size) : choice();
  }

  function pickFamily(select) {
    const value = select.value;
    if (value === DEFAULT_CHOICE) return save({ terminal_font_family: null }, select);
    if (value !== CUSTOM_CHOICE) return save({ terminal_font_family: bundledFamily(value) }, select);
    const typed = window.prompt(
      'Font installed on this computer, as a CSS font-family list (e.g. "Hack", Menlo). Empty for the default.',
      family() && !isBundled(family()) ? family() : '',
    );
    if (typed === null) {
      select.value = choice();
      return;
    }
    save({ terminal_font_family: typed.trim() || null }, select);
  }

  return (
    <>
      <select
        id="font-picker"
        class="bar-select"
        title="Terminal font"
        aria-label="Terminal font"
        value={choice()}
        onChange={(e) => pickFamily(e.currentTarget)}
      >
        <option value={DEFAULT_CHOICE}>Default font</option>
        <For each={BUNDLED_FONTS}>{(name) => <option value={name}>{name}</option>}</For>
        <option value={CUSTOM_CHOICE}>
          {choice() === CUSTOM_CHOICE ? `Custom: ${family()}` : 'Custom…'}
        </option>
      </select>
      <select
        id="font-size-picker"
        class="bar-select"
        title="Terminal font size"
        aria-label="Terminal font size"
        value={String(terminalFont().size)}
        onChange={(e) => save({ terminal_font_size: Number(e.currentTarget.value) }, e.currentTarget)}
      >
        <For each={sizes()}>{(size) => <option value={String(size)}>{size}px</option>}</For>
      </select>
    </>
  );
}
