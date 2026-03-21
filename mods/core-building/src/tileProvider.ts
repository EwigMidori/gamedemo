import type { RuntimeWorldObjectProvider } from "@gamedemo/engine-core";
import { BuildingDomain } from "./buildingDomain";

const buildSiteObjects: RuntimeWorldObjectProvider = {
  id: "building:build-site-objects",
  inspect(context) {
    if (!context.pointerTile) return null;

    const { x, y } = context.pointerTile;
    const hasStructure = context.session.placedStructures.some((entry) => entry.x === x && entry.y === y);
    const hasResource = context.session.resources.some(
      (entry) => !entry.depleted && entry.x === x && entry.y === y
    );
    if (hasStructure || hasResource) return null;

    const terrainId = BuildingDomain.getTileTerrainId(context.session, x, y);
    if (!terrainId) return null;

    const siteDescription = BuildingDomain.describeBuildSite(context.session, x, y);
    return {
      id: `tile:${x}:${y}`,
      kind: "tile",
      typeId: terrainId,
      label: `Build Site ${x},${y}`,
      summary: siteDescription.summary,
      x,
      y,
      sourceModId: "core:building"
    };
  }
};

export const BuildingTileProviders = {
  buildSiteObjects
};
