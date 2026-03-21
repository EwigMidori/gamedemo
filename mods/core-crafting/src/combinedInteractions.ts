import type { RuntimeCombinedInteractionProvider } from "@gamedemo/engine-core";
import { CraftingDomain } from "./craftingDomain";

const selectedWoodAtCampfire: RuntimeCombinedInteractionProvider = {
  id: "crafting:selected-wood-at-campfire",
  collect(context) {
    if (context.entry.itemId !== "core:wood") {
      return [];
    }
    if (context.object.kind !== "structure" || context.object.typeId !== "core:campfire") {
      return [];
    }

    const craftingCheck = CraftingDomain.canCraftRationAtCampfire(context.session, context.object.id);
    return [{
      id: "crafting:craft-ration-from-selected-wood-at-campfire",
      label: `Craft ration using slot ${context.slotIndex + 1} at ${context.object.label}`,
      enabled: craftingCheck.ok,
      reasonDisabled: craftingCheck.reason,
      binding: "KeyC",
      actionId: "crafting:craft-ration",
      sourceModId: "core:crafting",
      priority: 120,
      payload: {
        slotIndex: context.slotIndex,
        structureId: context.object.id
      },
      slotIndex: context.slotIndex,
      itemId: context.entry.itemId,
      itemLabel: context.descriptor.label,
      targetObjectId: context.object.id,
      targetObjectKind: context.object.kind,
      targetObjectTypeId: context.object.typeId,
      targetObjectLabel: context.object.label,
      affordance: "context",
      presentation: {
        ...CraftingDomain.describeSelectedWoodRecipe(context.session, context.slotIndex),
        detail: `Selected slot ${context.slotIndex + 1} will be cooked at campfire ${context.object.x},${context.object.y}.`
      }
    }];
  }
};

export const CraftingCombinedInteractions = {
  selectedWoodAtCampfire
};
