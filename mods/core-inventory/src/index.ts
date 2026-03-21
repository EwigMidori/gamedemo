import { MOD_API_VERSION } from "@gamedemo/engine-core";
import type { GameModModule } from "@gamedemo/mod-api";
import { InventoryProviders } from "./provider";

export const coreInventoryMod: GameModModule = {
  manifest: {
    id: "core:inventory",
    version: "0.1.0",
    apiVersion: MOD_API_VERSION,
    dependsOn: [{ id: "core:base" }]
  },
  install(context) {
    context.inventorySelections.register(InventoryProviders.selectedSlotDetails);
    context.ui.register({
      id: "inventory:selection",
      title: "Inventory",
      body: "Selected inventory slots expose item descriptions and contextual item actions."
    });
  }
};
