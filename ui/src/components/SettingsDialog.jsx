import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';

import { BILLING_LABELS } from '../billing';
import { BUNDLED_FONTS, bundledFamily } from '../fonts';
import { refreshSettings, saveArchiveRetention, saveDefaultBilling, saveTerminalFont, state, terminalFont } from '../store';
import { terminalFontFamily } from './TerminalPane';

const DEFAULT_CHOICE = '';
const CUSTOM_CHOICE = '__custom__';

/** The settings page: which billing mode new workspaces get, whether each mode has anything to
 *  bill to, the terminal font, and how long archived workspaces are kept before they are deleted. The subscription half is where `claude auth login` gets explained, since that is
 *  the one credential the workbench can't fetch for you.
 *
 *  Reads through to the server on open — the login state lives in ~/.claude and can change from
 *  any terminal, so a cached answer here would be wrong exactly when it matters.
 */
export function SettingsDialog(props) {
  const [error, setError] = createSignal('');
  const [checking, setChecking] = createSignal(false);
  const settings = () => state.settings;
  const subscription = () => settings()?.subscription;

  async function recheck() {
    setError('');
    setChecking(true);
    try {
      await refreshSettings();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setChecking(false);
    }
  }

  async function chooseDefault(mode) {
    setError('');
    try {
      await saveDefaultBilling(mode);
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function chooseRetention(input) {
    setError('');
    const days = Number(input.value);
    if (!Number.isInteger(days) || days < 0) {
      setError('Keep archived workspaces for 0 (forever) or a whole number of days.');
      input.value = settings()?.archive_retention_days ?? '';
      return;
    }
    try {
      await saveArchiveRetention(days);
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  // Custom is a mode as well as a value: picking it shows the text box before anything is typed.
  const [customMode, setCustomMode] = createSignal(false);
  const customFamily = () => {
    const family = terminalFont().family;
    return family !== null && !BUNDLED_FONTS.some((name) => bundledFamily(name) === family);
  };
  const fontChoice = () => {
    const family = terminalFont().family;
    if (customMode() || customFamily()) return CUSTOM_CHOICE;
    if (family === null) return DEFAULT_CHOICE;
    return BUNDLED_FONTS.find((name) => bundledFamily(name) === family);
  };
  const previewFamily = () => terminalFontFamily(terminalFont().family);

  function pickFont(choice) {
    setCustomMode(choice === CUSTOM_CHOICE);
    if (choice === CUSTOM_CHOICE) return;
    chooseFont({ terminal_font_family: choice === DEFAULT_CHOICE ? null : bundledFamily(choice) });
  }

  async function chooseFont(patch, input) {
    setError('');
    try {
      await saveTerminalFont(patch);
    } catch (err) {
      setError(err.message || String(err));
      // Show what is actually in effect, not the rejected value.
      const font = terminalFont();
      if (input) input.value = 'terminal_font_size' in patch ? font.size : (font.family ?? '');
    }
  }

  onMount(() => {
    recheck();
    const onKey = (e) => e.key === 'Escape' && props.onClose();
    window.addEventListener('keydown', onKey);
    onCleanup(() => window.removeEventListener('keydown', onKey));
  });

  return (
    <div id="wb-modal-backdrop" onClick={(e) => e.target.id === 'wb-modal-backdrop' && props.onClose()}>
      <div class="wb-modal wb-settings">
        <h2>Settings</h2>

        <section>
          <h3>Billing for new workspaces</h3>
          <label>
            Default
            <select
              value={settings()?.default_billing || 'api'}
              disabled={!settings()}
              onChange={(e) => chooseDefault(e.currentTarget.value)}
            >
              <option value="api">{BILLING_LABELS.api}</option>
              <option value="subscription">{BILLING_LABELS.subscription}</option>
            </select>
          </label>
          <p class="wb-hint">
            Each workspace is created with one of these and keeps it, so changing this leaves
            existing workspaces — and the conversations in them — on what they started with. The
            workspace dialog can override it per workspace.
          </p>
        </section>

        <section>
          <h3>Terminal font</h3>
          <label>
            Size (px)
            <input
              type="number"
              min="6"
              max="48"
              step="1"
              value={terminalFont().size}
              onChange={(e) => chooseFont({ terminal_font_size: Number(e.currentTarget.value) }, e.currentTarget)}
            />
          </label>
          <label>
            Font
            <select value={fontChoice()} onChange={(e) => pickFont(e.currentTarget.value)}>
              <option value={DEFAULT_CHOICE}>Default (Monaco, Menlo, …)</option>
              <For each={BUNDLED_FONTS}>{(name) => <option value={name}>{name}</option>}</For>
              <option value={CUSTOM_CHOICE}>Custom…</option>
            </select>
          </label>
          <Show when={fontChoice() === CUSTOM_CHOICE}>
            <label>
              Custom font
              <input
                type="text"
                placeholder={'"Hack", Menlo'}
                value={customFamily() ? (terminalFont().family ?? '') : ''}
                onChange={(e) =>
                  chooseFont({ terminal_font_family: e.currentTarget.value.trim() || null }, e.currentTarget)
                }
              />
            </label>
            <p class="wb-hint">
              Any CSS font-family list. Unlike the fonts above, it has to be installed on the
              computer running this browser.
            </p>
          </Show>
          <p class="font-preview" style={{ 'font-family': previewFamily() }}>
            The quick brown fox — 0O 1lI {'{}'} [] =&gt; !=
          </p>
        </section>

        <section>
          <h3>Archived workspaces</h3>
          <label>
            Delete after (days)
            <input
              type="number"
              min="0"
              step="1"
              value={settings()?.archive_retention_days ?? ''}
              disabled={!settings()}
              onChange={(e) => chooseRetention(e.currentTarget)}
            />
          </label>
          <p class="wb-hint">
            An archived workspace's directory is deleted for good once it has been archived this
            long, along with any work in it that was never pushed. 0 keeps them forever.
          </p>
        </section>

        <section>
          <h3>Claude subscription</h3>
          <Show when={subscription()} fallback={<p class="wb-status">checking…</p>}>
            <Show
              when={subscription().logged_in}
              fallback={
                <>
                  <p class="wb-status bad">Not signed in.</p>
                  <p class="wb-hint">
                    Run <code>claude auth login</code> in any terminal and follow the link it
                    prints. Credentials are stored in <code>~/.claude</code>, which is on the
                    app's persistent disk, so this survives redeploys and only has to be done
                    once.
                  </p>
                  <Show when={subscription().detail}>
                    <p class="wb-hint">{subscription().detail}</p>
                  </Show>
                </>
              }
            >
              <p class="wb-status good">
                Signed in{subscription().account ? ` as ${subscription().account}` : ''}.
              </p>
              <p class="wb-hint">
                Subscription-billed workspaces use these credentials. <code>claude auth logout</code>{' '}
                in a terminal signs out.
              </p>
            </Show>
          </Show>
        </section>

        <section>
          <h3>API key</h3>
          <Show when={settings()} fallback={<p class="wb-status">checking…</p>}>
            <Show
              when={settings().api_key_available}
              fallback={
                <>
                  <p class="wb-status bad">No ANTHROPIC_API_KEY.</p>
                  <p class="wb-hint">
                    Add <code>ANTHROPIC_API_KEY</code> to the secrets app and restart this app, or
                    export it by hand in a terminal.
                  </p>
                </>
              }
            >
              <p class="wb-status good">Available from the secrets app.</p>
            </Show>
          </Show>
        </section>

        <Show when={error()}>
          <p class="wb-error">{error()}</p>
        </Show>
        <div class="wb-actions">
          <button class="wb-btn" type="button" disabled={checking()} onClick={recheck}>
            {checking() ? 'Checking…' : 'Check again'}
          </button>
          <button class="wb-btn" type="button" onClick={props.onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
