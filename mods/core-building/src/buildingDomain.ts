import type {
  PlacedStructure,
  RuntimeSessionState
} from "@gamedemo/engine-core";

function getItemCount(state: RuntimeSessionState, itemId: string): number {
  return state.inventory.find((entry) => entry.itemId === itemId)?.quantity ?? 0;
}

function consumeItem(
  state: RuntimeSessionState,
  itemId: string,
  quantity: number
): boolean {
  const entry = state.inventory.find((candidate) => candidate.itemId === itemId);
  if (!entry || entry.quantity < quantity) return false;
  entry.quantity -= quantity;
  if (entry.quantity <= 0) {
    state.inventory = state.inventory.filter((candidate) => candidate.itemId !== itemId);
  }
  return true;
}

function addItem(state: RuntimeSessionState, itemId: string, quantity: number): void {
  const existing = state.inventory.find((entry) => entry.itemId === itemId);
  if (existing) {
    existing.quantity += quantity;
    return;
  }
  state.inventory.push({ itemId, quantity });
}

function getStructureById(
  state: RuntimeSessionState,
  structureId: string
): PlacedStructure | null {
  return state.placedStructures.find((entry) => entry.id === structureId) ?? null;
}

function isAdjacentToPlayer(
  state: RuntimeSessionState,
  x: number,
  y: number
): boolean {
  return Math.abs(state.player.x - x) + Math.abs(state.player.y - y) <= 1;
}

function canPlaceCampfireAt(
  state: RuntimeSessionState,
  x: number,
  y: number
): { ok: boolean; reason?: string } {
  if (x < 0 || y < 0 || x >= state.world.width || y >= state.world.height) {
    return { ok: false, reason: "Target tile is outside the world." };
  }

  const tile = state.world.tiles.find((entry) => entry.x === x && entry.y === y);
  if (!tile || tile.terrainId === "core:water") {
    return { ok: false, reason: "Campfires require dry ground." };
  }
  if (state.player.x === x && state.player.y === y) {
    return { ok: false, reason: "Cannot build on the player tile." };
  }
  if (state.placedStructures.some((structure) => structure.x === x && structure.y === y)) {
    return { ok: false, reason: "A structure already occupies that tile." };
  }
  if (state.resources.some((resource) => !resource.depleted && resource.x === x && resource.y === y)) {
    return { ok: false, reason: "Clear the resource node first." };
  }
  return { ok: true };
}

function describeCampfireDismantle() {
  return {
    summary: "Break down this campfire and reclaim part of its materials.",
    detail: "Dismantling returns salvageable building inputs from the placed structure.",
    rewards: [
      {
        itemId: "core:wood",
        quantity: 1
      },
      {
        itemId: "core:stone",
        quantity: 1
      }
    ]
  };
}

function getTileTerrainId(
  state: RuntimeSessionState,
  x: number,
  y: number
): string | null {
  return state.world.tiles.find((entry) => entry.x === x && entry.y === y)?.terrainId ?? null;
}

function describeBuildSite(
  state: RuntimeSessionState,
  x: number,
  y: number
) {
  const terrainId = getTileTerrainId(state, x, y);
  const placement = canPlaceCampfireAt(state, x, y);
  return {
    terrainId,
    summary: placement.ok
      ? "An open site suitable for a basic field structure."
      : "This tile is currently blocked for campfire placement.",
    detail: placement.ok
      ? "Campfire placement requires 2 wood and 2 stone."
      : placement.reason ?? "Campfire placement is blocked here.",
    costs: [
      {
        itemId: "core:wood",
        quantity: 2,
        available: getItemCount(state, "core:wood")
      },
      {
        itemId: "core:stone",
        quantity: 2,
        available: getItemCount(state, "core:stone")
      }
    ],
    rewards: [{
      itemId: "core:campfire",
      quantity: 1
    }]
  };
}

export const BuildingDomain = {
  getItemCount,
  consumeItem,
  addItem,
  getStructureById,
  isAdjacentToPlayer,
  canPlaceCampfireAt,
  describeCampfireDismantle,
  getTileTerrainId,
  describeBuildSite
};
