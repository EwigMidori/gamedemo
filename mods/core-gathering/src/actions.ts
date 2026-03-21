import type { RuntimeAction } from "@gamedemo/engine-core";
import { GatheringDomain } from "./gatheringDomain";

const gatherNearest: RuntimeAction = {
  id: "gathering:gather-nearest",
  label: "Gather nearest",
  execute({ state, command }) {
    const target =
      typeof command?.payload?.resourceNodeId === "string"
        ? GatheringDomain.getResourceById(state, command.payload.resourceNodeId)
        : GatheringDomain.nearestAvailableResource(state);
    if (!target) {
      return {
        ok: false,
        message: "No gatherable resource adjacent to the player."
      };
    }
    if (!GatheringDomain.canGatherTarget(state, target)) {
      return {
        ok: false,
        message: "Target resource is out of reach."
      };
    }

    target.depleted = true;
    if (target.resourceId === "resource:tree") {
      GatheringDomain.addItem(state, "core:wood", 2);
      return { ok: true, message: "Gathered wood from a tree." };
    }

    GatheringDomain.addItem(state, "core:stone", 2);
    return { ok: true, message: "Gathered stone from a deposit." };
  }
};

export const GatheringActions = {
  gatherNearest
};
