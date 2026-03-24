import {
  MOD_API_VERSION
} from "@gamedemo/engine-core";
import type { GameModModule } from "@gamedemo/mod-api";
import { BuildingActions } from "./actions";
import { BuildingInteractions } from "./interactions";
import { BuildingProviders } from "./provider";
import { BuildingResolvers } from "./resolver";
import { BuildingSystems } from "./system";
import { BuildingTileProviders } from "./tileProvider";

export const coreBuildingMod: GameModModule = {
  manifest: {
    id: "core:building",
    version: "0.1.0",
    apiVersion: MOD_API_VERSION,
    dependsOn: [{ id: "core:base" }]
  },
  install(context) {
    context.systems.register(BuildingSystems.growthSimulation);
    context.actions.register(BuildingActions.placeSelectedStructure);
    context.actions.register(BuildingActions.dismantleStructure);
    context.actions.register(BuildingActions.harvestStructure);
    context.actions.register(BuildingActions.storeSelectedItem);
    context.actions.register(BuildingActions.takeFromStorage);
    context.actions.register(BuildingActions.breakStructure);
    context.commandResolvers.register(BuildingResolvers.interaction);
    context.worldObjects.register(BuildingProviders.structureObjects);
    context.worldObjects.register(BuildingTileProviders.buildSiteObjects);
    context.worldObjectInteractions.register(BuildingInteractions.structureActions);
    context.worldObjectInteractions.register(BuildingInteractions.buildSiteActions);
    context.ui.register({
      id: "building:build-mode",
      title: "Building",
      body: "Selected placeable items now determine which structure is built."
    });
  }
};
