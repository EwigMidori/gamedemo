import type { RuntimeCommandResolver } from "@gamedemo/engine-core";
import { GatheringDomain } from "./gatheringDomain";

const interaction: RuntimeCommandResolver = {
  id: "gathering:resolver",
  resolve({ session, trigger }) {
    if (trigger === "pointer") {
      return [];
    }

    const target = GatheringDomain.nearestAvailableResource(session);
    const enabled = GatheringDomain.canGatherTarget(session, target);
    if (!target) {
      return [{
        id: "gathering:gather-nearest",
        label: "Gather",
        enabled: false,
        reasonDisabled: "Move next to a resource node.",
        binding: "KeyG",
        actionId: "gathering:gather-nearest",
        sourceModId: "core:gathering",
        priority: 30
      }];
    }

    return [{
      id: "gathering:gather-nearest",
      label: `Gather ${target.resourceId}`,
      enabled,
      reasonDisabled: enabled ? undefined : "Move next to a resource node.",
      binding: "KeyG",
      actionId: "gathering:gather-nearest",
      sourceModId: "core:gathering",
      priority: 30,
      payload: { resourceNodeId: target.id }
    }];
  }
};

export const GatheringResolvers = {
  interaction
};
