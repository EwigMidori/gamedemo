import type { RuntimeWorldObjectInteractionProvider } from "@gamedemo/engine-core";
import { CraftingDomain } from "./craftingDomain";

const stationRecipes: RuntimeWorldObjectInteractionProvider = {
  id: "crafting:station-recipes",
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
    return model.stationRecipes(context.content, stationId).map((recipe, index) => {
      const check = model.canCraft(context.content, context.session, recipe, context.object.id);
      return {
        id: `crafting:station:${context.object.id}:${recipe.id}`,
        label: `Craft ${recipe.label}`,
        enabled: check.ok,
        reasonDisabled: check.reason,
        binding: "KeyC",
        actionId: "crafting:craft-recipe",
        sourceModId: "core:crafting",
        priority: 95 - index,
        payload: { structureId: context.object.id, recipeId: recipe.id },
        affordance: "context",
        targetObjectId: context.object.id,
        targetObjectKind: context.object.kind,
        targetObjectTypeId: context.object.typeId,
        targetObjectLabel: context.object.label,
        presentation: model.describe(context.content, context.session, recipe)
      };
    });
  }
};

export const CraftingInteractions = {
  stationRecipes
};
