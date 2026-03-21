import type {
  RuntimeCommandInput,
  RuntimePointerTile
} from "@gamedemo/engine-core";
import {
  RuntimeSaves,
  type AssembledRuntime,
  type RuntimeSession
} from "@gamedemo/engine-runtime";
import type { HostShellRefs } from "./hostShell";
import { SessionCommandCatalog } from "./sessionCommandCatalog";
import { SessionViewRenderer } from "./sessionViewRenderer";

interface StorageKeys {
  saveKey: string;
}

class SessionController {
  private activeSession: RuntimeSession;
  private commandCatalog: ReturnType<typeof SessionCommandCatalog.create>;
  private viewRenderer: ReturnType<typeof SessionViewRenderer.create>;
  private commandInput: RuntimeCommandInput = {
    trigger: "ui",
    pointerTile: null,
    selectedSlot: null,
    focusedResourceId: null,
    focusedStructureId: null
  };

  constructor(
    private readonly runtime: AssembledRuntime,
    refs: HostShellRefs,
    private readonly storageKeys: StorageKeys
  ) {
    this.activeSession = runtime.createSession();
    this.commandCatalog = SessionCommandCatalog.create(this.activeSession);
    this.viewRenderer = SessionViewRenderer.create(
      refs,
      (commandId) => this.executeUiCommand(commandId),
      (slotIndex) => this.toggleInventorySlot(slotIndex)
    );
  }

  private parseInventorySelectionCode(code: string): number | null {
    if (!/^Digit[1-9]$/.test(code)) {
      return null;
    }
    return Number.parseInt(code.slice("Digit".length), 10) - 1;
  }

  private buildCommandInput(
    trigger: RuntimeCommandInput["trigger"],
    tile: RuntimePointerTile | null = this.commandInput.pointerTile ?? null
  ): RuntimeCommandInput {
    const snapshot = this.activeSession.snapshot();
    const focusedResource = tile
      ? snapshot.resources.find(
          (entry) => !entry.depleted && entry.x === tile.x && entry.y === tile.y
        ) ?? null
      : null;
    const focusedStructure = tile
      ? snapshot.placedStructures.find((entry) => entry.x === tile.x && entry.y === tile.y) ?? null
      : null;

    return {
      trigger,
      pointerTile: tile,
      selectedSlot: this.commandInput.selectedSlot ?? null,
      focusedResourceId: focusedResource?.id ?? null,
      focusedStructureId: focusedStructure?.id ?? null
    };
  }

  private setSelectedSlot(slotIndex: number | null): void {
    const inventorySize = this.activeSession.snapshot().inventory.length;
    const normalizedSlot = slotIndex !== null && slotIndex >= 0 && slotIndex < inventorySize
      ? slotIndex
      : null;
    this.commandInput = {
      ...this.commandInput,
      selectedSlot: normalizedSlot
    };
  }

  private toggleInventorySlot(slotIndex: number): void {
    this.setSelectedSlot(this.commandInput.selectedSlot === slotIndex ? null : slotIndex);
    this.render();
  }

  selectInventorySlot(slotIndex: number): void {
    this.toggleInventorySlot(slotIndex);
  }

  private updateSession(session: RuntimeSession): void {
    this.activeSession = session;
    this.commandCatalog = SessionCommandCatalog.create(session);
  }

  setPointerTile(tile: RuntimePointerTile | null): void {
    this.commandInput = this.buildCommandInput(tile ? "pointer" : "ui", tile);
  }

  runPointerPrimaryAction(tile: RuntimePointerTile): void {
    const pointerInput = this.buildCommandInput("pointer", tile);
    this.setPointerTile(tile);
    const primaryCommand = this.commandCatalog.findPointerPrimaryCommand(pointerInput);

    if (!primaryCommand) {
      const blockedCommand = this.commandCatalog.findPointerBlockedCommand(pointerInput);
      const message = blockedCommand?.reasonDisabled ?? "No pointer action is available for that tile.";
      this.render();
      this.viewRenderer.setLogMessage(message);
      return;
    }

    this.activeSession.executeCommand(primaryCommand.id, pointerInput);
    this.render();
  }

