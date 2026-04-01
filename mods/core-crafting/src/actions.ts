import { RuntimePayload, type RuntimeAction, type RuntimeActionResult } from "@gamedemo/engine-core";
import typia from "typia";
import { CraftingDomain } from "./craftingDomain";

const validateCraftRecipePayload = typia.createValidate<{
  recipeId: string;
  structureId?: string;
  slotIndex?: number;
}>();

const craftRecipe: RuntimeAction = {
  id: "crafting:craft-recipe",
  label: "Craft recipe",
  execute({ state, content, command }): RuntimeActionResult {
    const parsed = RuntimePayload.parse(command?.payload, validateCraftRecipePayload);
    if (!parsed.ok) {
      return { ok: false, message: RuntimePayload.failureMessage("crafting:craft-recipe") };
    }
    const { recipeId, structureId } = parsed.data;
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
