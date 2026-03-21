import type { RuntimeCommandResolver } from "@gamedemo/engine-core";
import { SurvivalDomain } from "./survivalDomain";

const interactions: RuntimeCommandResolver = {
  id: "survival:resolver",
  resolve({ session, trigger, selectedSlot }) {
    const rationCount = SurvivalDomain.getItemCount(session.inventory, "survival:ration");
    const selectedEntry = SurvivalDomain.getInventoryEntryAtSlot(session.inventory, selectedSlot);
    const useful = session.needs.hunger < 100 || session.needs.health < 100;
    const activeCampfire = SurvivalDomain.findNearestAdjacentCampfire(session);
    const canRest =
      !!activeCampfire &&
      SurvivalDomain.isAdjacentToPlayer(session, activeCampfire.x, activeCampfire.y) &&
      session.needs.hunger >= 10 &&
      (session.needs.health < 100 || session.needs.hunger < 95);

    if (trigger === "pointer") {
      return [];
    }

    return [
      ...(selectedEntry
        ? []
        : [{
            id: "survival:eat-ration",
            label: "Eat ration",
            enabled: rationCount > 0 && useful,
            reasonDisabled:
              rationCount <= 0
                ? "Craft or find a ration first."
                : "You are already fully fed.",
            binding: "KeyR",
            actionId: "survival:eat-ration",
            sourceModId: "core:survival",
            priority: 15,
            presentation: SurvivalDomain.describeEatRation(session, selectedSlot)
          }]),
      ...(activeCampfire
        ? [{
            id: "survival:rest-at-campfire",
            label: "Rest at campfire",
            enabled: canRest,
            reasonDisabled:
              !SurvivalDomain.isAdjacentToPlayer(session, activeCampfire.x, activeCampfire.y)
                ? "Move next to the campfire first."
                : session.needs.hunger < 10
                  ? "Too hungry to rest safely."
                  : "You do not need to rest right now.",
            binding: "KeyF",
            actionId: "survival:rest-at-campfire",
            sourceModId: "core:survival",
            priority: 25,
            payload: { structureId: activeCampfire.id }
          }]
        : [])
    ];
  }
};

export const SurvivalResolvers = {
  interactions
};
