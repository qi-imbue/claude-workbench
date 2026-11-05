import { For } from 'solid-js';

import { BUNDLED_FONTS, bundledFamily } from '../fonts';
import { saveTerminalFont, terminalFont } from '../store';

const DEFAULT_CHOICE = '';
const CUSTOM_CHOICE = '__custom__';
const SIZES = [10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28];
const LINE_HEIGHTS = [90, 95, 100, 105, 110, 115, 120, 125, 130, 140, 150];
const LETTER_SPACINGS = [-2, -1, 0, 1, 2, 3, 4];

/** The listed values, plus the current one if it was saved some other way (the API takes more). */
const withCurrent = (list, current) => (list.includes(current) ? list : [...list, current].sort((a, b) => a - b));

/** The terminal font, size and spacing, beside the colour scheme. A custom family is anything installed on
 *  the machine running the browser, so unlike the bundled ones it is typed in rather than listed. */
export function FontPicker() {
  const family = () => terminalFont().family;
  const isBundled = (value) => BUNDLED_FONTS.some((name) => bundledFamily(name) === value);
  const choice = () => {
    if (family() === null) return DEFAULT_CHOICE;
    return BUNDLED_FONTS.find((name) => bundledFamily(name) === family()) ?? CUSTOM_CHOICE;
  };

  async function save(patch, select) {
    try {
      await saveTerminalFont(patch);
    } catch (err) {
      window.alert(err.message || String(err));
    }
    // Back to what is in effect, whether the save landed or not: a cancelled or rejected custom
    // font must not leave "Custom…" showing.
    const [key] = Object.keys(patch);
    const current = {
      terminal_font_size: terminalFont().size,
      terminal_line_height: terminalFont().lineHeight,
      terminal_letter_spacing: terminalFont().letterSpacing,
    };
    select.value = key in current ? String(current[key]) : choice();
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
      <NumberSelect
        id="font-size-picker"
        title="Terminal font size"
        values={withCurrent(SIZES, terminalFont().size)}
        value={terminalFont().size}
        label={(n) => `${n}px`}
        onPick={(n, select) => save({ terminal_font_size: n }, select)}
      />
      <NumberSelect
        id="line-height-picker"
        title="Line height, as a percentage of the font size. Installed fonts can't go below their own spacing."
        values={withCurrent(LINE_HEIGHTS, terminalFont().lineHeight)}
        value={terminalFont().lineHeight}
        label={(n) => `\u2195 ${n}%`}
        onPick={(n, select) => save({ terminal_line_height: n }, select)}
      />
      <NumberSelect
        id="letter-spacing-picker"
        title="Extra space between characters"
        values={withCurrent(LETTER_SPACINGS, terminalFont().letterSpacing)}
        value={terminalFont().letterSpacing}
        label={(n) => `\u2194 ${n > 0 ? '+' : ''}${n}px`}
        onPick={(n, select) => save({ terminal_letter_spacing: n }, select)}
      />
    </>
  );
}

function NumberSelect(props) {
  return (
    <select
      id={props.id}
      class="bar-select"
      title={props.title}
      aria-label={props.title}
      value={String(props.value)}
      onChange={(e) => props.onPick(Number(e.currentTarget.value), e.currentTarget)}
    >
      <For each={props.values}>{(n) => <option value={String(n)}>{props.label(n)}</option>}</For>
    </select>
  );
}
