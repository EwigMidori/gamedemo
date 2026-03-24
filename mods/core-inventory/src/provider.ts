import type { RuntimeInventorySelectionProvider } from "@gamedemo/engine-core";
import { InventoryDomain } from "./inventoryDomain";

const selectedSlotDetails: RuntimeInventorySelectionProvider = {
  id: "inventory:selected-slot-details",
  inspect(context) {
    if (!context.entry.itemId || context.entry.quantity <= 0) {
      return null;
    }
    const model = InventoryDomain.createModel();
    const description = model.describeEntry(context.content, context.entry);
    return {
      slotIndex: context.slotIndex,
      itemId: context.entry.itemId,
      label: description.label,
      summary: description.summary,
      detail: description.detail,
      quantity: context.entry.quantity,
      sourceModId: "core:inventory",
      presentation: description.presentation
    };
  }
};

export const InventoryProviders = {
  selectedSlotDetails
};
