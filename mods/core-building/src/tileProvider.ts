import type { RuntimeWorldObjectProvider } from "@gamedemo/engine-core";
import { VanillaWorldLookup } from "@gamedemo/vanilla-domain";
import { BuildingDomain } from "./buildingDomain";

const buildSiteObjects: RuntimeWorldObjectProvider = {
  id: "building:build-site-objects",
  inspect(context) {
    if (!context.pointerTile) {
      return null;
    }
    const model = BuildingDomain.createModel();
    const structure = model.selectedPlaceableStructure(
      context.content,
      context.session,
      context.selectedSlot
    );
    if (!structure) {
      return null;
    }
    const { x, y } = context.pointerTile;
    const terrain = VanillaWorldLookup.tileAt(context.session.world, x, y);
    if (!terrain) {
      return null;
    }
    const siteDescription = model.describeBuildSite(context.content, context.session, structure, x, y);
    return {
      id: `tile:${x}:${y}`,
      kind: "tile",
      typeId: terrain.terrainId,
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
