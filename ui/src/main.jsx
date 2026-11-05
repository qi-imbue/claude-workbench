import { render } from 'solid-js/web';

import { App } from './App';
import './styles/index.css';

import { initTerminalFont } from './store';

// The terminal font is set up first -- usually a cached file or two -- so terminals open in it
// rather than opening in the default and redrawing a moment later.
initTerminalFont().finally(() => render(() => <App />, document.getElementById('root')));
