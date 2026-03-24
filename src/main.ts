import './style.css';
import { createGame } from './game/createGame';
import { loadConfiguredMods } from './game/modLoader';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app root element');
}

app.innerHTML = `
  <div id="game-root"></div>
  <pre id="boot-log" aria-live="polite"></pre>
`;

const bootLog = document.querySelector<HTMLPreElement>('#boot-log');
const debugBoot = new URLSearchParams(window.location.search).has('debug');

function log(line: string, forceVisible: boolean = false): void {
  if (!bootLog) return;
  if (debugBoot || forceVisible) bootLog.classList.add('visible');
  bootLog.textContent = `${bootLog.textContent ?? ''}${line}\n`;
}

window.addEventListener('error', (event) => {
  const message = event.error instanceof Error ? `${event.error.name}: ${event.error.message}` : String(event.message);
  log(`[error] ${message}`, true);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error ? `${event.reason.name}: ${event.reason.message}` : String(event.reason);
  log(`[rejection] ${reason}`, true);
});

async function boot(): Promise<void> {
  if (debugBoot) log('Booting Phaser...');
  await loadConfiguredMods(log);
  createGame('game-root');
  if (debugBoot) log('Phaser started. If canvas is blank, check errors above.');
}

boot().catch((error) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  log(`[boot failed] ${message}`, true);
  throw error;
});
