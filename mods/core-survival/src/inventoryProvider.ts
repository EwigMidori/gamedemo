import type { RuntimeInventorySelectionProvider } from "@gamedemo/engine-core";
import { SurvivalDomain } from "./survivalDomain";

const rationDetails: RuntimeInventorySelectionProvider = {
  id: "survival:ration-selection",
  inspect(context) {
    if (context.entry.itemId !== "survival:ration") {
      return null;
    }

    return {
      slotIndex: context.slotIndex,
      itemId: context.entry.itemId,
      label: "Ration",
      summary: `Ration stack x${context.entry.quantity}`,
      detail: "Portable food used to restore hunger and a small amount of health.",
      quantity: context.entry.quantity,
      sourceModId: "core:survival",
      presentation: SurvivalDomain.describeEatRation(context.session, context.slotIndex)
    };
  }
};

export const SurvivalInventoryProviders = {
  rationDetails
};
