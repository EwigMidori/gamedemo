import type {
  ResolvedCommand,
  RuntimeCommandInput,
  RuntimeInventorySlotDescriptor,
  RuntimeSessionState,
  RuntimeWorldObjectDescriptor
} from "@gamedemo/engine-core";
import type { HostShellRefs } from "./hostShell";
import type { CommandBuckets } from "./sessionCommandCatalog";

interface SessionViewRendererInput {
  snapshot: RuntimeSessionState;
  commandInput: RuntimeCommandInput;
  focusedObject: RuntimeWorldObjectDescriptor | null;
  selectedItem: RuntimeInventorySlotDescriptor | null;
  commandBuckets: CommandBuckets;
}

class SessionViewRendererModel {
  constructor(
    private readonly refs: HostShellRefs,
    private readonly executeCommand: (commandId: string) => void,
    private readonly toggleInventorySlot: (slotIndex: number) => void
  ) {}

  private renderCommandButtons(
    root: HTMLElement,
    commands: ResolvedCommand[]
  ): void {
    root.innerHTML = commands.length > 0
      ? commands
        .map((command) => `
          <article class="command-card" title="${command.reasonDisabled ?? `${command.sourceModId} · ${command.binding}`}">
            <button
              type="button"
              data-command-id="${command.id}"
              ${command.enabled ? "" : "disabled"}
            >
              ${command.label} <span>(${command.binding})</span>
            </button>
            ${"presentation" in command && command.presentation?.summary ? `<p>${command.presentation.summary}</p>` : ""}
            ${"presentation" in command && command.presentation?.detail ? `<p>${command.presentation.detail}</p>` : ""}
            ${"presentation" in command && command.presentation?.costs?.length
              ? `<ul>${command.presentation.costs.map((cost) => `<li>Cost: ${cost.itemId} ${cost.available}/${cost.quantity}</li>`).join("")}</ul>`
              : ""}
            ${"presentation" in command && command.presentation?.rewards?.length
              ? `<ul>${command.presentation.rewards.map((reward) => `<li>Reward: ${reward.itemId} x${reward.quantity}</li>`).join("")}</ul>`
              : ""}
          </article>
        `)
        .join("")
      : "<p>No actions available.</p>";

    for (const button of root.querySelectorAll<HTMLButtonElement>("button[data-command-id]")) {
      button.addEventListener("click", () => {
        this.executeCommand(button.dataset.commandId ?? "");
      });
    }
  }

  private renderFocusedObjectDetails(commandBuckets: CommandBuckets): void {
    const contextInteractions = commandBuckets.context;
    this.refs.focusedObjectDetailsRoot.innerHTML = contextInteractions.length > 0
      ? contextInteractions
        .map((command) => `
          <article class="command-card">
            <strong>${command.targetObjectLabel}</strong>
            <p>${command.presentation?.summary ?? "No additional details."}</p>
            ${command.presentation?.costs?.length
              ? `<ul>${command.presentation.costs.map((cost) => `<li>${cost.itemId}: ${cost.available}/${cost.quantity}</li>`).join("")}</ul>`
              : ""}
            ${command.presentation?.rewards?.length
              ? `<ul>${command.presentation.rewards.map((reward) => `<li>${reward.itemId}: +${reward.quantity}</li>`).join("")}</ul>`
              : ""}
          </article>
        `)
        .join("")
      : "<p>No object-specific recipe or context details.</p>";
  }

  private renderSelectedItemDetails(selectedItem: RuntimeInventorySlotDescriptor | null): void {
    this.refs.selectedItemDetailsRoot.innerHTML = selectedItem
      ? `
        <article class="command-card">
          <strong>Slot ${selectedItem.slotIndex + 1}: ${selectedItem.label}</strong>
          <p>${selectedItem.summary}</p>
          <p>${selectedItem.detail ?? "No additional item detail."}</p>
          ${selectedItem.presentation?.costs?.length
            ? `<ul>${selectedItem.presentation.costs.map((cost) => `<li>${cost.itemId}: ${cost.available}/${cost.quantity}</li>`).join("")}</ul>`
            : ""}
          ${selectedItem.presentation?.rewards?.length
            ? `<ul>${selectedItem.presentation.rewards.map((reward) => `<li>${reward.itemId}: +${reward.quantity}</li>`).join("")}</ul>`
            : ""}
        </article>
      `
      : "<p>No inventory slot selected.</p>";
  }

