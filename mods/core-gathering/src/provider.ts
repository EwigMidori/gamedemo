import type { RuntimeWorldObjectProvider } from "@gamedemo/engine-core";
import { VanillaWorldLookup } from "@gamedemo/vanilla-domain";
import { GatheringDomain } from "./gatheringDomain";

const resourceObjects: RuntimeWorldObjectProvider = {
  id: "gathering:resource-objects",
  inspect(context) {
    const target = context.focusedResourceId
      ? GatheringDomain.getResourceById(context.session, context.focusedResourceId)
      : context.pointerTile
        ? GatheringDomain.getResourceAtTile(
            context.session,
            context.pointerTile.x,
            context.pointerTile.y
          )
        : null;

    if (!target) return null;

    return {
      id: target.id,
      kind: "resource",
      typeId: target.resourceId,
      label: target.resourceId === "resource:tree"
        ? "Tree"
        : target.resourceId === "resource:berry"
          ? "Berry Bush"
          : "Stone Deposit",
      summary: target.resourceId === "resource:tree"
        ? "A harvestable tree that yields wood."
        : target.resourceId === "resource:berry"
          ? "A bush that yields raw food."
          : `A harvestable stone deposit. Hits ${target.hitsLeft ?? 3}.`,
      x: target.x,
      y: target.y,
      sourceModId: "core:gathering"
    };
  }
};

const gatherTileObjects: RuntimeWorldObjectProvider = {
  id: "gathering:tile-objects",
  inspect(context) {
    if (!context.pointerTile) {
      return null;
    }
    const { x, y } = context.pointerTile;
    const hasStructure = context.session.placedStructures.some((entry) => entry.x === x && entry.y === y);
    const hasResource = context.session.resources.some((entry) => !entry.depleted && entry.x === x && entry.y === y);
    if (hasStructure || hasResource) {
      return null;
    }
    const tile = VanillaWorldLookup.tileAt(context.session.world, x, y);
    if (!tile) {
      return null;
    }
    return {
      id: `tile:${x}:${y}`,
      kind: "tile",
      typeId: tile.terrainId,
      label: `Ground ${x},${y}`,
      summary: "An empty ground tile.",
      x,
      y,
      sourceModId: "core:gathering"
    };
  }
};

export const GatheringProviders = {
  resourceObjects,
  gatherTileObjects
};
