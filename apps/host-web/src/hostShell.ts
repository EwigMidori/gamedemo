import {
  ENGINE_PACKAGE_NAME,
  ENGINE_VERSION
} from "@gamedemo/engine-core";
import type { RuntimeProfileDefinition } from "@gamedemo/mod-loader";
import type { AssembledRuntime } from "@gamedemo/engine-runtime";

export interface HostShellRefs {
  previewRoot: HTMLElement;
  externalModUrlsInput: HTMLTextAreaElement;
  applyExternalModsButton: HTMLButtonElement;
  runtimeProfileSelect: HTMLSelectElement;
  dayValue: HTMLElement;
  timeValue: HTMLElement;
  hungerValue: HTMLElement;
  healthValue: HTMLElement;
  playerValue: HTMLElement;
  resourcesValue: HTMLElement;
  targetTileValue: HTMLElement;
  focusedObjectValue: HTMLElement;
  focusedObjectSummaryValue: HTMLElement;
  focusedObjectDetailsRoot: HTMLElement;
  selectedSlotValue: HTMLElement;
  selectedItemDetailsRoot: HTMLElement;
  selectedItemActionsRoot: HTMLElement;
  combinedActionsRoot: HTMLElement;
  primaryInteractionsRoot: HTMLElement;
  secondaryInteractionsRoot: HTMLElement;
  contextInteractionsRoot: HTMLElement;
  utilityCommandsRoot: HTMLElement;
  moveTargetValue: HTMLElement;
  movePathValue: HTMLElement;
  structuresValue: HTMLElement;
  inventoryList: HTMLElement;
  logValue: HTMLElement;
  saveSessionButton: HTMLButtonElement;
  loadSessionButton: HTMLButtonElement;
}

type HostShellMode = "game" | "debug";

class HostShellElementFactory {
  static createDetachedRefs(previewRoot: HTMLElement): HostShellRefs {
    return {
      previewRoot,
      externalModUrlsInput: document.createElement("textarea"),
      applyExternalModsButton: document.createElement("button"),
      runtimeProfileSelect: document.createElement("select"),
      dayValue: document.createElement("div"),
      timeValue: document.createElement("div"),
      hungerValue: document.createElement("div"),
      healthValue: document.createElement("div"),
      playerValue: document.createElement("div"),
      resourcesValue: document.createElement("div"),
      targetTileValue: document.createElement("div"),
      focusedObjectValue: document.createElement("div"),
      focusedObjectSummaryValue: document.createElement("div"),
      focusedObjectDetailsRoot: document.createElement("div"),
      selectedSlotValue: document.createElement("div"),
      selectedItemDetailsRoot: document.createElement("div"),
      selectedItemActionsRoot: document.createElement("div"),
      combinedActionsRoot: document.createElement("div"),
      primaryInteractionsRoot: document.createElement("div"),
      secondaryInteractionsRoot: document.createElement("div"),
      contextInteractionsRoot: document.createElement("div"),
      utilityCommandsRoot: document.createElement("div"),
      moveTargetValue: document.createElement("div"),
      movePathValue: document.createElement("div"),
      structuresValue: document.createElement("div"),
      inventoryList: document.createElement("ul"),
      logValue: document.createElement("p"),
      saveSessionButton: document.createElement("button"),
      loadSessionButton: document.createElement("button")
    };
  }
}

function getRequiredElement<T extends Element>(
  root: ParentNode,
  selector: string
): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
}

function renderOptions(
  profiles: RuntimeProfileDefinition[],
  selectedProfileId: string
): string {
  return profiles
    .map((entry) => (
      `<option value="${entry.id}"${entry.id === selectedProfileId ? " selected" : ""}>${entry.label}</option>`
    ))
    .join("");
}

