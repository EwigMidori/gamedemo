import type {
  RuntimeCommandInput,
  RuntimePointerTile
} from "@gamedemo/engine-core";
import {
  RuntimeSaves,
  type AssembledRuntime,
  type RuntimeSession
} from "@gamedemo/engine-runtime";
import { VanillaBreakRules } from "@gamedemo/vanilla-domain";
import type { HostShellRefs } from "./hostShell";
import { SessionCommandCatalog } from "./sessionCommandCatalog";
import { SessionViewRenderer } from "./sessionViewRenderer";

interface StorageKeys {
  saveKey: string;
}

interface PendingHoldAction {
  tile: RuntimePointerTile;
}

class SessionController {
  private activeSession: RuntimeSession;
  private commandCatalog: ReturnType<typeof SessionCommandCatalog.create>;
  private viewRenderer: ReturnType<typeof SessionViewRenderer.create>;
  private handcraftOpen = false;
  private pendingHoldAction: PendingHoldAction | null = null;
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
    this.setSelectedSlot(0);
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

  private movementDirectionForCode(code: string): "up" | "left" | "down" | "right" | null {
    if (code === "KeyW" || code === "ArrowUp") return "up";
    if (code === "KeyA" || code === "ArrowLeft") return "left";
    if (code === "KeyS" || code === "ArrowDown") return "down";
    if (code === "KeyD" || code === "ArrowRight") return "right";
    return null;
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

  runPointerHoldAction(tile: RuntimePointerTile): void {
    const pointerInput = this.buildCommandInput("pointer", tile);
    this.setPointerTile(tile);
    const holdCommand = this.commandCatalog.findPointerHoldCommand(pointerInput);
    if (holdCommand) {
      this.activeSession.executeCommand(holdCommand.id, pointerInput);
      this.pendingHoldAction = null;
      this.render();
      return;
    }
    const blockedHold = this.commandCatalog.findPointerBlockedHoldCommand(pointerInput);
    if (!blockedHold) {
      return;
    }
    const moveCommand = this.commandCatalog.collectCommands(pointerInput)
      .find((command) => command.actionId === "player:set-move-target" && command.enabled);
    if (!moveCommand) {
      this.viewRenderer.setLogMessage(blockedHold.reasonDisabled ?? "Move closer first.");
      this.render();
      return;
    }
    this.activeSession.executeCommand(moveCommand.id, pointerInput);
    this.pendingHoldAction = { tile };
    this.render();
  }

  cancelPointerHoldAction(): void {
    this.pendingHoldAction = null;
  }

  runKeyboardInput(code: string): void {
    if (this.movementDirectionForCode(code)) {
      return;
    }
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

  setMovementKey(code: string, isDown: boolean): void {
    const direction = this.movementDirectionForCode(code);
    if (!direction) {
      return;
    }
    this.activeSession.dispatchAction("player:update-movement-input", {
      id: `player:movement:${direction}:${isDown ? "down" : "up"}`,
      trigger: "system",
      payload: { direction, isDown }
    });
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
    this.resolvePendingHoldAction();
    this.render();
  }

  toggleHandcraftPanel(): void {
    this.handcraftOpen = !this.handcraftOpen;
    this.pendingHoldAction = null;
    this.render();
  }

  closeHandcraftPanel(): void {
    this.handcraftOpen = false;
    this.pendingHoldAction = null;
    this.render();
  }

  isHandcraftOpen(): boolean {
    return this.handcraftOpen;
  }

  craftHandRecipe(recipeId: string): void {
    const result = this.activeSession.dispatchAction("crafting:craft-recipe", {
      id: `handcraft:${recipeId}`,
      trigger: "ui",
      payload: { recipeId }
    });
    this.viewRenderer.setLogMessage(result.message);
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

  getPointerHoldSpec(tile: RuntimePointerTile): {
    durationSeconds: number;
    label: string;
    requiresApproach?: boolean;
  } | null {
    const input = this.buildCommandInput("pointer", tile);
    const command = this.commandCatalog.findPointerHoldCommand(input)
      ?? this.commandCatalog.findPointerBlockedHoldCommand(input);
    if (!command) {
      return null;
    }
    const snapshot = this.activeSession.snapshot();
    if (typeof command.payload?.resourceNodeId === "string") {
      const target = snapshot.resources.find((entry) => entry.id === command.payload?.resourceNodeId) ?? null;
      if (!target) {
        return null;
      }
      return {
        durationSeconds: VanillaBreakRules.forResource(
          this.runtime.content,
          snapshot,
          target,
          input.selectedSlot
        ).durationSeconds,
        label: command.label,
        requiresApproach: !command.enabled
      };
    }
    if (typeof command.payload?.structureId === "string") {
      const target = snapshot.placedStructures.find((entry) => entry.id === command.payload?.structureId) ?? null;
      if (!target) {
        return null;
      }
      return {
        durationSeconds: VanillaBreakRules.forStructure(
          this.runtime.content,
          snapshot,
          target,
          input.selectedSlot
        ).durationSeconds,
        label: command.label,
        requiresApproach: !command.enabled
      };
    }
    return null;
  }

  private resolvePendingHoldAction(): void {
    if (!this.pendingHoldAction) {
      return;
    }
    const pointerInput = this.buildCommandInput("pointer", this.pendingHoldAction.tile);
    const holdCommand = this.commandCatalog.findPointerHoldCommand(pointerInput);
    if (holdCommand) {
      this.activeSession.executeCommand(holdCommand.id, pointerInput);
      this.pendingHoldAction = null;
      return;
    }
    const snapshot = this.activeSession.snapshot();
    const targetStillExists = Boolean(pointerInput.focusedResourceId || pointerInput.focusedStructureId);
    const playerMoving = Boolean(snapshot.player.motion || snapshot.player.moveTarget);
    if (!targetStillExists || !playerMoving) {
      this.pendingHoldAction = null;
    }
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
