import {
  MOD_API_VERSION
} from "@gamedemo/engine-core";
import type { GameModModule } from "@gamedemo/mod-api";
import { CraftingActions } from "./actions";
import { CraftingCombinedInteractions } from "./combinedInteractions";
import { CraftingItemInteractions } from "./itemInteractions";
import { CraftingInteractions } from "./interactions";
import { CraftingResolvers } from "./resolver";

export const coreCraftingMod: GameModModule = {
  manifest: {
    id: "core:crafting",
    version: "0.1.0",
    apiVersion: MOD_API_VERSION,
    dependsOn: [{ id: "core:base" }, { id: "core:survival" }, { id: "core:building" }]
  },
  install(context) {
    context.actions.register(CraftingActions.craftRation);
    context.commandResolvers.register(CraftingResolvers.interaction);
    context.inventoryInteractions.register(CraftingItemInteractions.selectedWoodRecipes);
    context.combinedInteractions.register(CraftingCombinedInteractions.selectedWoodAtCampfire);
    context.worldObjectInteractions.register(CraftingInteractions.campfireRecipes);
    context.ui.register({
      id: "crafting:bench",
      title: "Crafting",
      body: "Campfires expose starter crafting recipes such as ration cooking."
    });
  }
};