  runKeyboardInput(code: string): void {
    const inventorySlot = this.parseInventorySelectionCode(code);
    if (inventorySlot !== null) {
      this.setSelectedSlot(inventorySlot);
      this.render();
      return;
    }

    const keyboardInput = this.buildCommandInput(
      "keyboard",
      this.commandInput.pointerTile ?? null
    );
    const matched = this.commandCatalog.collectCommands(keyboardInput)
      .find((command) => command.binding === code);
    if (!matched || !matched.enabled) return;
    this.activeSession.executeCommand(matched.id, keyboardInput);
    this.render();
  }

  save(): void {
    const envelope = RuntimeSaves.serialize(this.runtime, this.activeSession);
    localStorage.setItem(this.storageKeys.saveKey, JSON.stringify(envelope));
    this.render();
    this.viewRenderer.setLogMessage("Session saved to browser storage.");
  }

  load(): void {
    const raw = localStorage.getItem(this.storageKeys.saveKey);
    if (!raw) {
      this.viewRenderer.setLogMessage("No saved session found.");
      return;
    }

    this.updateSession(RuntimeSaves.restore(this.runtime, JSON.parse(raw)));
    this.setSelectedSlot(this.commandInput.selectedSlot ?? null);
    this.render();
    this.viewRenderer.setLogMessage("Session restored from browser storage.");
  }

  tick(deltaSeconds: number): void {
    this.activeSession.tick(deltaSeconds);
    this.render();
  }

  executeUiCommand(commandId: string): void {
    this.activeSession.executeCommand(commandId, {
      ...this.commandInput,
      trigger: "ui"
    });
    this.render();
  }

  render(): void {
    const snapshot = this.activeSession.snapshot();
    if (
      this.commandInput.selectedSlot !== null &&
      this.commandInput.selectedSlot >= snapshot.inventory.length
    ) {
      this.setSelectedSlot(null);
    }

    this.viewRenderer.render({
      snapshot,
      commandInput: this.commandInput,
      focusedObject: this.activeSession.inspectWorldObject(this.commandInput),
      selectedItem: this.activeSession.inspectSelectedInventorySlot(this.commandInput),
      commandBuckets: this.commandCatalog.bucketCommands(this.commandInput)
    });
  }

  createPreviewSession(): RuntimeSession {
    return {
      tick: (deltaSeconds) => this.activeSession.tick(deltaSeconds),
      dispatchAction: (actionId, command) => this.activeSession.dispatchAction(actionId, command),
      resolveCommands: (input) => this.activeSession.resolveCommands(input),
      executeCommand: (commandId, input) => this.activeSession.executeCommand(commandId, input),
      inspectWorldObject: (input) => this.activeSession.inspectWorldObject(input),
      inspectSelectedInventorySlot: (input) => this.activeSession.inspectSelectedInventorySlot(input),
      resolveCombinedInteractions: (input) => this.activeSession.resolveCombinedInteractions(input),
      resolveSelectedInventoryInteractions: (input) => this.activeSession.resolveSelectedInventoryInteractions(input),
      resolveWorldObjectInteractions: (input) => this.activeSession.resolveWorldObjectInteractions(input),
      snapshot: () => this.activeSession.snapshot()
    };
  }

  getSelectedTile(): RuntimePointerTile | null {
    return this.commandInput.pointerTile ?? null;
  }

  getCommandInput(): RuntimeCommandInput {
    return { ...this.commandInput };
  }

  getSelectedTileMarker(): {
    strokeColor: number;
    fillColor: number;
    fillAlpha: number;
  } | null {
    return this.commandCatalog.getSelectedTileMarker(this.commandInput);
  }
}

export const HostSessionController = {
  create(
    runtime: AssembledRuntime,
    refs: HostShellRefs,
    storageKeys: StorageKeys
  ): SessionController {
    return new SessionController(runtime, refs, storageKeys);
  }
};
