import type {
  ContentSnapshot,
  PlacedStructure,
  RuntimeSessionState,
  StructureDef
} from "@gamedemo/engine-core";
import { VanillaInventory, VanillaWorldLookup } from "@gamedemo/vanilla-domain";
import { PlayerDomain } from "@gamedemo/mod-core-player";

class BuildingDomainModel {
  getItemCount(content: ContentSnapshot, state: RuntimeSessionState, itemId: string): number {
    return new VanillaInventory(state.inventory, new Map(content.items.map((entry) => [entry.id, entry]))).count(itemId);
  }

  addItem(content: ContentSnapshot, state: RuntimeSessionState, itemId: string, quantity: number): void {
    const inventory = new VanillaInventory(state.inventory, new Map(content.items.map((entry) => [entry.id, entry])));
    inventory.add(itemId, quantity);
    inventory.normalizeSize(12);
  }

  getStructureById(state: RuntimeSessionState, structureId: string): PlacedStructure | null {
    return state.placedStructures.find((entry) => entry.id === structureId) ?? null;
  }

  isAdjacentToPlayer(state: RuntimeSessionState, x: number, y: number): boolean {
    const playerTile = PlayerDomain.currentTile(state.player);
    return PlayerDomain.isAdjacentTile(playerTile.x, playerTile.y, x, y);
  }

  selectedPlaceableStructure(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    selectedSlot: number | null | undefined
  ): StructureDef | null {
    if (selectedSlot === null || selectedSlot === undefined) {
      return null;
    }
    const entry = state.inventory[selectedSlot] ?? null;
    if (!entry?.itemId || entry.quantity <= 0) {
      return null;
    }
    return content.structures.find((structure) => structure.placeableItemId === entry.itemId) ?? null;
  }

  canPlaceStructureAt(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    structure: StructureDef,
    x: number,
    y: number
  ): { ok: boolean; reason?: string } {
    const maxX = state.world.originX + state.world.width;
    const maxY = state.world.originY + state.world.height;
    if (x < state.world.originX || y < state.world.originY || x >= maxX || y >= maxY) {
      return { ok: false, reason: "Target tile is outside the world." };
    }
    const tile = VanillaWorldLookup.tileAt(state.world, x, y);
    if (!tile || tile.terrainId === "core:water") {
      return { ok: false, reason: "Cannot build on water." };
    }
    const playerTile = PlayerDomain.currentTile(state.player);
    if (playerTile.x === x && playerTile.y === y) {
      return { ok: false, reason: "Cannot build on the player tile." };
    }
    if (state.placedStructures.some((entry) => entry.x === x && entry.y === y)) {
      return { ok: false, reason: "Tile already occupied." };
    }
    if (state.resources.some((entry) => !entry.depleted && entry.x === x && entry.y === y)) {
      return { ok: false, reason: "Clear the resource first." };
    }
    if (!structure.placeableItemId) {
      return { ok: false, reason: "Structure is not placeable." };
    }
    if (this.getItemCount(content, state, structure.placeableItemId) < 1) {
      return { ok: false, reason: `Need ${structure.placeableItemId}.` };
    }
    return { ok: true };
  }

  placeStructure(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    structure: StructureDef,
    x: number,
    y: number
  ): void {
    const inventory = new VanillaInventory(state.inventory, new Map(content.items.map((entry) => [entry.id, entry])));
    inventory.remove(structure.placeableItemId ?? "", 1);
    inventory.normalizeSize(12);
    state.placedStructures.push({
      id: `${structure.id}:${state.placedStructures.length + 1}`,
      structureId: structure.id,
      x,
      y,
      growth: structure.growableStages ? 0 : null,
      inventory: structure.storageSlots
        ? Array.from({ length: structure.storageSlots }, () => ({ itemId: "", quantity: 0 }))
        : null
    });
  }

  dismantleStructure(content: ContentSnapshot, state: RuntimeSessionState, structure: PlacedStructure): void {
    state.placedStructures = state.placedStructures.filter((entry) => entry.id !== structure.id);
    const structureDef = content.structures.find((entry) => entry.id === structure.structureId) ?? null;
    if (structureDef?.pickupItemId) {
      this.addItem(content, state, structureDef.pickupItemId, 1);
    } else if (structureDef?.placeableItemId) {
      this.addItem(content, state, structureDef.placeableItemId, 1);
    }
  }

  tickGrowth(content: ContentSnapshot, state: RuntimeSessionState, deltaSeconds: number): void {
    for (const structure of state.placedStructures) {
      const structureDef = content.structures.find((entry) => entry.id === structure.structureId) ?? null;
      if (!structureDef?.growableStages?.length || !structureDef.growSeconds) {
        continue;
      }
      const current = structure.growth ?? 0;
      if (current >= 1) {
        continue;
      }
      structure.growth = Math.min(1, current + deltaSeconds / structureDef.growSeconds);
    }
  }

