import type { RuntimeCommandResolver } from "@gamedemo/engine-core";
import { CraftingDomain } from "./craftingDomain";

const interaction: RuntimeCommandResolver = {
  id: "crafting:resolver",
  resolve({ session, trigger }) {
    if (trigger === "pointer") {
      return [];
    }

    const craftingCheck = CraftingDomain.canCraftRationAtCampfire(session);

    return [
      {
        id: "crafting:craft-ration",
        label: "Craft ration at nearest campfire",
        enabled: craftingCheck.ok,
        reasonDisabled: craftingCheck.reason,
        binding: "KeyC",
        actionId: "crafting:craft-ration",
        sourceModId: "core:crafting",
        priority: 15,
        payload: craftingCheck.station ? { structureId: craftingCheck.station.id } : undefined
      }
    ];
  }
};

export const CraftingResolvers = {
  interaction
};
