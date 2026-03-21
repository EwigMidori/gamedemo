import type { RuntimeWorldObjectInteractionProvider } from "@gamedemo/engine-core";
import { GatheringDomain } from "./gatheringDomain";

const resourceActions: RuntimeWorldObjectInteractionProvider = {
  id: "gathering:resource-actions",
  collect({ object, session }) {
    if (object.kind !== "resource") return [];

    const target = GatheringDomain.getResourceById(session, object.id);
    if (!target || target.depleted) return [];

    const enabled = GatheringDomain.canGatherTarget(session, target);
    const yieldDescription = GatheringDomain.describeGatherYield(target.resourceId);
    return [{
      id: "gathering:gather-nearest",
      label: `Gather ${target.resourceId} at ${target.x},${target.y}`,
      enabled,
      reasonDisabled: enabled ? undefined : "Move closer to the selected resource.",
      binding: "KeyE",
      actionId: "gathering:gather-nearest",
      sourceModId: "core:gathering",
      priority: 100,
      payload: { resourceNodeId: target.id },
      affordance: "primary",
      targetObjectId: object.id,
      targetObjectKind: object.kind,
      targetObjectTypeId: object.typeId,
      targetObjectLabel: object.label,
      presentation: yieldDescription
    }];
  }
};

export const GatheringInteractions = {
  resourceActions
};
