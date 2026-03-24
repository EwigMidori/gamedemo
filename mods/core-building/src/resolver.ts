import type { RuntimeCommandResolver } from "@gamedemo/engine-core";
import { PlayerDomain } from "@gamedemo/mod-core-player";
import { BuildingDomain } from "./buildingDomain";

const interaction: RuntimeCommandResolver = {
  id: "building:resolver",
  resolve({ content, pointerTile, selectedSlot, session, trigger }) {
    if (trigger === "pointer") {
      return [];
    }
    const model = BuildingDomain.createModel();
    const structure = model.selectedPlaceableStructure(content, session, selectedSlot);
    if (!structure) {
      return [];
    }
    const playerTile = PlayerDomain.currentTile(session.player);
    const targetX = pointerTile?.x ?? playerTile.x + 1;
    const targetY = pointerTile?.y ?? playerTile.y;
    const placement = model.canPlaceStructureAt(content, session, structure, targetX, targetY);
    return [{
      id: `building:place:${structure.id}`,
      label: `Place ${structure.label}`,
      enabled: placement.ok,
      reasonDisabled: placement.reason,
      binding: "KeyB",
      actionId: "building:place-selected-structure",
      sourceModId: "core:building",
      priority: 20,
      payload: { x: targetX, y: targetY, selectedSlot }
    }];
  }
};

export const BuildingResolvers = {
  interaction
};
