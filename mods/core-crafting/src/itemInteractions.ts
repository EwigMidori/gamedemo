import type { RuntimeInventoryInteractionProvider } from "@gamedemo/engine-core";
import { CraftingDomain } from "./craftingDomain";

const selectedWoodRecipes: RuntimeInventoryInteractionProvider = {
  id: "crafting:selected-wood-recipes",
  collect(context) {
    if (context.entry.itemId !== "core:wood") {
      return [];
    }

    return [{
      id: "crafting:craft-ration-from-selected-wood",
      label: "Prepare selected wood",
      enabled: false,
      reasonDisabled: "Focus a campfire to craft from the selected wood stack.",
      binding: "KeyC",
      actionId: "crafting:craft-ration",
      sourceModId: "core:crafting",
      priority: 20,
      slotIndex: context.slotIndex,
      itemId: context.entry.itemId,
      itemLabel: context.descriptor.label,
      presentation: {
        ...CraftingDomain.describeSelectedWoodRecipe(context.session, context.slotIndex),
        detail: "Move next to a campfire and focus it to use the selected wood stack."
      }
    }];
  }
};

export const CraftingItemInteractions = {
  selectedWoodRecipes
};
