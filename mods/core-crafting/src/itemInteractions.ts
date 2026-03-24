import type { RuntimeInventoryInteractionProvider } from "@gamedemo/engine-core";
import { CraftingDomain } from "./craftingDomain";

const selectedItemRecipes: RuntimeInventoryInteractionProvider = {
  id: "crafting:selected-item-recipes",
  collect(context) {
    const model = CraftingDomain.createModel();
    return model.handRecipes(context.content)
      .filter((recipe) => recipe.cost[context.entry.itemId] !== undefined)
      .map((recipe) => {
        const check = model.canCraft(context.content, context.session, recipe);
        return {
          id: `crafting:item:${recipe.id}:${context.slotIndex}`,
          label: `Craft ${recipe.label}`,
          enabled: check.ok,
          reasonDisabled: check.reason,
          binding: "KeyC",
          actionId: "crafting:craft-recipe",
          sourceModId: "core:crafting",
          priority: 20,
          slotIndex: context.slotIndex,
          itemId: context.entry.itemId,
          itemLabel: context.descriptor.label,
          payload: { recipeId: recipe.id },
          presentation: model.describe(context.content, context.session, recipe)
        };
      });
  }
};

export const CraftingItemInteractions = {
  selectedItemRecipes
};
