import type { RuntimeCombinedInteractionProvider } from "@gamedemo/engine-core";
import { CraftingDomain } from "./craftingDomain";

const selectedItemAtStation: RuntimeCombinedInteractionProvider = {
  id: "crafting:selected-item-at-station",
  collect(context) {
    if (context.object.kind !== "structure") {
      return [];
    }
    const structure = context.content.structures.find((entry) => entry.id === context.object.typeId) ?? null;
    const stationId = structure?.craftStationId ?? structure?.utilityStationId ?? null;
    if (!stationId) {
      return [];
    }
    const model = CraftingDomain.createModel();
    return model.stationRecipes(context.content, stationId)
      .filter((recipe) => recipe.cost[context.entry.itemId] !== undefined)
      .map((recipe, index) => {
        const check = model.canCraft(context.content, context.session, recipe, context.object.id);
        return {
          id: `crafting:combo:${context.object.id}:${recipe.id}:${context.slotIndex}`,
          label: `Craft ${recipe.label} with slot ${context.slotIndex + 1}`,
          enabled: check.ok,
          reasonDisabled: check.reason,
          binding: "KeyC",
          actionId: "crafting:craft-recipe",
          sourceModId: "core:crafting",
          priority: 120 - index,
          payload: {
            slotIndex: context.slotIndex,
            structureId: context.object.id,
            recipeId: recipe.id
          },
          slotIndex: context.slotIndex,
          itemId: context.entry.itemId,
          itemLabel: context.descriptor.label,
          targetObjectId: context.object.id,
          targetObjectKind: context.object.kind,
          targetObjectTypeId: context.object.typeId,
          targetObjectLabel: context.object.label,
          affordance: "context",
          presentation: model.describe(context.content, context.session, recipe)
        };
      });
  }
};

export const CraftingCombinedInteractions = {
  selectedItemAtStation
};
