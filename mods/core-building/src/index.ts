import {
  MOD_API_VERSION
} from "@gamedemo/engine-core";
import type { GameModModule } from "@gamedemo/mod-api";
import { BuildingActions } from "./actions";
import { BuildingInteractions } from "./interactions";
import { BuildingProviders } from "./provider";
import { BuildingResolvers } from "./resolver";
import { BuildingTileProviders } from "./tileProvider";

export const coreBuildingMod: GameModModule = {
  manifest: {
    id: "core:building",
    version: "0.1.0",
    apiVersion: MOD_API_VERSION,
    dependsOn: [{ id: "core:base" }]
  },
  install(context) {
    context.actions.register(BuildingActions.placeCampfire);
    context.actions.register(BuildingActions.dismantleCampfire);
    context.commandResolvers.register(BuildingResolvers.interaction);
    context.worldObjects.register(BuildingProviders.structureObjects);
    context.worldObjects.register(BuildingTileProviders.buildSiteObjects);
    context.worldObjectInteractions.register(BuildingInteractions.structureActions);
    context.worldObjectInteractions.register(BuildingInteractions.buildSiteActions);
    context.ui.register({
      id: "building:build-mode",
      title: "Building",
      body: "Campfires can be placed from the starter inventory."
    });
  }
};
