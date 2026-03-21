import type { RuntimeWorldObjectInteractionProvider } from "@gamedemo/engine-core";
import { SurvivalDomain } from "./survivalDomain";

const campfireActions: RuntimeWorldObjectInteractionProvider = {
  id: "survival:campfire-actions",
  collect({ object, session }) {
    if (object.kind !== "structure" || object.typeId !== "core:campfire") {
      return [];
    }

    const structure = SurvivalDomain.getStructureById(session, object.id);
    if (!structure) return [];

    const isAdjacent = SurvivalDomain.isAdjacentToPlayer(session, structure.x, structure.y);
    const canRest =
      isAdjacent &&
      session.needs.hunger >= 10 &&
      (session.needs.health < 100 || session.needs.hunger < 95);
    const restDescription = SurvivalDomain.describeCampfireRest(session);

    return [{
      id: "survival:rest-at-campfire",
      label: `Rest at campfire ${structure.x},${structure.y}`,
      enabled: canRest,
      reasonDisabled:
        !isAdjacent
          ? "Move next to the campfire first."
          : session.needs.hunger < 10
            ? "Too hungry to rest safely."
            : "You do not need to rest right now.",
      binding: "KeyF",
      actionId: "survival:rest-at-campfire",
      sourceModId: "core:survival",
      priority: 110,
      payload: { structureId: structure.id },
      affordance: "primary",
      targetObjectId: object.id,
      targetObjectKind: object.kind,
      targetObjectTypeId: object.typeId,
      targetObjectLabel: object.label,
      presentation: restDescription
    }];
  }
};

export const SurvivalInteractions = {
  campfireActions
};
