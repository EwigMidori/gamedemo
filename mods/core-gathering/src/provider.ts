import type { RuntimeWorldObjectProvider } from "@gamedemo/engine-core";
import { GatheringDomain } from "./gatheringDomain";

const resourceObjects: RuntimeWorldObjectProvider = {
  id: "gathering:resource-objects",
  inspect(context) {
    const target = context.focusedResourceId
      ? GatheringDomain.getResourceById(context.session, context.focusedResourceId)
      : context.pointerTile
        ? GatheringDomain.getResourceAtTile(
            context.session,
            context.pointerTile.x,
            context.pointerTile.y
          )
        : null;

    if (!target) return null;

    return {
      id: target.id,
      kind: "resource",
      typeId: target.resourceId,
      label: target.resourceId === "resource:tree" ? "Tree" : "Stone Deposit",
      summary: target.resourceId === "resource:tree"
        ? "A harvestable tree that yields wood."
        : "A harvestable stone deposit.",
      x: target.x,
      y: target.y,
      sourceModId: "core:gathering"
    };
  }
};

export const GatheringProviders = {
  resourceObjects
};