  private renderInventory(snapshot: RuntimeSessionState, selectedSlot: number | null): void {
    this.refs.inventoryList.innerHTML = snapshot.inventory
      .map((entry, index) => `
        <li>
          <button
            type="button"
            data-slot-index="${index}"
            ${selectedSlot === index ? 'data-selected="true"' : ""}
            title="Select inventory slot ${index + 1}"
          >
            <strong>${index + 1}. ${entry.itemId}</strong><span>${entry.quantity}</span>
          </button>
        </li>
      `)
      .join("");

    for (const button of this.refs.inventoryList.querySelectorAll<HTMLButtonElement>("button[data-slot-index]")) {
      button.addEventListener("click", () => {
        const slotIndex = Number.parseInt(button.dataset.slotIndex ?? "", 10);
        if (!Number.isNaN(slotIndex)) {
          this.toggleInventorySlot(slotIndex);
        }
      });
    }
  }

  setLogMessage(message: string): void {
    this.refs.logValue.textContent = message;
  }

  render(input: SessionViewRendererInput): void {
    this.refs.dayValue.textContent = `${input.snapshot.day}`;
    this.refs.timeValue.textContent = `${input.snapshot.timeSeconds.toFixed(1)}s`;
    this.refs.hungerValue.textContent = `${input.snapshot.needs.hunger.toFixed(1)}`;
    this.refs.healthValue.textContent = `${input.snapshot.needs.health.toFixed(1)}`;
    this.refs.playerValue.textContent = `${input.snapshot.player.x}, ${input.snapshot.player.y}`;
    this.refs.resourcesValue.textContent = `${input.snapshot.resources.filter((entry) => !entry.depleted).length}`;
    this.refs.targetTileValue.textContent = input.commandInput.pointerTile
      ? `${input.commandInput.pointerTile.x}, ${input.commandInput.pointerTile.y}`
      : "none";
    this.refs.focusedObjectValue.textContent = input.focusedObject
      ? `${input.focusedObject.label} @ ${input.focusedObject.x}, ${input.focusedObject.y}`
      : "none";
    this.refs.focusedObjectSummaryValue.textContent = input.focusedObject?.summary ?? "none";
    this.refs.selectedSlotValue.textContent = input.commandInput.selectedSlot !== null
      ? `${input.commandInput.selectedSlot + 1}`
      : "none";
    this.refs.moveTargetValue.textContent = input.snapshot.player.moveTarget
      ? `${input.snapshot.player.moveTarget.x}, ${input.snapshot.player.moveTarget.y}`
      : "none";
    this.refs.movePathValue.textContent = `${input.snapshot.player.movePath?.length ?? 0}`;
    this.refs.structuresValue.textContent = `${input.snapshot.placedStructures.length}`;
    this.refs.logValue.textContent = input.snapshot.logs.at(-1) ?? "Systems nominal.";

    this.renderInventory(input.snapshot, input.commandInput.selectedSlot ?? null);
    this.renderFocusedObjectDetails(input.commandBuckets);
    this.renderSelectedItemDetails(input.selectedItem);
    this.renderCommandButtons(this.refs.combinedActionsRoot, input.commandBuckets.combined);
    this.renderCommandButtons(this.refs.selectedItemActionsRoot, input.commandBuckets.item);
    this.renderCommandButtons(this.refs.primaryInteractionsRoot, input.commandBuckets.primary);
    this.renderCommandButtons(this.refs.secondaryInteractionsRoot, input.commandBuckets.secondary);
    this.renderCommandButtons(this.refs.contextInteractionsRoot, input.commandBuckets.context);
    this.renderCommandButtons(this.refs.utilityCommandsRoot, input.commandBuckets.utility);
  }
}

export const SessionViewRenderer = {
  create(
    refs: HostShellRefs,
    executeCommand: (commandId: string) => void,
    toggleInventorySlot: (slotIndex: number) => void
  ): SessionViewRendererModel {
    return new SessionViewRendererModel(refs, executeCommand, toggleInventorySlot);
  }
};
