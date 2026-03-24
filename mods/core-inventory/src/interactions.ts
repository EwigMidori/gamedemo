import type { RuntimeInventoryInteractionProvider } from "@gamedemo/engine-core";

const selectedSlotDrop: RuntimeInventoryInteractionProvider = {
  id: "inventory:selected-slot-drop",
  collect(context) {
    if (!context.entry.itemId || context.entry.quantity <= 0) {
      return [];
    }
    return [{
      id: `inventory:drop:${context.slotIndex}:${context.entry.itemId}`,
      label: `Drop ${context.descriptor.label}`,
      enabled: true,
      binding: "KeyG",
      actionId: "inventory:drop-selected-item",
      sourceModId: "core:inventory",
      priority: 10,
      payload: { slotIndex: context.slotIndex },
      slotIndex: context.slotIndex,
      itemId: context.entry.itemId,
      itemLabel: context.descriptor.label,
      presentation: {
        summary: `Drop one ${context.descriptor.label}.`,
        detail: "Throws a single item stack unit onto the ground near the player."
      }
    }];
  }
};

export const InventoryInteractions = {
  selectedSlotDrop
};
