import type {
  PlacedStructure,
  RuntimeSessionState
} from "@gamedemo/engine-core";
import { PlayerDomain } from "@gamedemo/mod-core-player";

const DAY_LENGTH_SECONDS = 180;

function getItemCount(
  inventory: Array<{ itemId: string; quantity: number }>,
  itemId: string
): number {
  return inventory.find((entry) => entry.itemId === itemId)?.quantity ?? 0;
}

function consumeItem(
  inventory: Array<{ itemId: string; quantity: number }>,
  itemId: string,
  quantity: number
): boolean {
  const entry = inventory.find((candidate) => candidate.itemId === itemId);
  if (!entry || entry.quantity < quantity) return false;
  entry.quantity -= quantity;
  return true;
}

function getInventoryEntryAtSlot(
  inventory: Array<{ itemId: string; quantity: number }>,
  slotIndex: number | null | undefined
) {
  if (slotIndex === null || slotIndex === undefined) {
    return null;
  }
  return inventory[slotIndex] ?? null;
}

function consumeInventorySlot(
  inventory: Array<{ itemId: string; quantity: number }>,
  slotIndex: number | null | undefined,
  quantity: number
): boolean {
  const entry = getInventoryEntryAtSlot(inventory, slotIndex);
  if (!entry || entry.quantity < quantity) return false;
  entry.quantity -= quantity;
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
  const playerTile = PlayerDomain.currentTile(state.player);
  return PlayerDomain.isAdjacentTile(playerTile.x, playerTile.y, x, y);
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

function updateDay(state: RuntimeSessionState): void {
  state.day = Math.max(1, Math.floor(state.timeSeconds / DAY_LENGTH_SECONDS) + 1);
}

function describeCampfireRest(state: RuntimeSessionState) {
  return {
    summary: "Recover by resting beside a lit field camp.",
    detail: "Resting restores health, consumes some hunger, and advances time.",
    rewards: [{
      itemId: "virtual:health",
      quantity: Math.min(14, 100 - state.needs.health)
    }],
    costs: [{
      itemId: "virtual:hunger",
      quantity: 6,
      available: Math.floor(state.needs.hunger)
    }]
  };
}

function describeEatRation(state: RuntimeSessionState, slotIndex?: number | null) {
  const selectedEntry = getInventoryEntryAtSlot(state.inventory, slotIndex);
  const selectedRationCount = selectedEntry?.itemId === "survival:ration"
    ? selectedEntry.quantity
    : 0;
  return {
    summary: "Consume a ration from the inventory to restore hunger and some health.",
    detail: selectedEntry
      ? selectedEntry.itemId === "survival:ration"
        ? `Selected slot ${slotIndex! + 1} is a ration stack.`
        : `Selected slot ${slotIndex! + 1} contains ${selectedEntry.itemId}, not a ration.`
      : "No inventory slot is selected. The nearest ration stack will be used.",
    costs: [{
      itemId: "survival:ration",
      quantity: 1,
      available: selectedEntry
        ? selectedRationCount
        : getItemCount(state.inventory, "survival:ration")
    }],
    rewards: [
      {
        itemId: "virtual:hunger",
        quantity: 28
      },
      {
        itemId: "virtual:health",
        quantity: 6
      }
    ]
  };
}

export const SurvivalDomain = {
  DAY_LENGTH_SECONDS,
  getItemCount,
  consumeItem,
  getInventoryEntryAtSlot,
  consumeInventorySlot,
  getStructureById,
  isAdjacentToPlayer,
  findNearestAdjacentCampfire,
  updateDay,
  describeCampfireRest,
  describeEatRation
};
