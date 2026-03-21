import type { RuntimeWorldObjectInteractionProvider } from "@gamedemo/engine-core";
import { CraftingDomain } from "./craftingDomain";

const campfireRecipes: RuntimeWorldObjectInteractionProvider = {
  id: "crafting:campfire-recipes",
  collect({ object, session }) {
    if (object.kind !== "structure" || object.typeId !== "core:campfire") {
      return [];
    }

    const station = CraftingDomain.getStructureById(session, object.id);
    if (!station) return [];

    const craftingCheck = CraftingDomain.canCraftRationAtCampfire(session, station.id);
    const recipe = CraftingDomain.describeRationRecipe(session);
    return [{
      id: "crafting:craft-ration",
      label: `Craft ration at campfire ${station.x},${station.y}`,
      enabled: craftingCheck.ok,
      reasonDisabled: craftingCheck.reason,
      binding: "KeyC",
      actionId: "crafting:craft-ration",
      sourceModId: "core:crafting",
      priority: 95,
      payload: { structureId: station.id },
      affordance: "context",
      targetObjectId: object.id,
      targetObjectKind: object.kind,
      targetObjectTypeId: object.typeId,
      targetObjectLabel: object.label,
      presentation: {
        ...recipe,
        detail: `${recipe.detail} Station: ${station.x},${station.y}.`
      }
    }];
  }
};

export const CraftingInteractions = {
  campfireRecipes
};
