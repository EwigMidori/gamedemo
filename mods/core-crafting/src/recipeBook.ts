import type {
  ContentSnapshot,
  RecipeDef,
  RuntimeInteractionPresentation,
  RuntimeSessionState
} from "@gamedemo/engine-core";
import { PlayerDomain } from "@gamedemo/mod-core-player";
import { VanillaInventory } from "@gamedemo/vanilla-domain";

export class CraftingRecipeBook {
  listHandRecipes(content: ContentSnapshot): RecipeDef[] {
    return content.recipes.filter((entry) => !entry.stationId);
  }

  listStationRecipes(content: ContentSnapshot, stationId: string): RecipeDef[] {
    return content.recipes.filter((entry) => entry.stationId === stationId);
  }

  findRecipe(content: ContentSnapshot, recipeId: string): RecipeDef | null {
    return content.recipes.find((entry) => entry.id === recipeId) ?? null;
  }

  canCraft(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    recipe: RecipeDef,
    structureId?: string
  ): { ok: boolean; reason?: string } {
    const playerTile = PlayerDomain.currentTile(state.player);
    const inventory = new VanillaInventory(
      state.inventory,
      new Map(content.items.map((entry) => [entry.id, entry]))
    );
    for (const [itemId, quantity] of Object.entries(recipe.cost)) {
      if (inventory.count(itemId) < quantity) {
        return { ok: false, reason: `Missing ${itemId}.` };
      }
    }
    if (recipe.stationId) {
      const station = state.placedStructures.find((entry) => entry.id === structureId)
        ?? state.placedStructures.find(
          (entry) =>
            this.stationIdFor(content, entry.structureId) === recipe.stationId &&
            PlayerDomain.isAdjacentTile(playerTile.x, playerTile.y, entry.x, entry.y)
        );
      if (!station) {
        return { ok: false, reason: `Move next to a ${recipe.stationId} station.` };
      }
      if (!PlayerDomain.isAdjacentTile(playerTile.x, playerTile.y, station.x, station.y)) {
        return { ok: false, reason: `Move next to the ${recipe.stationId} station.` };
      }
    }
    if (!inventory.canAdd(recipe.output.itemId, recipe.output.quantity)) {
      return { ok: false, reason: "Not enough inventory space." };
    }
    return { ok: true };
  }

  craft(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    recipe: RecipeDef
  ): { ok: boolean; message: string } {
    const inventory = new VanillaInventory(
      state.inventory,
      new Map(content.items.map((entry) => [entry.id, entry]))
    );
    for (const [itemId, quantity] of Object.entries(recipe.cost)) {
      if (!inventory.remove(itemId, quantity)) {
        return { ok: false, message: `Missing ${itemId}.` };
      }
    }
    inventory.add(recipe.output.itemId, recipe.output.quantity);
    inventory.normalizeSize(12);
    return {
      ok: true,
      message: `Crafted ${recipe.output.quantity} ${recipe.label}.`
    };
  }

  describe(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    recipe: RecipeDef
  ): RuntimeInteractionPresentation {
    const inventory = new VanillaInventory(
      state.inventory,
      new Map(content.items.map((entry) => [entry.id, entry]))
    );
    return {
      summary: `Craft ${recipe.label}.`,
      detail: recipe.stationId
        ? `Requires ${recipe.stationId} station access.`
        : "Can be crafted by hand.",
      costs: Object.entries(recipe.cost).map(([itemId, quantity]) => ({
        itemId,
        quantity,
        available: inventory.count(itemId)
      })),
      rewards: [{
        itemId: recipe.output.itemId,
        quantity: recipe.output.quantity
      }]
    };
  }

  private stationIdFor(content: ContentSnapshot, structureId: string): string | null {
    const structure = content.structures.find((entry) => entry.id === structureId) ?? null;
    return structure?.craftStationId ?? structure?.utilityStationId ?? null;
  }
}
