import { RuntimePayload, type RuntimeAction, type RuntimeActionResult } from "@gamedemo/engine-core";
import typia from "typia";

class InventoryActionFactory {
  private readonly validateDropSelectedItemPayload = typia.createValidate<{
    slotIndex: number;
  }>();

  createDropSelectedItem(): RuntimeAction {
    const validateDropSelectedItemPayload = this.validateDropSelectedItemPayload;
    const spawnDrop = this.spawnDrop.bind(this);
    return {
      id: "inventory:drop-selected-item",
      label: "Drop selected item",
      execute({ state, command }): RuntimeActionResult {
        const parsed = RuntimePayload.parse(command?.payload, validateDropSelectedItemPayload);
        if (!parsed.ok) {
          return { ok: false, message: RuntimePayload.failureMessage("inventory:drop-selected-item") };
        }
        const slotIndex = Math.floor(parsed.data.slotIndex);
        const entry = state.inventory[slotIndex] ?? null;
        if (!entry?.itemId || entry.quantity <= 0) {
          return { ok: false, message: "Selected slot is empty." };
        }
        entry.quantity -= 1;
        const itemId = entry.itemId;
        if (entry.quantity <= 0) {
          entry.itemId = "";
          entry.quantity = 0;
        }
        spawnDrop(state, itemId, 1);
        return {
          ok: true,
          message: `Dropped 1 ${itemId}.`
        };
      }
    };
  }

  private spawnDrop(
    state: {
      timeSeconds: number;
      player: { x: number; y: number };
      droppedItems?: Array<{
        id: string;
        itemId: string;
        quantity: number;
        x: number;
        y: number;
        vx: number;
        vy: number;
        spawnedAt: number;
        pickupDelay: number;
        manualDrop?: boolean;
        pickupArmed?: boolean;
      }>;
    },
    itemId: string,
    quantity: number
  ): void {
    state.droppedItems ??= [];
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.35 + Math.random() * 0.25;
    const speed = 0.7 + Math.random() * 0.45;
    state.droppedItems.push({
      id: `drop:${itemId}:${state.timeSeconds}:${Math.random()}`,
      itemId,
      quantity,
      x: state.player.x + Math.cos(angle) * radius,
      y: state.player.y + Math.sin(angle) * radius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spawnedAt: state.timeSeconds,
      pickupDelay: 0.8,
      manualDrop: true,
      pickupArmed: false
    });
  }
}

const factory = new InventoryActionFactory();

export const InventoryActions = {
  dropSelectedItem: factory.createDropSelectedItem()
};