export const HostShell = {
  render(
    app: HTMLDivElement,
    runtime: AssembledRuntime,
    profiles: RuntimeProfileDefinition[],
    selectedProfile: RuntimeProfileDefinition,
    externalModUrls: string[],
    externalModCount: number,
    mode: HostShellMode = "game"
  ): HostShellRefs {
    if (mode === "game") {
      app.innerHTML = `
        <main class="fullscreen-game">
          <div id="game-preview" class="game-preview game-preview-fullscreen"></div>
        </main>
      `;
      return HostShellElementFactory.createDetachedRefs(
        getRequiredElement(app, "#game-preview")
      );
    }

    const installedMods = runtime.profile.mods
      .map((entry) => `<li><strong>${entry.id}</strong><span>${entry.version}</span></li>`)
      .join("");
    const items = runtime.content.items
      .map((entry) => `<li><strong>${entry.id}</strong><span>${entry.label}</span></li>`)
      .join("");
    const structures = runtime.content.structures
      .map((entry) => `<li><strong>${entry.id}</strong><span>${entry.label}</span></li>`)
      .join("");
    const systems = runtime.systems
      .map((entry) => `<li><strong>${entry.id}</strong><span>${entry.phase}</span></li>`)
      .join("");
    const panels = runtime.uiPanels
      .map((entry) => `<li><strong>${entry.title}</strong><span>${entry.body}</span></li>`)
      .join("");
    const actions = runtime.actions
      .map((entry) => `<li><strong>${entry.id}</strong><span>${entry.label}</span></li>`)
      .join("");

    const shellMarkup = `
      <main class="shell">
        <section class="panel">
          <p class="eyebrow">Host Runtime</p>
          <h1>Workspace Rewrite Bootstrapped</h1>
          <p class="lede">
            The host is now assembling runtime content, worldgen, commands, UI panels,
            and a Phaser world preview from workspace and external mods.
          </p>
          <section class="profile-select">
            <label for="runtime-profile">Runtime Profile</label>
            <select id="runtime-profile">${renderOptions(profiles, selectedProfile.id)}</select>
            <p class="profile-description">${selectedProfile.description ?? ""}</p>
          </section>
          <section class="external-mods">
            <label for="external-mod-urls">External Mod URLs</label>
            <textarea id="external-mod-urls" rows="3" placeholder="https://example.com/my-mod.js">${externalModUrls.join(", ")}</textarea>
            <button id="apply-external-mods" type="button">Apply External Mods</button>
          </section>
          <div id="game-preview" class="game-preview"></div>
          <dl class="meta">
            <div><dt>Engine package</dt><dd>${ENGINE_PACKAGE_NAME}</dd></div>
            <div><dt>Engine version</dt><dd>${ENGINE_VERSION}</dd></div>
            <div><dt>Installed mods</dt><dd>${runtime.profile.mods.length}</dd></div>
            <div><dt>External mods</dt><dd>${externalModCount}</dd></div>
            <div><dt>Profile root</dt><dd>${selectedProfile.id}</dd></div>
            <div><dt>Content entries</dt><dd>${runtime.content.items.length + runtime.content.structures.length + runtime.content.terrains.length}</dd></div>
            <div><dt>Runtime systems</dt><dd>${runtime.systems.length}</dd></div>
            <div><dt>HUD panels</dt><dd>${runtime.uiPanels.length}</dd></div>
          </dl>
          <section class="session">
            <h2>Live Session</h2>
            <dl class="session-stats">
              <div><dt>Day</dt><dd id="session-day">1</dd></div>
              <div><dt>Time</dt><dd id="session-time">0.0s</dd></div>
              <div><dt>Hunger</dt><dd id="session-hunger">0</dd></div>
              <div><dt>Health</dt><dd id="session-health">0</dd></div>
              <div><dt>Player</dt><dd id="session-player">0,0</dd></div>
              <div><dt>Resources</dt><dd id="session-resources">0</dd></div>
              <div><dt>Target Tile</dt><dd id="session-target-tile">none</dd></div>
              <div><dt>Focus</dt><dd id="session-focused-object">none</dd></div>
              <div><dt>Focus Summary</dt><dd id="session-focused-object-summary">none</dd></div>
              <div><dt>Selected Slot</dt><dd id="session-selected-slot">none</dd></div>
              <div><dt>Move Target</dt><dd id="session-move-target">none</dd></div>
              <div><dt>Path</dt><dd id="session-move-path">0</dd></div>
              <div><dt>Structures</dt><dd id="session-structures">0</dd></div>
            </dl>
            <section class="session-focus-panel">
              <h3>Focus Details</h3>
              <div id="session-focused-object-details" class="session-actions"></div>
            </section>
            <section class="session-focus-panel">
              <h3>Selected Item</h3>
              <div id="session-selected-item-details" class="session-actions"></div>
            </section>
            <section class="session-focus-panel">
              <h3>Selected Item Actions</h3>
              <div id="session-selected-item-actions" class="session-actions"></div>
            </section>
            <section class="session-focus-panel">
              <h3>Combined Actions</h3>
              <div id="session-combined-actions" class="session-actions"></div>
            </section>
            <section class="session-command-groups">
              <div>
                <h3>Primary Interactions</h3>
                <div id="session-primary-interactions" class="session-actions"></div>
              </div>
              <div>
                <h3>Secondary Interactions</h3>
                <div id="session-secondary-interactions" class="session-actions"></div>
              </div>
              <div>
                <h3>Context Actions</h3>
                <div id="session-context-interactions" class="session-actions"></div>
              </div>
              <div>
                <h3>Utility Commands</h3>
                <div id="session-utility-commands" class="session-actions"></div>
              </div>
            </section>
            <div class="session-actions">
              <button id="action-save-session" type="button">Save Session</button>
              <button id="action-load-session" type="button">Load Session</button>
            </div>
            <div class="session-inventory">
              <h3>Inventory</h3>
              <ul id="session-inventory-list"></ul>
            </div>
            <p id="session-log" class="session-log"></p>
          </section>
          <section class="mods-grid">
            <section class="mods"><h2>Resolved Profile</h2><ul>${installedMods}</ul></section>
            <section class="mods"><h2>Items</h2><ul>${items}</ul></section>
            <section class="mods"><h2>Structures</h2><ul>${structures}</ul></section>
            <section class="mods"><h2>Systems</h2><ul>${systems}</ul></section>
            <section class="mods"><h2>Action Registry</h2><ul>${actions}</ul></section>
            <section class="mods"><h2>HUD Panels</h2><ul>${panels}</ul></section>
          </section>
        </section>
      </main>
    `;

    app.innerHTML = shellMarkup;

    return {
      previewRoot: getRequiredElement(app, "#game-preview"),
      externalModUrlsInput: getRequiredElement(app, "#external-mod-urls"),
      applyExternalModsButton: getRequiredElement(app, "#apply-external-mods"),
      runtimeProfileSelect: getRequiredElement(app, "#runtime-profile"),
      dayValue: getRequiredElement(app, "#session-day"),
      timeValue: getRequiredElement(app, "#session-time"),
      hungerValue: getRequiredElement(app, "#session-hunger"),
      healthValue: getRequiredElement(app, "#session-health"),
      playerValue: getRequiredElement(app, "#session-player"),
      resourcesValue: getRequiredElement(app, "#session-resources"),
      targetTileValue: getRequiredElement(app, "#session-target-tile"),
      focusedObjectValue: getRequiredElement(app, "#session-focused-object"),
      focusedObjectSummaryValue: getRequiredElement(app, "#session-focused-object-summary"),
      focusedObjectDetailsRoot: getRequiredElement(app, "#session-focused-object-details"),
      selectedSlotValue: getRequiredElement(app, "#session-selected-slot"),
      selectedItemDetailsRoot: getRequiredElement(app, "#session-selected-item-details"),
      selectedItemActionsRoot: getRequiredElement(app, "#session-selected-item-actions"),
      combinedActionsRoot: getRequiredElement(app, "#session-combined-actions"),
      primaryInteractionsRoot: getRequiredElement(app, "#session-primary-interactions"),
      secondaryInteractionsRoot: getRequiredElement(app, "#session-secondary-interactions"),
      contextInteractionsRoot: getRequiredElement(app, "#session-context-interactions"),
      utilityCommandsRoot: getRequiredElement(app, "#session-utility-commands"),
      moveTargetValue: getRequiredElement(app, "#session-move-target"),
      movePathValue: getRequiredElement(app, "#session-move-path"),
      structuresValue: getRequiredElement(app, "#session-structures"),
      inventoryList: getRequiredElement(app, "#session-inventory-list"),
      logValue: getRequiredElement(app, "#session-log"),
      saveSessionButton: getRequiredElement(app, "#action-save-session"),
      loadSessionButton: getRequiredElement(app, "#action-load-session")
    };
  },

  renderBootFailure(app: HTMLDivElement, message: string): void {
    app.innerHTML = `
      <main class="shell">
        <section class="panel">
          <p class="eyebrow">Host Runtime</p>
          <h1>Boot Failed</h1>
          <p class="lede">${message}</p>
        </section>
      </main>
    `;
  }
};
