import type { RuntimeCommandResolver } from "@gamedemo/engine-core";
import { BuildingDomain } from "./buildingDomain";

const interaction: RuntimeCommandResolver = {
  id: "building:resolver",
  resolve({ session, pointerTile, trigger }) {
    if (trigger === "pointer") return [];

    const hasWood = BuildingDomain.getItemCount(session, "core:wood") >= 2;
    const hasStone = BuildingDomain.getItemCount(session, "core:stone") >= 2;
    const fallbackX = 4 + (session.placedStructures.length % 4) * 3;
    const fallbackY = 4 + Math.floor(session.placedStructures.length / 4) * 2;
    const targetX = pointerTile?.x ?? fallbackX;
    const targetY = pointerTile?.y ?? fallbackY;
    const placement = BuildingDomain.canPlaceCampfireAt(session, targetX, targetY);
    const enabled = hasWood && hasStone && placement.ok;

    return [{
      id: "building:place-campfire",
      label: pointerTile
        ? `Place campfire at selected tile ${targetX},${targetY}`
        : "Place campfire at fallback site",
      enabled,
      reasonDisabled: enabled
        ? undefined
        : !hasWood || !hasStone
          ? "Need 2 wood and 2 stone."
          : placement.reason ?? "Cannot place a campfire there.",
      binding: "KeyB",
      actionId: "building:place-campfire",
      sourceModId: "core:building",
      priority: 20,
      payload: { x: targetX, y: targetY }
    }];
  }
};

export const BuildingResolvers = {
  interaction
};
