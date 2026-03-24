import type { RuntimeCommandResolver } from "@gamedemo/engine-core";
import { CraftingDomain } from "./craftingDomain";

const interaction: RuntimeCommandResolver = {
  id: "crafting:resolver",
  resolve({ content, focusedStructureId, selectedSlot, session, trigger }) {
    if (trigger === "pointer") {
      return [];
    }
    const model = CraftingDomain.createModel();
    const candidate = model.bestAvailableRecipe(
      content,
      session,
      selectedSlot,
      focusedStructureId
    );
    if (!candidate) {
      return [];
    }
    const craftCheck = model.canCraft(content, session, candidate.recipe, candidate.structureId);
    return [{
      id: `crafting:resolver:${candidate.recipe.id}:${candidate.structureId ?? "hand"}`,
      label: `Craft ${candidate.recipe.label}`,
      enabled: craftCheck.ok,
      reasonDisabled: craftCheck.reason,
      binding: "KeyE",
      actionId: "crafting:craft-recipe",
      sourceModId: "core:crafting",
      priority: 15,
      payload: {
        recipeId: candidate.recipe.id,
        structureId: candidate.structureId
      },
      presentation: model.describe(content, session, candidate.recipe)
    }];
  }
};

export const CraftingResolvers = {
  interaction
};
