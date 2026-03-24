import type {
  ContentSnapshot,
  PlacedStructure,
  RuntimeActionResult,
  RuntimeSessionState
} from "@gamedemo/engine-core";
import { VanillaBreakRules } from "@gamedemo/vanilla-domain";
import { BuildingDomain } from "./buildingDomain";

class BuildingBreakDomainModel {
  getBreakTarget(state: RuntimeSessionState, structureId: string): PlacedStructure | null {
    return BuildingDomain.createModel().getStructureById(state, structureId);
  }

  breakStructure(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    structureId: string,
    selectedSlot: number | null | undefined
  ): RuntimeActionResult {
    const model = BuildingDomain.createModel();
    const structure = this.getBreakTarget(state, structureId);
    if (!structure) {
      return { ok: false, message: "No structure selected to break." };
    }
    if (!model.isAdjacentToPlayer(state, structure.x, structure.y)) {
      return { ok: false, message: "Move next to the structure first." };
    }
    const definition = content.structures.find((entry) => entry.id === structure.structureId) ?? null;
    if (!definition) {
      return { ok: false, message: "Unknown structure definition." };
    }

    const breakProfile = VanillaBreakRules.forStructure(content, state, structure, selectedSlot);
    const dropped = definition.breakable?.drops
      ? VanillaBreakRules.rollDrops(definition.breakable.drops, breakProfile.dropMultiplier)
      : [];
    if (dropped.length === 0) {
      const returnItemId = definition.pickupItemId ?? definition.placeableItemId ?? null;
      if (returnItemId) {
        dropped.push({
          itemId: returnItemId,
          quantity: Math.max(1, Math.round(breakProfile.dropMultiplier))
        });
      }
    }
    if (structure.inventory) {
      for (const entry of structure.inventory) {
        if (!entry.itemId || entry.quantity <= 0) {
          continue;
        }
        dropped.push({ itemId: entry.itemId, quantity: entry.quantity });
      }
    }
    this.spawnDrops(state, structure.x, structure.y, dropped);
    state.placedStructures = state.placedStructures.filter((entry) => entry.id !== structure.id);
    return {
      ok: true,
      message: `Broke ${definition.label.toLowerCase()}.`
    };
  }

  private spawnDrops(
    state: RuntimeSessionState,
    x: number,
    y: number,
    drops: Array<{ itemId: string; quantity: number }>
  ): void {
    state.droppedItems ??= [];
    for (const drop of drops) {
      if (drop.quantity <= 0) {
        continue;
      }
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.55 + Math.random() * 0.45;
      state.droppedItems.push({
        id: `drop:${x}:${y}:${drop.itemId}:${state.timeSeconds}:${Math.random()}`,
        itemId: drop.itemId,
        quantity: drop.quantity,
        x: x + Math.cos(angle) * (0.08 + Math.random() * 0.1),
        y: y + Math.sin(angle) * (0.08 + Math.random() * 0.1),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        spawnedAt: state.timeSeconds,
        pickupDelay: 0.35
      });
    }
  }
}

const model = new BuildingBreakDomainModel();

export const BuildingBreakDomain = {
  createModel(): BuildingBreakDomainModel {
    return model;
  }
};
