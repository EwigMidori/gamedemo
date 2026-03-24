import type { RuntimeInventoryInteractionProvider } from "@gamedemo/engine-core";
import { SurvivalDomain } from "./survivalDomain";

const rationUse: RuntimeInventoryInteractionProvider = {
  id: "survival:ration-use",
  collect(context) {
    if (context.entry.itemId !== "survival:ration") {
      return [];
    }

    const useful = context.session.needs.hunger < 100 || context.session.needs.health < 100;
    return [{
      id: "survival:eat-ration-slot",
      label: `Consume ${context.descriptor.label}`,
      enabled: context.entry.quantity > 0 && useful,
      reasonDisabled:
        context.entry.quantity <= 0
          ? "Selected ration stack is empty."
          : "You are already fully fed.",
      binding: "KeyR",
      actionId: "survival:eat-ration",
      sourceModId: "core:survival",
      priority: 70,
      payload: { slotIndex: context.slotIndex },
      slotIndex: context.slotIndex,
      itemId: context.entry.itemId,
      itemLabel: context.descriptor.label,
      presentation: SurvivalDomain.describeEatRation(context.session, context.slotIndex)
    }];
  }
};

const foodUse: RuntimeInventoryInteractionProvider = {
  id: "survival:food-use",
  collect(context) {
    if (context.entry.itemId !== "core:food") {
      return [];
    }
    return [{
      id: "survival:eat-food-slot",
      label: `Eat ${context.descriptor.label}`,
      enabled: context.entry.quantity > 0 && context.session.needs.hunger < 100,
      reasonDisabled:
        context.entry.quantity <= 0
          ? "Selected food stack is empty."
          : "You are not hungry.",
      binding: "KeyR",
      actionId: "survival:eat-food",
      sourceModId: "core:survival",
      priority: 60,
      payload: { slotIndex: context.slotIndex },
      slotIndex: context.slotIndex,
      itemId: context.entry.itemId,
      itemLabel: context.descriptor.label,
      presentation: {
        summary: "Consume raw food to restore a small amount of hunger.",
        detail: "Raw food is less effective than a cooked ration.",
        rewards: [{ itemId: "virtual:hunger", quantity: 12 }]
      }
    }];
  }
};

export const SurvivalItemInteractions = {
  foodUse,
  rationUse
};
