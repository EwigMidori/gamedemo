import type {
  ContentSnapshot,
  RecipeDef,
  RuntimeSessionState
} from "@gamedemo/engine-core";
import { PlayerDomain } from "@gamedemo/mod-core-player";
import { CraftingRecipeBook } from "./recipeBook";

class CraftingDomainModel {
  private readonly recipes = new CraftingRecipeBook();

  handRecipes(content: ContentSnapshot): RecipeDef[] {
    return this.recipes.listHandRecipes(content);
  }

  stationRecipes(content: ContentSnapshot, stationId: string): RecipeDef[] {
    return this.recipes.listStationRecipes(content, stationId);
  }

  findRecipe(content: ContentSnapshot, recipeId: string): RecipeDef | null {
    return this.recipes.findRecipe(content, recipeId);
  }

  canCraft(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    recipe: RecipeDef,
    structureId?: string
  ) {
    return this.recipes.canCraft(content, state, recipe, structureId);
  }

  craft(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    recipe: RecipeDef
  ) {
    return this.recipes.craft(content, state, recipe);
  }

  describe(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    recipe: RecipeDef
  ) {
    return this.recipes.describe(content, state, recipe);
  }

  bestAvailableRecipe(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    selectedSlot: number | null | undefined,
    focusedStructureId?: string | null
  ): { recipe: RecipeDef; structureId?: string } | null {
    const selectedItemId = selectedSlot !== null && selectedSlot !== undefined
      ? state.inventory[selectedSlot]?.itemId || null
      : null;
    const candidates = this.collectCandidateRecipes(
      content,
      state,
      selectedItemId,
      focusedStructureId ?? null
    );
    return candidates[0] ?? null;
  }

  private collectCandidateRecipes(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    selectedItemId: string | null,
    focusedStructureId: string | null
  ): Array<{ recipe: RecipeDef; structureId?: string }> {
    const playerTile = PlayerDomain.currentTile(state.player);
    const focusedStation = focusedStructureId
      ? state.placedStructures.find((entry) => entry.id === focusedStructureId) ?? null
      : null;
    const nearbyStations = state.placedStructures.filter((entry) => {
      const stationId = this.stationIdFor(content, entry.structureId);
      return !!stationId && PlayerDomain.isAdjacentTile(playerTile.x, playerTile.y, entry.x, entry.y);
    });
    const stationCandidates = nearbyStations.flatMap((entry) => {
      const stationId = this.stationIdFor(content, entry.structureId);
      if (!stationId) {
        return [];
      }
      return this.stationRecipes(content, stationId).map((recipe) => ({
        recipe,
        structureId: entry.id
      }));
    });
    const handCandidates = this.handRecipes(content).map((recipe) => ({ recipe }));
    return [...stationCandidates, ...handCandidates]
      .sort((left, right) => this.candidateScore(content, state, left, selectedItemId, focusedStation)
        - this.candidateScore(content, state, right, selectedItemId, focusedStation));
  }

  private candidateScore(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    candidate: { recipe: RecipeDef; structureId?: string },
    selectedItemId: string | null,
    focusedStation: RuntimeSessionState["placedStructures"][number] | null
  ): number {
    let score = 1000;
    const craftable = this.canCraft(content, state, candidate.recipe, candidate.structureId).ok;
    if (craftable) {
      score -= 500;
    }
    if (selectedItemId && candidate.recipe.cost[selectedItemId] !== undefined) {
      score -= 250;
    }
    if (focusedStation && candidate.structureId === focusedStation.id) {
      score -= 180;
    }
    if (candidate.recipe.stationId) {
      score -= 50;
    }
    score += Object.keys(candidate.recipe.cost).length * 5;
    return score;
  }

  private stationIdFor(content: ContentSnapshot, structureId: string): string | null {
    const structure = content.structures.find((entry) => entry.id === structureId) ?? null;
    return structure?.craftStationId ?? structure?.utilityStationId ?? null;
  }
}

const model = new CraftingDomainModel();

export const CraftingDomain = {
  createModel(): CraftingDomainModel {
    return model;
  }
};
