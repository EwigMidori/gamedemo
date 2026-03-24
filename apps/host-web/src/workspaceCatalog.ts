import type { RuntimeProfileDefinition } from "@gamedemo/mod-loader";
import { ModCatalogs } from "@gamedemo/mod-loader";
import { coreBaseMod } from "@gamedemo/mod-core-base";
import { coreBuildingMod } from "@gamedemo/mod-core-building";
import { coreCraftingMod } from "@gamedemo/mod-core-crafting";
import { coreGatheringMod } from "@gamedemo/mod-core-gathering";
import { coreInventoryMod } from "@gamedemo/mod-core-inventory";
import { corePlayerMod } from "@gamedemo/mod-core-player";
import { coreSurvivalMod } from "@gamedemo/mod-core-survival";
import { coreUiHudMod } from "@gamedemo/mod-core-ui-hud";
import { coreWorldgenMod } from "@gamedemo/mod-core-worldgen";
import { vanillaBundleMod } from "@gamedemo/mod-vanilla-bundle";

export const workspaceModCatalog = ModCatalogs.createWorkspace([
  vanillaBundleMod,
  coreBaseMod,
  coreBuildingMod,
  coreCraftingMod,
  coreGatheringMod,
  coreInventoryMod,
  corePlayerMod,
  coreSurvivalMod,
  coreUiHudMod,
  coreWorldgenMod
]);

export const runtimeProfiles: RuntimeProfileDefinition[] = [
  {
    id: "vanilla",
    label: "Vanilla Bundle",
    rootMods: ["bundle:vanilla"],
    description: "Default first-party experience assembled from the vanilla bundle."
  },
  {
    id: "creative-core",
    label: "Creative Core",
    rootMods: ["core:base", "core:worldgen", "core:ui-hud", "core:inventory", "core:player", "core:building", "core:survival", "core:gathering", "core:crafting"],
    description: "A leaner profile focused on movement, world preview, and building."
  }
];
