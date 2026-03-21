import type {
  PlacedStructure,
  RuntimeSessionState
} from "@gamedemo/engine-core";

function getItemCount(state: RuntimeSessionState, itemId: string): number {
  return state.inventory.find((entry) => entry.itemId === itemId)?.quantity ?? 0;
}

function addItem(state: RuntimeSessionState, itemId: string, quantity: number): void {
  const existing = state.inventory.find((entry) => entry.itemId === itemId);
  if (existing) {
    existing.quantity += quantity;
    return;
  }

  state.inventory.push({ itemId, quantity });
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

function getInventoryEntryAtSlot(
  state: RuntimeSessionState,
  slotIndex: number | null | undefined
) {
  if (slotIndex === null || slotIndex === undefined) {
    return null;
  }
  return state.inventory[slotIndex] ?? null;
}

function consumeInventorySlot(
  state: RuntimeSessionState,
  slotIndex: number | null | undefined,
  quantity: number
): boolean {
  const entry = getInventoryEntryAtSlot(state, slotIndex);
  if (!entry || entry.quantity < quantity) return false;
  entry.quantity -= quantity;
  if (entry.quantity <= 0) {
    state.inventory = state.inventory.filter((_, index) => index !== slotIndex);
  }
  return true;
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

function findNearestAdjacentCampfire(state: RuntimeSessionState): PlacedStructure | null {
  return (
    state.placedStructures.find(
      (structure) =>
        structure.structureId === "core:campfire" &&
        isAdjacentToPlayer(state, structure.x, structure.y)
    ) ?? null
  );
}

function canCraftRationAtCampfire(
  state: RuntimeSessionState,
  structureId?: string
): { ok: boolean; reason?: string; station: PlacedStructure | null } {
  const station = structureId
    ? getStructureById(state, structureId)
    : findNearestAdjacentCampfire(state);

  if (!station || station.structureId !== "core:campfire") {
    return { ok: false, reason: "Move next to a campfire first.", station: null };
  }

  if (!isAdjacentToPlayer(state, station.x, station.y)) {
    return { ok: false, reason: "Move next to the campfire first.", station };
  }

  if (getItemCount(state, "core:wood") < 1) {
    return { ok: false, reason: "Need 1 wood.", station };
  }

  return { ok: true, station };
}

function describeRationRecipe(state: RuntimeSessionState) {
  return {
    summary: "Cook a simple ration from gathered wood.",
    detail: "Campfire crafting converts 1 wood into 1 survival ration.",
    costs: [{
      itemId: "core:wood",
      quantity: 1,
      available: getItemCount(state, "core:wood")
    }],
    rewards: [{
      itemId: "survival:ration",
      quantity: 1
    }]
  };
}

function describeSelectedWoodRecipe(
  state: RuntimeSessionState,
  slotIndex: number
) {
  const entry = getInventoryEntryAtSlot(state, slotIndex);
  return {
    summary: "Use the selected wood stack as input for a campfire ration recipe.",
    detail: entry
      ? `Selected slot ${slotIndex + 1} contains ${entry.quantity} wood.`
      : "Selected wood stack is unavailable.",
    costs: [{
      itemId: "core:wood",
      quantity: 1,
      available: entry?.itemId === "core:wood" ? entry.quantity : 0
    }],
    rewards: [{
      itemId: "survival:ration",
      quantity: 1
    }]
  };
}

export const CraftingDomain = {
  getItemCount,
  addItem,
  consumeItem,
  getInventoryEntryAtSlot,
  consumeInventorySlot,
  getStructureById,
  isAdjacentToPlayer,
  findNearestAdjacentCampfire,
  canCraftRationAtCampfire,
  describeRationRecipe,
  describeSelectedWoodRecipe
};
