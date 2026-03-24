import type { RuntimeCommandResolver } from "@gamedemo/engine-core";

const selectedSlotActions: RuntimeCommandResolver = {
  id: "inventory:selected-slot-actions",
  resolve({ selectedSlot, session, trigger }) {
    if (trigger === "pointer" || selectedSlot === null || selectedSlot === undefined) {
      return [];
    }
    const entry = session.inventory[selectedSlot] ?? null;
    if (!entry?.itemId || entry.quantity <= 0) {
      return [];
    }
    return [{
      id: `inventory:drop:${selectedSlot}:${entry.itemId}`,
      label: `Drop ${entry.itemId}`,
      enabled: true,
      binding: "KeyG",
      actionId: "inventory:drop-selected-item",
      sourceModId: "core:inventory",
      priority: 18,
      payload: { slotIndex: selectedSlot }
    }];
  }
};

export const InventoryResolvers = {
  selectedSlotActions
};
