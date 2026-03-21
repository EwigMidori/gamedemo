import {
  MOD_API_VERSION
} from "@gamedemo/engine-core";
import type { GameModModule } from "@gamedemo/mod-api";
import { SurvivalInventoryProviders } from "./inventoryProvider";
import { SurvivalItemInteractions } from "./itemInteractions";
import { SurvivalInteractions } from "./interactions";
import { SurvivalActions } from "./actions";
import { SurvivalResolvers } from "./resolver";
import { SurvivalSystems } from "./system";

export const coreSurvivalMod: GameModModule = {
  manifest: {
    id: "core:survival",
    version: "0.1.0",
    apiVersion: MOD_API_VERSION,
    dependsOn: [{ id: "core:base" }, { id: "core:inventory" }]
  },
  install(context) {
    context.content.registerItem({
      id: "survival:ration",
      label: "Ration",
      stackSize: 20,
      tags: ["food", "healing"]
    });

    context.session.registerBootstrap((state) => {
      state.timeSeconds = 8;
      state.day = 1;
      state.needs.hunger = 92;
      state.needs.health = 86;
      state.logs.push("Survival session bootstrapped.");
    });

    context.actions.register(SurvivalActions.eatRation);
    context.actions.register(SurvivalActions.restAtCampfire);
    context.commandResolvers.register(SurvivalResolvers.interactions);
    context.inventorySelections.register(SurvivalInventoryProviders.rationDetails);
    context.inventoryInteractions.register(SurvivalItemInteractions.rationUse);
    context.worldObjectInteractions.register(SurvivalInteractions.campfireActions);
    context.systems.register(SurvivalSystems.needsDecay);
    context.ui.register({
      id: "survival:status",
      title: "Survival",
      body: "Hunger decays over time. Craft rations and rest at campfires to recover."
    });
  }
};