  harvestStructure(content: ContentSnapshot, state: RuntimeSessionState, structure: PlacedStructure): string {
    const structureDef = content.structures.find((entry) => entry.id === structure.structureId) ?? null;
    if (!structureDef?.growableStages?.length) {
      return "This structure cannot be harvested.";
    }
    if ((structure.growth ?? 0) < 1) {
      return "The crop is not ready yet.";
    }
    this.addItem(content, state, "core:food", 6);
    structure.growth = 0;
    return "Harvested crops (+food).";
  }

  canStoreSelectedItem(state: RuntimeSessionState, structure: PlacedStructure, selectedSlot: number | null | undefined): boolean {
    if (!structure.inventory || selectedSlot === null || selectedSlot === undefined) {
      return false;
    }
    const entry = state.inventory[selectedSlot] ?? null;
    if (!entry?.itemId || entry.quantity <= 0) {
      return false;
    }
    return structure.inventory.some(
      (slot) =>
        (!slot.itemId || slot.quantity <= 0) ||
        (slot.itemId === entry.itemId && slot.quantity < 99)
    );
  }

  storeSelectedItem(state: RuntimeSessionState, structure: PlacedStructure, selectedSlot: number | null | undefined): string {
    if (!structure.inventory || selectedSlot === null || selectedSlot === undefined) {
      return "No valid storage target.";
    }
    const entry = state.inventory[selectedSlot] ?? null;
    if (!entry?.itemId || entry.quantity <= 0) {
      return "Selected slot is empty.";
    }
    const targetSlot = structure.inventory.find(
      (slot) => slot.itemId === entry.itemId && slot.quantity < 99
    ) ?? structure.inventory.find((slot) => !slot.itemId || slot.quantity <= 0);
    if (!targetSlot) {
      return "Chest is full.";
    }
    if (!targetSlot.itemId) {
      targetSlot.itemId = entry.itemId;
      targetSlot.quantity = 0;
    }
    const moved = Math.min(entry.quantity, 99 - targetSlot.quantity);
    targetSlot.quantity += moved;
    entry.quantity -= moved;
    if (entry.quantity <= 0) {
      entry.itemId = "";
      entry.quantity = 0;
    }
    return `Stored ${moved} ${targetSlot.itemId}.`;
  }

  canTakeFromStorage(content: ContentSnapshot, state: RuntimeSessionState, structure: PlacedStructure): boolean {
    if (!structure.inventory) {
      return false;
    }
    const source = structure.inventory.find((slot) => slot.itemId && slot.quantity > 0);
    if (!source?.itemId) {
      return false;
    }
    const inventory = new VanillaInventory(state.inventory, new Map(content.items.map((entry) => [entry.id, entry])));
    return inventory.canAdd(source.itemId, 1);
  }

  takeFromStorage(content: ContentSnapshot, state: RuntimeSessionState, structure: PlacedStructure): string {
    if (!structure.inventory) {
      return "No storage available.";
    }
    const source = structure.inventory.find((slot) => slot.itemId && slot.quantity > 0);
    if (!source?.itemId) {
      return "Chest is empty.";
    }
    const inventory = new VanillaInventory(state.inventory, new Map(content.items.map((entry) => [entry.id, entry])));
    if (!inventory.canAdd(source.itemId, 1)) {
      return "No room in inventory.";
    }
    inventory.add(source.itemId, 1);
    inventory.normalizeSize(12);
    source.quantity -= 1;
    if (source.quantity <= 0) {
      source.itemId = "";
      source.quantity = 0;
    }
    return `Took 1 ${source.itemId || "item"}.`;
  }

  describeBuildSite(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    structure: StructureDef | null,
    x: number,
    y: number
  ) {
    const placement = structure
      ? this.canPlaceStructureAt(content, state, structure, x, y)
      : { ok: false, reason: "Select a placeable item first." };
    return {
      summary: placement.ok
        ? `Open site for ${structure?.label ?? "building"}.`
        : placement.reason ?? "This tile is blocked.",
      detail: structure?.placeableItemId
        ? `Consumes 1 ${structure.placeableItemId}.`
        : "No placeable structure is selected.",
      rewards: structure ? [{ itemId: structure.id, quantity: 1 }] : []
    };
  }
}

const model = new BuildingDomainModel();

export const BuildingDomain = {
  createModel(): BuildingDomainModel {
    return model;
  }
};
