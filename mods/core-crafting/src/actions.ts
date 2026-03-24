import type { RuntimeAction, RuntimeActionResult } from "@gamedemo/engine-core";
import { CraftingDomain } from "./craftingDomain";

const craftRecipe: RuntimeAction = {
  id: "crafting:craft-recipe",
  label: "Craft recipe",
  execute({ state, content, command }): RuntimeActionResult {
    const recipeId = typeof command?.payload?.recipeId === "string"
      ? command.payload.recipeId
      : "";
    const structureId = typeof command?.payload?.structureId === "string"
      ? command.payload.structureId
      : undefined;
    const model = CraftingDomain.createModel();
    const recipe = model.findRecipe(content, recipeId);
    if (!recipe) {
      return { ok: false, message: `Unknown recipe ${recipeId}.` };
    }
    const craftCheck = model.canCraft(content, state, recipe, structureId);
    if (!craftCheck.ok) {
      return { ok: false, message: craftCheck.reason ?? "Cannot craft this recipe." };
    }
    return model.craft(content, state, recipe);
  }
};

export const CraftingActions = {
  craftRecipe
};
